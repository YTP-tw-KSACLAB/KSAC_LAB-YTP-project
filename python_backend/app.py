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

    return {
        "title": f"Taipei Vibe {duration} plan",
        "summary": f"A {style} route with a {budget} budget focus.",
        "steps": [
            {
                "time": "09:00",
                "activity": "Breakfast in Dadaocheng",
                "transport": "Walk",
                "note": "Local soy milk and rice rolls.",
            },
            {
                "time": "10:30",
                "activity": f"Must-visit stop: {must_visit}",
                "transport": "MRT",
                "note": "Allocate 90 minutes for photos and nearby exploration.",
            },
            {
                "time": "13:00",
                "activity": "Lunch at Yongkang Street",
                "transport": "MRT",
                "note": "Choose a shop with high recent ratings.",
            },
            {
                "time": "15:30",
                "activity": "Indoor backup option: Huashan 1914 Creative Park",
                "transport": "Bus",
                "note": "Good fallback for rain and flexible duration.",
            },
            {
                "time": "18:30",
                "activity": "Sunset and night market",
                "transport": "MRT",
                "note": "Finish at Raohe or Ningxia based on crowd level.",
            },
        ],
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


@app.post("/chat")
def chat():
    payload = request.get_json(silent=True) or {}
    messages = payload.get("messages", [])
    
    if not messages:
        return jsonify({"reply": "Hello! I am your AI travel agent. How can I help you today?"})

    api_key = os.getenv("GEMINI_API_KEY", "").strip()
    
    if not api_key:
        return jsonify({"reply": "[Fallback Mode] No API key configured. I'm a static bot right now, but feel free to ask about Taipei!"})

    requested_model = payload.get("model") or os.getenv("GEMINI_MODEL", "")
    # resolve_gemini_model never throws — it falls back to gemini-2.5-flash on any listing failure
    model, _models = resolve_gemini_model(api_key, requested_model)

    endpoint = (
        f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"
        f"?key={api_key}"
    )
    
    # Construct history
    contents = []
    for msg in messages:
        role = "user" if msg.get("sender") == "user" else "model"
        contents.append({
            "role": role,
            "parts": [{"text": msg.get("text", "")}]
        })
        
    # Prepend system instruction as the first user message if history is empty, 
    # but Gemini API has a specific format. We'll just inject it.
    if contents and contents[0]["role"] == "user":
        contents[0]["parts"][0]["text"] = "You are a helpful travel assistant for Taipei. Keep responses concise, friendly, and helpful.\n" + contents[0]["parts"][0]["text"]

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

        if response.status_code == 403:
            err_detail = ""
            try:
                err_detail = response.json().get("error", {}).get("message", "")
            except Exception:
                pass
            return jsonify({
                "reply": (
                    "⚠️ The AI service isn't reachable right now — the API key may not have "
                    "Gemini API access enabled. Please check that the Generative Language API "
                    "is enabled in your Google Cloud project and that the key has no "
                    f"HTTP referrer / IP restrictions.{(' (' + err_detail + ')') if err_detail else ''}"
                )
            })

        if response.status_code == 429:
            return jsonify({"reply": "⚠️ The AI is a bit overloaded right now. Please try again in a moment!"})

        if response.status_code == 404:
            return jsonify({"reply": f"⚠️ Model '{model}' was not found. Try refreshing the page to pick an available model."})

        response.raise_for_status()
        data = response.json()

        text = ""
        candidates = data.get("candidates", [])
        if candidates:
            parts = candidates[0].get("content", {}).get("parts", [])
            text = "\n".join(part.get("text", "") for part in parts).strip()

        return jsonify({"reply": text or "I'm not sure how to respond to that — could you rephrase?"})
    except Exception as exc:
        return jsonify({"reply": "⚠️ Couldn't reach the AI service right now. Please try again shortly."})


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