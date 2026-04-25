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


with app.app_context():
    db.create_all()


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
    model = os.getenv("GEMINI_MODEL", "gemini-1.5-flash-8b")

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

    planner_prompt = {
        "role": "user",
        "parts": [
            {
                "text": (
                    "You are an itinerary planner for Taipei. Return strict JSON with keys "
                    "title, summary, steps (array of {time, activity, transport, note}), "
                    "safety (array of strings). No markdown.\n"
                    f"User preferences: {json.dumps(payload, ensure_ascii=False)}"
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