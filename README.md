# Personalized and safety-guranteed Taipei Vibe Assistant
旅遊時文化差異及訂房安全性疑慮甚多，我們用政府公開資料集與個人化助理改善

- Team: 高中組第十六隊  KSAC_實驗室
- Topic: 賽題B 行旅台北 ── 行腳台北 × 行樂台北

## 主要功能：
- 功能 1：我們做了 Agentic Automation 給繁忙上班族⽤，解決需要手動安排行程的問題 
- 功能 2：我們做了 合法旅宿地圖瀏覽 給非本地人⽤解決住宿非合法的疑慮
- 功能 3：我們做了 多語系 AI 介面給非國語人士⽤，解決單一平台只適用於某國語言的問題
- 功能 4：我們做了 動態時間軸生成給不習慣文字閱讀的使用者⽤，解決文字閱讀不易理解旅程規劃
- 功能 5：我們做了 reels式短片給閒暇人士使用，解決不知有哪些景點可以去的問題，並可以直接copy別人的行程安排

Taipei Vibe full-stack prototype with:
- React frontend (Vite) in client
- Node.js API gateway (Express) in server
- Python AI planner backend (Flask) in python_backend
 ### 旅遊規劃UI
 <img width="512" height="300" alt="image" src="https://github.com/user-attachments/assets/1d6320fc-c0a6-4076-9d7f-d41f70680cac" />

 ### 動態旅遊規劃
<img width="512" height="325" alt="image" src="https://github.com/user-attachments/assets/1a17a42b-19e6-4610-be5b-aa513b35dd2d" />

 ### 地圖搜索功能
<img width="512" height="325" alt="image" src="https://github.com/user-attachments/assets/bdf4c849-58b2-4157-af09-16f04475f8dd" />

 ### 熱門景點加入行程規劃
<img width="512" height="325" alt="image" src="https://github.com/user-attachments/assets/5d3ccacc-1464-4d26-977e-31e8177993c2" />

 ### 個人化行程安排
<img width="512" height="325" alt="image" src="https://github.com/user-attachments/assets/93fc3c93-87cd-4c87-9e10-e9a2ab32d33d" />

 ### 觀看他人旅遊post
<img width="512" height="325" alt="image" src="https://github.com/user-attachments/assets/76280610-88b3-4f71-852e-fb9ea07ec8fa" />


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
- For a lightweight model, keep GEMINI_MODEL=gemini-1.5-flash-8b

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
