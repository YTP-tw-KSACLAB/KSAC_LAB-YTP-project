import csv
import json
import os
import time
from datetime import datetime
from pathlib import Path
from urllib.parse import quote, unquote
import re

import requests
from flask import Flask, jsonify, request
from flask_sqlalchemy import SQLAlchemy
from dotenv import load_dotenv


app = Flask(__name__)
load_dotenv()

PROJECT_ROOT = Path(__file__).resolve().parent.parent
SCENIC_DATASET_PATH = PROJECT_ROOT / "dataset" / "Scenic_Spot_C_f.csv"
TOURIST_IMAGE_ROOT = PROJECT_ROOT / "tourist_attraction_images"
CURATED_SPOTS_PATH = PROJECT_ROOT / "精選景點_one_hot.csv"

app.config["SQLALCHEMY_DATABASE_URI"] = "sqlite:///users.db"
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
db = SQLAlchemy(app)

GEMINI_MODELS_CACHE_TTL_SECONDS = 300
_gemini_models_cache = {"expires_at": 0.0, "models": []}


class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    points = db.Column(db.Integer, default=100)
    posts = db.relationship('Post', backref='author', lazy=True)

class Post(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    content = db.Column(db.Text, nullable=False)
    location = db.Column(db.String(120))
    image_url = db.Column(db.String(200))
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)


def normalize_key(value):
    return re.sub(r"[\W_]+", "", str(value or "").casefold())


def to_name_variants(value):
    base = str(value or "").strip()
    if not base:
        return []

    variants = {base, base.replace("台", "臺"), base.replace("臺", "台"), re.sub(r"[()（）]", "", base)}
    return [item for item in variants if item]


def encode_relative_path(relative_path):
    return "/".join(quote(part) for part in Path(relative_path).parts)


def build_image_index():
    image_index = {}

    if not TOURIST_IMAGE_ROOT.exists():
        return image_index

    for image_path in sorted(TOURIST_IMAGE_ROOT.rglob("*")):
        if not image_path.is_file() or image_path.suffix.lower() not in {".jpg", ".jpeg", ".png", ".webp", ".gif"}:
            continue

        relative_path = image_path.relative_to(TOURIST_IMAGE_ROOT)
        folder_names = []
        current_dir = image_path.parent
        while current_dir != TOURIST_IMAGE_ROOT and str(current_dir).startswith(str(TOURIST_IMAGE_ROOT)):
            folder_names.append(current_dir.name)
            current_dir = current_dir.parent

        file_key = normalize_key(image_path.stem)

        if file_key and file_key not in image_index:
            image_index[file_key] = relative_path.as_posix()

        for folder_name in folder_names:
            folder_key = normalize_key(folder_name)
            if folder_key and folder_key not in image_index:
                image_index[folder_key] = relative_path.as_posix()

    return image_index


def resolve_spot_image_url(row, image_index):
    title = (row.get("Name") or "").strip()
    for variant in to_name_variants(title):
        resolved_path = image_index.get(normalize_key(variant))
        if resolved_path:
            return f"/tourist_attraction_images/{encode_relative_path(resolved_path)}"

    return ""


def load_curated_spot_names():
    if not CURATED_SPOTS_PATH.exists():
        return set()

    with CURATED_SPOTS_PATH.open("r", encoding="utf-8-sig", newline="") as csv_file:
        reader = csv.DictReader(csv_file)
        return {
            normalize_key(variant)
            for row in reader
            if (row.get("景點名稱") or "").strip()
            for variant in to_name_variants((row.get("景點名稱") or "").strip())
        }


def local_image_url_exists(image_url):
    if not image_url:
        return False
    if image_url.startswith("http://") or image_url.startswith("https://"):
        return True
    prefix = "/tourist_attraction_images/"
    if not image_url.startswith(prefix):
        return False

    relative = unquote(image_url[len(prefix):])
    return (TOURIST_IMAGE_ROOT / relative).exists()


def build_dataset_posts(limit=4):
    image_index = build_image_index()
    curated_names = load_curated_spot_names()
    posts = []

    if not SCENIC_DATASET_PATH.exists():
        return posts

    with SCENIC_DATASET_PATH.open("r", encoding="utf-8-sig", newline="") as csv_file:
        reader = csv.DictReader(csv_file)

        for row in reader:
            if (row.get("Region") or "").strip() != "臺北市":
                continue

            if curated_names and normalize_key((row.get("Name") or "").strip()) not in curated_names:
                continue

            image_url = resolve_spot_image_url(row, image_index)
            name = (row.get("Name") or "").strip()
            description = (row.get("Description") or row.get("Toldescribe") or name).strip()

            if not name or not image_url:
                continue

            posts.append({
                "content": description,
                "location": name,
                "image_url": image_url,
            })

            if len(posts) >= limit:
                break

    return posts

with app.app_context():
    db.create_all()
    
    if User.query.count() == 0:
        dummy_users = [
            User(username="taipei.vibe", email="vibe@example.com"),
            User(username="city.transit.bot", email="transit@example.com"),
            User(username="foodie.tpe", email="foodie@example.com"),
            User(username="legal.stay.tw", email="legal@example.com"),
            User(username="luke", email="luke@example.com"),
        ]
        db.session.add_all(dummy_users)
        db.session.commit()

    seeded_authors = User.query.order_by(User.id).all()

    dataset_posts = build_dataset_posts()

    if Post.query.count() == 0 and dataset_posts:
        seeded_posts = []
        for index, post_data in enumerate(dataset_posts):
            seeded_posts.append(Post(
                content=post_data["content"],
                location=post_data["location"],
                user_id=seeded_authors[index % len(seeded_authors)].id,
                image_url=post_data["image_url"],
            ))
        db.session.add_all(seeded_posts)
        db.session.commit()
    else:
        existing_posts = Post.query.order_by(Post.id).all()
        if dataset_posts:
            changed = False
            for post, replacement in zip(existing_posts, dataset_posts):
                if not post.image_url or "unsplash.com" in post.image_url or post.image_url.strip() == "":
                    post.content = replacement["content"]
                    post.location = replacement["location"]
                    post.image_url = replacement["image_url"]
                    changed = True

            if changed:
                db.session.commit()


def build_fallback_itinerary(payload):
    style = payload.get("style", "slow travel")
    duration = payload.get("duration", "full day")
    budget = payload.get("budget", "mid")
    must_visit = payload.get("mustVisit", "Taipei 101")

    # Known Taipei coordinates for common fallback locations
    COORDS = {
        "dadaocheng":  (25.0556,  121.5095),
        "taipei101":   (25.0336,  121.5648),
        "yongkang":    (25.0264,  121.5304),
        "huashan":     (25.0441,  121.5294),
        "raohe":       (25.0509,  121.5775),
    }

    # Try to derive a sensible coordinate for the must_visit spot
    must_visit_lat, must_visit_lng = COORDS["taipei101"]  # sensible default
    must_visit_lower = (must_visit or "").lower()
    coord_aliases = {
        "101": COORDS["taipei101"],
        "taipei 101": COORDS["taipei101"],
        "故宮": (25.1024, 121.5485),
        "palace museum": (25.1024, 121.5485),
        "龍山寺": (25.0372, 121.4999),
        "longshan": (25.0372, 121.4999),
        "中正紀念堂": (25.0362, 121.5187),
        "chiang kai": (25.0362, 121.5187),
        "大安": (25.0324, 121.5349),
        "daan": (25.0324, 121.5349),
        "松山文創": (25.0437, 121.5606),
        "songshan": (25.0437, 121.5606),
    }
    for alias, coord in coord_aliases.items():
        if alias.lower() in must_visit_lower:
            must_visit_lat, must_visit_lng = coord
            break

    # Build a geographically sensible loop:
    # Dadaocheng (NW-center) → must-visit → Huashan (center) → Yongkang (S-center) → Raohe (E)
    # Sort by longitude so the route sweeps west→east without criss-crossing.
    candidate_steps = [
        {
            "time": "09:00",
            "activity": "Breakfast in Dadaocheng",
            "transport": "Walk",
            "note": "Local soy milk and rice rolls at an old-street café.",
            "lat": COORDS["dadaocheng"][0],
            "lng": COORDS["dadaocheng"][1],
        },
        {
            "time": "10:30",
            "activity": f"Must-visit stop: {must_visit}",
            "transport": "MRT",
            "note": "Allocate 90 minutes for photos and nearby exploration.",
            "lat": must_visit_lat,
            "lng": must_visit_lng,
        },
        {
            "time": "13:30",
            "activity": "Huashan 1914 Creative Park",
            "transport": "Bus",
            "note": "Grab lunch at one of the park's courtyard cafes.",
            "lat": COORDS["huashan"][0],
            "lng": COORDS["huashan"][1],
        },
        {
            "time": "15:30",
            "activity": "Lunch & stroll at Yongkang Street",
            "transport": "MRT",
            "note": "Famous for Din Tai Fung and bubble tea shops.",
            "lat": COORDS["yongkang"][0],
            "lng": COORDS["yongkang"][1],
        },
        {
            "time": "18:30",
            "activity": "Raohe Street Night Market",
            "transport": "MRT",
            "note": "Finish the day at Raohe – pepper buns are a must.",
            "lat": COORDS["raohe"][0],
            "lng": COORDS["raohe"][1],
        },
    ]
    # Nearest-neighbour sort so the fallback map never criss-crosses
    def _dist(a, b):
        return ((a["lat"] - b["lat"]) ** 2 + (a["lng"] - b["lng"]) ** 2) ** 0.5

    ordered = [candidate_steps.pop(0)]
    while candidate_steps:
        last = ordered[-1]
        nearest_i = min(range(len(candidate_steps)), key=lambda i: _dist(last, candidate_steps[i]))
        ordered.append(candidate_steps.pop(nearest_i))

    return {
        "title": f"Taipei Vibe {duration} plan",
        "summary": f"A {style} route with a {budget} budget focus.",
        "steps": ordered,
        "safety": [
            "Verify legal accommodation before booking.",
            "Check weather and transit delays every 2 hours.",
            "Keep a rain-ready indoor backup stop.",
        ],
    }


def normalize_model_name(model_name):
    if not model_name:
        return ""
    return str(model_name).split("/")[-1].strip()


def list_gemini_models(api_key, force_refresh=False):
    if not api_key:
        return []

    now = time.time()
    if (
        not force_refresh
        and _gemini_models_cache["models"]
        and _gemini_models_cache["expires_at"] > now
    ):
        return _gemini_models_cache["models"]

    endpoint = f"https://generativelanguage.googleapis.com/v1beta/models?key={api_key}"
    response = requests.get(endpoint, timeout=12)
    response.raise_for_status()
    payload = response.json()

    models = [
        normalize_model_name(model.get("name"))
        for model in payload.get("models", [])
        if "generateContent" in model.get("supportedGenerationMethods", [])
    ]
    models = sorted({model for model in models if model})

    _gemini_models_cache["models"] = models
    _gemini_models_cache["expires_at"] = now + GEMINI_MODELS_CACHE_TTL_SECONDS
    return models


def choose_preferred_gemini_model(models):
    if not models:
        return ""

    priority_exact = [
        "gemini-2.5-flash",
        "gemini-2.5-flash-lite",
        "gemini-2.5-flash-preview-04-17",
        "gemini-2.5-flash-preview",
        "gemini-2.0-flash",
        "gemini-2.0-flash-lite",
    ]

    for candidate in priority_exact:
        if candidate in models:
            return candidate

    # Prefer 2.5, then 2.0 — never fall back to deprecated 1.x models
    priority_contains = ["2.5-flash", "2.5-pro", "2.0-flash"]
    for marker in priority_contains:
        for model in models:
            if marker in model:
                return model

    return models[0]


def resolve_gemini_model(api_key, requested_model=""):
    normalized_requested = normalize_model_name(requested_model)
    DEFAULT_MODEL = "gemini-2.5-flash"

    try:
        models = list_gemini_models(api_key)
    except Exception:  # pylint: disable=broad-except
        # Model listing failed (e.g. 403 Forbidden on the models endpoint).
        # Skip discovery and proceed with the requested model or a known-good default.
        fallback = normalized_requested or DEFAULT_MODEL
        return fallback, [fallback]

    if normalized_requested and normalized_requested in models:
        return normalized_requested, models

    preferred = choose_preferred_gemini_model(models)
    if preferred:
        return preferred, models

    return normalized_requested or DEFAULT_MODEL, models


def call_gemini_for_plan(payload):
    api_key = os.getenv("GEMINI_API_KEY", "").strip()

    if not api_key:
        return {
            "source": "fallback",
            "reason": "GEMINI_API_KEY is missing",
            "plan": build_fallback_itinerary(payload),
        }

    requested_model = payload.get("model") or os.getenv("GEMINI_MODEL", "")
    try:
        model, available_models = resolve_gemini_model(api_key, requested_model)
    except Exception as exc:  # pylint: disable=broad-except
        return {
            "source": "fallback",
            "reason": f"Unable to list Gemini models: {exc}",
            "plan": build_fallback_itinerary(payload),
        }

    endpoint = (
        f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"
        f"?key={api_key}"
    )

    weather_note = ""
    if payload.get("weather") == "rain":
        weather_note = " IMPORTANT: The user indicated it is raining. Please prioritize indoor attractions, museums, and cafes, and avoid outdoor hiking or night markets."

    planner_prompt = {
        "role": "user",
        "parts": [
            {
                "text": (
                    "You are an itinerary planner for Taipei. Return strict JSON with keys "
                    "title, summary, steps (array of {time, activity, transport, note, lat, lng}), "
                    "safety (array of strings). Include rough coordinates (lat, lng) for each step if possible. No markdown.\n"
                    f"User preferences: {json.dumps(payload, ensure_ascii=False)}.{weather_note}"
                )
            }
        ],
    }

    try:
        response = requests.post(
            endpoint,
            json={"contents": [planner_prompt]},
            timeout=25,
        )
        response.raise_for_status()
        data = response.json()

        text = ""
        candidates = data.get("candidates", [])
        if candidates:
            parts = candidates[0].get("content", {}).get("parts", [])
            text = "\n".join(part.get("text", "") for part in parts).strip()

        if not text:
            raise ValueError("Gemini returned an empty response")

        clean_text = text
        if clean_text.startswith("```"):
            clean_text = clean_text.strip("`")
            clean_text = clean_text.replace("json", "", 1).strip()

        plan = json.loads(clean_text)
        return {"source": "gemini", "model": model, "available_models": available_models, "plan": plan}
    except Exception as exc:  # pylint: disable=broad-except
        return {
            "source": "fallback",
            "reason": str(exc),
            "plan": build_fallback_itinerary(payload),
        }


@app.get("/health")
def health():
    return jsonify(
        {
            "status": "ok",
            "service": "python-ai-backend",
            "timestamp": datetime.utcnow().isoformat() + "Z",
        }
    )


@app.post("/plan")
def plan():
    payload = request.get_json(silent=True) or {}
    result = call_gemini_for_plan(payload)
    return jsonify(result)


@app.get("/models")
def get_models():
    api_key = os.getenv("GEMINI_API_KEY", "").strip()
    if not api_key:
        return jsonify({"models": ["gemini-2.5-flash"], "preferred": "gemini-2.5-flash"})

    try:
        models = list_gemini_models(api_key, force_refresh=True)
        preferred = choose_preferred_gemini_model(models) or "gemini-2.5-flash"
        if not models:
            models = [preferred]
        return jsonify({"models": models, "preferred": preferred})
    except Exception:
        return jsonify({"models": ["gemini-2.5-flash"], "preferred": "gemini-2.5-flash"})


# ─── Local fallback chatbot ────────────────────────────────────────────────────
# Keyword-driven Taipei travel assistant used when no API key is configured
# or when the Gemini API returns any error. Covers the most common demo queries.

_LOCAL_CHAT_RULES = [
    # Spots / sightseeing
    (["101", "taipei 101", "台北101"], (
        "🏙️ **Taipei 101** is a must! It's open daily from 09:00–22:00. "
        "The observatory on floor 89 gives a stunning 360° view of the city. "
        "The nearby Xinyi shopping district is great for dinner afterwards. "
        "Take the MRT to Taipei 101/World Trade Center station (Red Line)."
    )),
    (["故宮", "palace museum", "national palace"], (
        "🏛️ The **National Palace Museum** holds one of the world's largest collections of Chinese art. "
        "Allow at least 2–3 hours. It opens at 08:30. "
        "Take Bus 255 or 304 from Shilin MRT, or a taxi (~15 min from Shilin)."
    )),
    (["龍山寺", "longshan", "wanhua", "萬華"], (
        "🛕 **Longshan Temple** in Wanhua is one of Taipei's most atmospheric temples — "
        "beautiful at night when incense fills the air. "
        "It's a 3-min walk from Longshan Temple MRT (Blue Line). Free entry."
    )),
    (["大稻埕", "dadaocheng", "dihua", "迪化街"], (
        "🏘️ **Dadaocheng** is perfect for a slow morning stroll. "
        "Dihua Street has traditional dry-goods shops, herbal medicine stalls, and great breakfast spots. "
        "Try the soy milk and egg crepes at the local stalls. Nearest MRT: Beimen (Red Line)."
    )),
    (["陽明山", "yangmingshan", "yangming"], (
        "🌋 **Yangmingshan National Park** is a fantastic half-day escape. "
        "Hot springs, volcanic crater trails, and flower fields. "
        "Take Bus S15 from Jiantan MRT. Bring a light jacket — it's cooler up there."
    )),
    (["士林夜市", "shilin night market", "shilin"], (
        "🌙 **Shilin Night Market** is Taipei's largest and most famous. "
        "Must-tries: oyster vermicelli, fried chicken cutlet, stinky tofu, and bubble tea. "
        "Open from ~17:00. Take MRT to Jiantan station (Red Line)."
    )),
    (["饒河", "raohe"], (
        "🌙 **Raohe Street Night Market** is smaller and more local than Shilin — "
        "great for an authentic experience. The pepper pork bun at the Fuzhou stand is legendary. "
        "MRT: Songshan station (Green Line), open from ~17:30."
    )),
    (["寧夏", "ningxia"], (
        "🌙 **Ningxia Night Market** is a local favourite for Taiwanese comfort food — "
        "braised pork rice, oyster omelette, and taro balls. "
        "Nearest MRT: Zhongshan station. Usually opens around 17:00."
    )),
    (["華山", "huashan"], (
        "🎨 **Huashan 1914 Creative Park** is a converted brewery turned arts hub. "
        "Great for indie markets, art exhibitions, and cafes. "
        "It's free to enter and a 10-min walk from Zhongxiao Xinsheng MRT (Blue Line)."
    )),
    (["松山文創", "songshan cultural"], (
        "🎭 **Songshan Cultural & Creative Park** features design exhibitions, "
        "pop-up markets, and a beautiful courtyard. "
        "Adjacent to the Sun Yat-sen Memorial Hall MRT (Blue Line)."
    )),
    # Food
    (["food", "eat", "restaurant", "餐廳", "吃", "lunch", "dinner", "breakfast", "早餐", "午餐", "晚餐"], (
        "🍜 Taipei is a food lover's paradise! Here are top picks:\n"
        "• **Breakfast** – soy milk + rice rolls in Dadaocheng or a traditional 永和豆漿\n"
        "• **Lunch** – beef noodle soup at Lin Dong Fang (林東芳), or dumplings at Din Tai Fung (鼎泰豐)\n"
        "• **Dinner** – Yongkang Street for fusion, or head to a night market\n"
        "• **Snack** – bubble tea at Chun Shui Tang (春水堂), the original inventor 🧋"
    )),
    (["bubble tea", "boba", "珍珠奶茶", "奶茶"], (
        "🧋 Bubble tea was invented in Taichung but perfected in Taipei! "
        "Top spots: **Chun Shui Tang** (春水堂) for the original, "
        "**Tiger Sugar** for brown-sugar tiger stripes, and "
        "**50嵐** for affordable classics on every corner."
    )),
    (["beef noodle", "牛肉麵"], (
        "🍜 Taipei's **beef noodle soup** (牛肉麵) is a city obsession. "
        "Top picks: **Lin Dong Fang** (林東芳, open from 11:00) near Zhongxiao Fuxing MRT, "
        "or **Yong Kang Beef Noodle** (永康牛肉麵) near Dongmen MRT."
    )),
    (["din tai fung", "鼎泰豐", "dumpling", "小籠包"], (
        "🥟 **Din Tai Fung** (鼎泰豐) is world-famous for xiaolongbao (soup dumplings). "
        "The Xinyi flagship (near Taipei 101) is the most visited, but expect a queue. "
        "Book ahead or arrive right at opening (11:00). Their taro dumplings are also incredible."
    )),
    # Transport
    (["mrt", "metro", "捷運", "subway", "transport", "get around", "how to travel", "bus"], (
        "🚇 Taipei's MRT is clean, punctual, and cheap (~NT$20–65 per trip). "
        "Get an **EasyCard** (悠遊卡) at any station for 20% off fares — also works on buses, YouBike, and convenience stores. "
        "Key lines: Red (Danshui-Xinyi), Blue (Bannan), Green (Songshan-Xindian), Orange (Zhonghe-Xinlu)."
    )),
    (["youbike", "bike", "cycling", "bicycle"], (
        "🚲 **YouBike 2.0** bike-sharing docks are everywhere. "
        "Register with a credit card or EasyCard, first 30 min free, then NT$10 per 30 min. "
        "Great for riverside parks and the Dadaocheng waterfront trail."
    )),
    (["taxi", "uber", "grab"], (
        "🚕 Taxis are metered, safe, and reasonably priced (flag-fall NT$85). "
        "**Uber** operates in Taipei and shows prices upfront. "
        "For airport transfers, **Taoyuan Airport MRT** to Taipei Main Station takes ~35 min (NT$160)."
    )),
    # Accommodation
    (["hotel", "stay", "hostel", "accommodation", "住宿", "飯店", "民宿", "airbnb"], (
        "🏨 For accommodation, always verify the **legal registration number** first — "
        "our platform shows the legal B&B and hotel registry.\n"
        "Top areas to stay:\n"
        "• **Zhongshan / Datong** – boutique hotels, walkable to night markets\n"
        "• **Xinyi** – upscale, near Taipei 101\n"
        "• **Zhongzheng** – central, great MRT access\n"
        "Recommended legal options: Caesar Park, Palais de Chine, or Check Inn Taipei."
    )),
    # Weather / rain
    (["rain", "weather", "umbrella", "雨", "天氣", "wet", "typhoon"], (
        "☔ Taipei can rain year-round — always carry a compact umbrella or poncho. "
        "On rainy days, excellent **indoor options** include:\n"
        "• National Palace Museum (故宮)\n"
        "• Huashan 1914 Creative Park (華山)\n"
        "• Taipei 101 Observatory\n"
        "• Eslite Spectrum Songyan bookstore (松菸誠品)\n"
        "Typhoon season runs June–October; check CWA (中央氣象署) for alerts."
    )),
    # Budget
    (["budget", "cheap", "cost", "price", "money", "nt$", "ntd", "費用", "花費"], (
        "💰 Taipei is very affordable:\n"
        "• MRT ride: NT$20–65\n"
        "• Night market meal: NT$50–150\n"
        "• Restaurant lunch: NT$150–350\n"
        "• Coffee shop: NT$120–180\n"
        "• Museum entry: NT$0–350\n"
        "A comfortable day costs roughly NT$800–1,500 (around US$25–50). "
        "Most convenience stores (7-Eleven, FamilyMart) offer great cheap meals too."
    )),
    # Safety / tips
    (["safe", "safety", "danger", "crime", "安全"], (
        "🛡️ Taipei is one of Asia's safest cities. General tips:\n"
        "• Keep digital copies of your passport\n"
        "• Tap water is safe to drink in most areas\n"
        "• Emergency: dial 110 (police) or 119 (ambulance/fire)\n"
        "• Most locals speak enough English for basic navigation\n"
        "• Beware of scooters when crossing smaller streets!"
    )),
    (["sim", "wifi", "internet", "data", "網路"], (
        "📶 Stay connected in Taipei:\n"
        "• Buy a **prepaid SIM** at the airport (Chunghwa, FarEasTone, Taiwan Mobile) — ~NT$300 for 5 days unlimited\n"
        "• Free WiFi at MRT stations, 7-Eleven, and most cafes\n"
        "• **iTaiwan** free WiFi hotspots are available at government buildings and tourist sites"
    )),
    (["less crowd", "less crowded", "avoid crowd", "quiet", "peaceful", "人少"], (
        "🌿 For a less-crowded Taipei experience:\n"
        "• **Beitou Thermal Valley** (地熱谷) — best on weekday mornings\n"
        "• **Zhishan Cultural & Ecological Garden** — locals' secret green space\n"
        "• **Guandu Nature Park** — birdwatching, almost always peaceful\n"
        "• **Treasure Hill Artist Village** (寶藏巖) — tiny hillside community, rarely touristy\n"
        "• Visit popular spots (101, Palace Museum) right at opening time to beat the crowds."
    )),
    (["itinerary", "plan", "schedule", "route", "day trip", "行程"], (
        "🗺️ Here's a classic 1-day Taipei itinerary:\n"
        "**Morning** – Dadaocheng breakfast → Dihua Street browse\n"
        "**Midday** – Longshan Temple → Ximending street food\n"
        "**Afternoon** – Huashan 1914 Creative Park or National Palace Museum\n"
        "**Evening** – Taipei 101 sunset view → Xinyi dining\n"
        "**Night** – Raohe or Shilin Night Market\n\n"
        "Use the **Planner** tab to build a personalised AI-optimised route! 🚀"
    )),
    (["hello", "hi", "hey", "你好", "start"], (
        "👋 Hi! I'm your Taipei travel assistant. I can help with:\n"
        "• 🏛️ Top spots & attractions\n"
        "• 🍜 Food & restaurants\n"
        "• 🚇 Getting around (MRT, YouBike, taxi)\n"
        "• 🌙 Night markets\n"
        "• 🏨 Accommodation tips\n"
        "• 💰 Budget & costs\n"
        "• ☔ Weather & rainy-day plans\n\n"
        "What would you like to know?"
    )),
]

_LOCAL_CHAT_DEFAULT = (
    "🤖 Great question! Here are some Taipei travel highlights:\n"
    "• **Must-see**: Taipei 101, National Palace Museum, Longshan Temple\n"
    "• **Food**: Din Tai Fung dumplings, beef noodle soup, night market snacks\n"
    "• **Transport**: EasyCard for MRT + bus + YouBike\n"
    "• **Nightlife**: Shilin or Raohe Night Market\n\n"
    "Ask me about any specific topic — spots, food, transport, budget, weather, or itinerary ideas! 🗺️"
)


def local_chat_reply(messages):
    """Keyword-based fallback chatbot. Always returns a friendly Taipei travel answer."""
    last_text = ""
    for msg in reversed(messages):
        if msg.get("sender") == "user" and msg.get("text", "").strip():
            last_text = msg["text"].strip().lower()
            break

    if not last_text:
        return (
            "👋 Hello! I'm your Taipei travel assistant. Ask me about spots, food, "
            "transport, night markets, accommodation, or itinerary planning!"
        )

    for keywords, reply in _LOCAL_CHAT_RULES:
        if any(kw.lower() in last_text for kw in keywords):
            return reply

    return _LOCAL_CHAT_DEFAULT


@app.post("/chat")
def chat():
    payload = request.get_json(silent=True) or {}
    messages = payload.get("messages", [])

    if not messages:
        return jsonify({"reply": (
            "👋 Hello! I'm your Taipei travel assistant. "
            "Ask me about spots, food, transport, or itinerary planning!"
        )})

    api_key = os.getenv("GEMINI_API_KEY", "").strip()

    # ── No API key → use local bot immediately ──────────────────────────────
    if not api_key:
        return jsonify({"reply": local_chat_reply(messages)})

    # ── Try Gemini; fall back to local bot on any failure ───────────────────
    requested_model = payload.get("model") or os.getenv("GEMINI_MODEL", "")
    model, _models = resolve_gemini_model(api_key, requested_model)

    endpoint = (
        f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"
        f"?key={api_key}"
    )

    contents = []
    for msg in messages:
        role = "user" if msg.get("sender") == "user" else "model"
        contents.append({"role": role, "parts": [{"text": msg.get("text", "")}]})

    if contents and contents[0]["role"] == "user":
        contents[0]["parts"][0]["text"] = (
            "You are a helpful travel assistant for Taipei. Keep responses concise, friendly, and helpful.\n"
            + contents[0]["parts"][0]["text"]
        )

    try:
        response = requests.post(
            endpoint,
            json={
                "system_instruction": {
                    "parts": [{"text": "You are a helpful travel assistant for Taipei. Keep responses concise, friendly, and helpful."}]
                },
                "contents": contents,
            },
            timeout=15,
        )

        # Any non-200 → silently fall back to local bot (never show API errors to user)
        if not response.ok:
            return jsonify({"reply": local_chat_reply(messages)})

        data = response.json()
        text = ""
        candidates = data.get("candidates", [])
        if candidates:
            parts = candidates[0].get("content", {}).get("parts", [])
            text = "\n".join(part.get("text", "") for part in parts).strip()

        return jsonify({"reply": text or local_chat_reply(messages)})

    except Exception:
        return jsonify({"reply": local_chat_reply(messages)})


@app.post("/register")
def register():
    data = request.get_json()
    new_user = User(username=data["username"], email=data["email"])
    db.session.add(new_user)
    db.session.commit()
    return jsonify({"message": "User registered successfully"}), 201


@app.post("/login")
def login():
    data = request.get_json()
    user = User.query.filter_by(username=data["username"]).first()
    if user:
        return jsonify({
            "message": "Login successful",
            "points": user.points
        }), 200
    return jsonify({"message": "User not found"}), 404


@app.get("/user/<username>/points")
def get_points(username):
    user = User.query.filter_by(username=username).first()
    if user:
        return jsonify({"points": user.points}), 200
    return jsonify({"message": "User not found"}), 404


@app.post("/user/add_points")
def add_points():
    data = request.get_json()
    user = User.query.filter_by(username=data["username"]).first()
    if user:
        user.points += data.get("amount", 0)
        db.session.commit()
        return jsonify({"points": user.points, "message": f"Added {data.get('amount')} points"}), 200
    return jsonify({"message": "User not found"}), 404


@app.post("/user/spend_points")
def spend_points():
    data = request.get_json()
    user = User.query.filter_by(username=data["username"]).first()
    if user:
        amount = data.get("amount", 0)
        if user.points >= amount:
            user.points -= amount
            db.session.commit()
            return jsonify({"points": user.points, "message": f"Spent {amount} points"}), 200
        return jsonify({"message": "Insufficient points"}), 400
    return jsonify({"message": "User not found"}), 404


@app.get("/posts")
def get_posts():
    posts = Post.query.order_by(Post.created_at.desc()).all()
    result = []
    for post in posts:
        if not local_image_url_exists(post.image_url):
            continue
        result.append({
            "id": post.id,
            "content": post.content,
            "location": post.location,
            "image_url": post.image_url,
            "username": post.author.username,
            "created_at": post.created_at.isoformat() + "Z"
        })
    return jsonify({"posts": result}), 200


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8000, debug=True)