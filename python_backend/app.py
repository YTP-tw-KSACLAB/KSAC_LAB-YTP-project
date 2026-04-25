import json
import os
from datetime import datetime

import requests
from flask import Flask, jsonify, request
from flask_sqlalchemy import SQLAlchemy
from dotenv import load_dotenv


app = Flask(__name__)
load_dotenv()

app.config["SQLALCHEMY_DATABASE_URI"] = "sqlite:///users.db"
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
db = SQLAlchemy(app)


class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    posts = db.relationship('Post', backref='author', lazy=True)

class Post(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    content = db.Column(db.Text, nullable=False)
    location = db.Column(db.String(120))
    image_url = db.Column(db.String(200))
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

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

        dummy_posts = [
            Post(
                content="Just had the best stinky tofu at Shenkeng! The crust is so crispy.",
                location="Shenkeng Old Street",
                user_id=dummy_users[2].id,
                image_url="https://images.unsplash.com/photo-1544053916-2a7bf8d58c89?auto=format&fit=crop&q=80&w=400&h=300"
            ),
            Post(
                content="Watching the sunset from Elephant Mountain. Unbeatable view of Taipei 101. 🌆",
                location="Elephant Mountain",
                user_id=dummy_users[0].id,
                image_url="https://images.unsplash.com/photo-1470004914212-05527e49370b?auto=format&fit=crop&q=80&w=400&h=300"
            ),
            Post(
                content="MRT Tamsui-Xinyi Line is running with slight delays today due to a signal issue.",
                location="Taipei MRT",
                user_id=dummy_users[1].id,
                image_url=""
            ),
            Post(
                content="Remember to always verify the registration number of your B&B before booking!",
                location="Taipei",
                user_id=dummy_users[3].id,
                image_url="https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&q=80&w=400&h=300"
            ),
        ]
        db.session.add_all(dummy_posts)
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


def call_gemini_for_plan(payload):
    api_key = os.getenv("GEMINI_API_KEY", "").strip()
    model = payload.get("model") or os.getenv("GEMINI_MODEL", "gemini-1.5-flash")

    if not api_key:
        return {
            "source": "fallback",
            "reason": "GEMINI_API_KEY is missing",
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
        return {"source": "gemini", "model": model, "plan": plan}
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
        return jsonify({"models": ["gemini-1.5-flash", "gemini-1.5-pro"]})

    endpoint = f"https://generativelanguage.googleapis.com/v1beta/models?key={api_key}"
    try:
        response = requests.get(endpoint, timeout=10)
        response.raise_for_status()
        data = response.json()
        
        # Filter to only generation models
        models = [
            m["name"].split("/")[-1] for m in data.get("models", [])
            if "generateContent" in m.get("supportedGenerationMethods", [])
        ]
        if not models:
            models = ["gemini-1.5-flash", "gemini-1.5-pro"]
            
        return jsonify({"models": models})
    except Exception:
        return jsonify({"models": ["gemini-1.5-flash", "gemini-1.5-pro"]})


@app.post("/chat")
def chat():
    payload = request.get_json(silent=True) or {}
    messages = payload.get("messages", [])
    
    if not messages:
        return jsonify({"reply": "Hello! I am your AI travel agent. How can I help you today?"})

    api_key = os.getenv("GEMINI_API_KEY", "").strip()
    model = payload.get("model") or os.getenv("GEMINI_MODEL", "gemini-1.5-flash")
    
    if not api_key:
        return jsonify({"reply": "[Fallback Mode] No API key configured. I'm a static bot right now, but feel free to ask about Taipei!"})

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
            json={"contents": contents},
            timeout=15,
        )
        response.raise_for_status()
        data = response.json()

        text = ""
        candidates = data.get("candidates", [])
        if candidates:
            parts = candidates[0].get("content", {}).get("parts", [])
            text = "\n".join(part.get("text", "") for part in parts).strip()
            
        return jsonify({"reply": text})
    except Exception as exc:
        return jsonify({"reply": f"Sorry, I encountered an error: {str(exc)}"})


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
        return jsonify({"message": "Login successful"}), 200
    return jsonify({"message": "User not found"}), 404


@app.get("/posts")
def get_posts():
    posts = Post.query.order_by(Post.created_at.desc()).all()
    result = []
    for post in posts:
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