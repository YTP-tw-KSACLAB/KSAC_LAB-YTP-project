import { useEffect, useMemo, useState } from 'react'
import './App.css'

function App() {
  const [health, setHealth] = useState(null)
  const [overview, setOverview] = useState(null)
  const [spots, setSpots] = useState([])
  const [loadingInit, setLoadingInit] = useState(true)
  const [error, setError] = useState('')

  const [form, setForm] = useState({
    style: '文青探索',
    budget: '中等',
    duration: '1 day',
    mustVisit: '台北101',
    weather: '晴天',
  })

  const [planning, setPlanning] = useState(false)
  const [planResult, setPlanResult] = useState(null)

  useEffect(() => {
    const boot = async () => {
      try {
        const [healthResponse, overviewResponse, spotsResponse] = await Promise.all([
          fetch('/api/health'),
          fetch('/api/datasets/overview'),
          fetch('/api/spots?limit=6'),
        ])

        if (!healthResponse.ok || !overviewResponse.ok || !spotsResponse.ok) {
          throw new Error('Unable to initialize from backend services.')
        }

        const [healthJson, overviewJson, spotsJson] = await Promise.all([
          healthResponse.json(),
          overviewResponse.json(),
          spotsResponse.json(),
        ])

        setHealth(healthJson)
        setOverview(overviewJson)
        setSpots(spotsJson.spots || [])
      } catch (bootError) {
        setError(bootError.message)
      } finally {
        setLoadingInit(false)
      }
    }

    boot()
  }, [])

  const topMetrics = useMemo(() => {
    if (!overview) {
      return []
    }

    return [
      { label: '景點資料筆數', value: overview.scenicCount },
      { label: '合法旅館', value: overview.hotelCount },
      { label: '合法民宿', value: overview.hostelCount },
      { label: '公車站牌', value: overview.busStopCount },
      { label: '旅服中心', value: overview.serviceCenterCount },
    ]
  }, [overview])

  const onFormChange = (event) => {
    const { name, value } = event.target
    setForm((previous) => ({ ...previous, [name]: value }))
  }

  const onGeneratePlan = async (event) => {
    event.preventDefault()
    setPlanning(true)
    setError('')

    try {
      const response = await fetch('/api/plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })

      const data = await response.json()
      if (!response.ok) {
        setPlanResult({
          source: 'gateway-fallback',
          plan: data.fallback,
          reason: data.error,
        })
        return
      }

      setPlanResult(data)
    } catch (plannerError) {
      setError(plannerError.message)
    } finally {
      setPlanning(false)
    }
  }

  const plan = planResult?.plan
  const sourceLabel = planResult?.source || 'none'

  return (
    <main className="page-shell">
      <section className="hero-panel">
        <p className="eyebrow">SnapTravel x Taipei Vibe</p>
        <h1>AI 旅遊規劃中樞</h1>
        <p>
          一次整合 React 體驗層、Node API gateway 與 Python AI backend，直接產生可執行的一日旅程。
        </p>
        <div className="health-pill-row">
          <span className="pill">Node: {health?.status || 'loading'}</span>
          <span className="pill">Python: {health?.python?.status || 'loading'}</span>
          <span className="pill">AI Source: {sourceLabel}</span>
        </div>
      </section>

      <section className="metrics-panel">
        {loadingInit && <p>載入資料中...</p>}
        {!loadingInit && topMetrics.map((metric) => (
          <article key={metric.label} className="metric-card">
            <h2>{metric.label}</h2>
            <p>{metric.value}</p>
          </article>
        ))}
      </section>

      <section className="workspace-grid">
        <article className="planner-panel">
          <h2>旅程需求輸入</h2>
          <form className="planner-form" onSubmit={onGeneratePlan}>
            <label>
              旅遊風格
              <input name="style" value={form.style} onChange={onFormChange} />
            </label>
            <label>
              預算
              <select name="budget" value={form.budget} onChange={onFormChange}>
                <option value="省錢">省錢</option>
                <option value="中等">中等</option>
                <option value="高端">高端</option>
              </select>
            </label>
            <label>
              旅程時間
              <select name="duration" value={form.duration} onChange={onFormChange}>
                <option value="half day">半日</option>
                <option value="1 day">一日</option>
                <option value="2 days">兩日</option>
              </select>
            </label>
            <label>
              必去景點
              <input name="mustVisit" value={form.mustVisit} onChange={onFormChange} />
            </label>
            <label>
              天氣條件
              <select name="weather" value={form.weather} onChange={onFormChange}>
                <option value="晴天">晴天</option>
                <option value="雨天">雨天</option>
                <option value="陰天">陰天</option>
              </select>
            </label>

            <button type="submit" disabled={planning}>
              {planning ? '規劃中...' : '產生 AI 行程'}
            </button>
          </form>
          {planResult?.reason && <p className="hint">Fallback reason: {planResult.reason}</p>}
        </article>

        <article className="timeline-panel">
          <h2>行程時間軸</h2>
          {!plan && <p>送出需求後，這裡會顯示完整時間軸。</p>}
          {plan && (
            <>
              <h3>{plan.title}</h3>
              <p>{plan.summary}</p>
              <ul className="timeline">
                {(plan.steps || []).map((step) => (
                  <li key={`${step.time}-${step.activity}`}>
                    <strong>{step.time}</strong>
                    <span>{step.activity}</span>
                    <small>{step.transport} | {step.note}</small>
                  </li>
                ))}
              </ul>
              <div className="safety-box">
                <h4>安全提醒</h4>
                <ul>
                  {(plan.safety || []).map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            </>
          )}
        </article>
      </section>

      <section className="spot-panel">
        <h2>景點樣本資料</h2>
        <div className="spot-grid">
          {spots.map((spot) => (
            <article key={spot.id} className="spot-card">
              <h3>{spot.name}</h3>
              <p className="spot-category">{spot.category} | {spot.location}</p>
              <p>{spot.description}</p>
            </article>
          ))}
        </div>
      </section>

      {error && <p className="error-banner">{error}</p>}
    </main>
  )
}

export default App
