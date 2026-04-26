# KSAC_LAB-YTP-project1

Taipei Vibe full-stack prototype with:

- React frontend (Vite) in client
- Node.js API gateway (Express) in server
- Python AI planner backend (Flask) in python_backend

## Architecture

- Frontend calls Node gateway with /api routes.
- Node gateway reads local Taipei datasets and forwards planning requests to Python service.
- Python service calls Gemini with the configured model and key.
- If Gemini is unavailable, Python returns a structured local fallback itinerary.

## Quick start

1. Install Node dependencies at project root:

```bash
npm install
```

2. Install Python dependencies:

```bash
python3 -m pip install -r python_backend/requirements.txt
```

3. Configure environment files:

- Copy server/.env.example to server/.env
- Copy python_backend/.env.example to python_backend/.env
- Put your Gemini key in python_backend/.env as GEMINI_API_KEY
- For a lightweight model, use GEMINI_MODEL=gemini-2.5-flash-lite

4. Run all services:

```bash
npm run dev
```

5. Open:

- Frontend: http://localhost:5173
- Node API: http://localhost:5001/api/health
- Python API: http://127.0.0.1:8000/health

## Root scripts

- npm run dev: run client + node + python together
- npm run dev:client: run React app only
- npm run dev:server: run Node gateway only
- npm run dev:python: run Python AI backend only
- npm run build: build frontend
- npm run start: run Node gateway in production mode

## API endpoints

- GET /api/health
- GET /api/datasets/overview
- GET /api/spots?limit=6
- POST /api/plan

Example POST /api/plan body:

```json
{
	"style": "文青探索",
	"budget": "中等",
	"duration": "1 day",
	"mustVisit": "台北101",
	"weather": "晴天"
}
```
