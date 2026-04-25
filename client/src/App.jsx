import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import './App.css'

function App() {
  const [health, setHealth] = useState(null)
  const [overview, setOverview] = useState(null)
  const [spots, setSpots] = useState([])
  const [loadingInit, setLoadingInit] = useState(true)
  const [error, setError] = useState('')
  const [user, setUser] = useState(null)
  const [showAuth, setShowAuth] = useState(false)
  const [authData, setAuthData] = useState({ username: '', email: '' })
  const [isRegistering, setIsRegistering] = useState(true)

  const [form, setForm] = useState({
    style: '文青探索',
    budget: '中等',
    duration: '1 day',
    mustVisit: '台北101',
    weather: '晴天',
  })

  const [planning, setPlanning] = useState(false)
  const [planResult, setPlanResult] = useState(null)
  const [activeNav, setActiveNav] = useState('Home')
  const [searchKeyword, setSearchKeyword] = useState('')
  const [flashMessage, setFlashMessage] = useState('')
  const [selectedStory, setSelectedStory] = useState('')
  const [followedUsers, setFollowedUsers] = useState({})
  const [likedPosts, setLikedPosts] = useState({})
  const [savedPosts, setSavedPosts] = useState({})
  const [sharedPosts, setSharedPosts] = useState({})

  const plannerRef = useRef(null)
  const searchInputRef = useRef(null)

  const navItems = ['Home', 'Search', 'Explore', 'Reels', 'Messages', 'Notifications', 'Create', 'Profile']

  const handleAuth = async () => {
    const endpoint = isRegistering ? '/api/register' : '/api/login'
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(authData),
    })
    if (response.ok) {
      setUser(authData.username)
      setShowAuth(false)
      setFlashMessage(`Welcome ${authData.username}`)
    } else {
      setError('Auth failed')
    }
  }

  const AuthModal = () => (
    <div className="auth-modal">
      <div className="auth-card">
        <h3>{isRegistering ? 'Sign Up' : 'Log In'}</h3>
        <input placeholder="Username" onChange={(e) => setAuthData({...authData, username: e.target.value})} />
        {isRegistering && <input placeholder="Email" onChange={(e) => setAuthData({...authData, email: e.target.value})} />}
        <button onClick={handleAuth}>{isRegistering ? 'Register' : 'Login'}</button>
        <button onClick={() => setIsRegistering(!isRegistering)}>
          {isRegistering ? 'Switch to Login' : 'Switch to Sign Up'}
        </button>
      </div>
    </div>
  )
// ... rest of the code ...

  const suggestionUsers = [
    { name: 'taipei.vibe', subtitle: 'Travel planner account' },
    { name: 'city.transit.bot', subtitle: 'MRT and bus updates' },
    { name: 'foodie.tpe', subtitle: 'Night market explorer' },
    { name: 'legal.stay.tw', subtitle: 'Accommodation checker' },
    { name: 'huashan.walks', subtitle: 'Urban culture routes' },
  ]

  const parseJsonSafely = async (response) => {
    const raw = await response.text()
    if (!raw) {
      return {}
    }

    try {
      return JSON.parse(raw)
    } catch {
      return { message: raw }
    }
  }

  const loadDashboard = useCallback(async () => {
    setError('')

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
        parseJsonSafely(healthResponse),
        parseJsonSafely(overviewResponse),
        parseJsonSafely(spotsResponse),
      ])

      setHealth(healthJson)
      setOverview(overviewJson)
      setSpots(spotsJson.spots || [])
    } catch (bootError) {
      setError(bootError.message)
    } finally {
      setLoadingInit(false)
    }
  }, [])

  useEffect(() => {
    loadDashboard()
  }, [loadDashboard])

  useEffect(() => {
    if (!flashMessage) {
      return undefined
    }

    const timer = setTimeout(() => {
      setFlashMessage('')
    }, 1800)

    return () => clearTimeout(timer)
  }, [flashMessage])

  useEffect(() => {
    setFollowedUsers((previous) => {
      const next = { ...previous }
      suggestionUsers.forEach((user) => {
        if (typeof next[user.name] !== 'boolean') {
          next[user.name] = false
        }
      })
      return next
    })
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

  const onNavClick = (item) => {
    setActiveNav(item)

    if (item === 'Search') {
      window.setTimeout(() => {
        searchInputRef.current?.focus()
      }, 0)
    }

    if (item === 'Create') {
      plannerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      setFlashMessage('Composer focused')
    }

    if (item === 'Messages') {
      setFlashMessage('Messages synced')
    }

    if (item === 'Notifications') {
      setFlashMessage('No new notifications')
    }

    if (item === 'Profile') {
      setFlashMessage('Profile preview loaded')
    }
  }

  const onStoryClick = (name) => {
    setSelectedStory(name)
    setFlashMessage(`Viewing ${name}`)
  }

  const toggleFollow = (name) => {
    setFollowedUsers((previous) => ({
      ...previous,
      [name]: !previous[name],
    }))
  }

  const togglePostAction = (setter, postId) => {
    setter((previous) => ({
      ...previous,
      [postId]: !previous[postId],
    }))
  }

  const resetPlannerForm = () => {
    setForm({
      style: '文青探索',
      budget: '中等',
      duration: '1 day',
      mustVisit: '台北101',
      weather: '晴天',
    })
    setFlashMessage('Form reset')
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

      const data = await parseJsonSafely(response)
      if (!response.ok) {
        setPlanResult({
          source: 'gateway-fallback',
          plan: data.fallback || null,
          reason: data.error || data.message || 'Planner request failed.',
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
  const stories = spots.slice(0, 8)

  const filteredSpots = useMemo(() => {
    let next = [...spots]
    const query = searchKeyword.trim().toLowerCase()

    if (query) {
      next = next.filter((spot) => {
        const target = `${spot.name || ''} ${spot.category || ''} ${spot.location || ''}`.toLowerCase()
        return target.includes(query)
      })
    }

    if (activeNav === 'Profile') {
      return next.slice(0, 2)
    }

    if (activeNav === 'Reels') {
      return next.reverse()
    }

    return next
  }, [activeNav, searchKeyword, spots])

  const compactDescription = (description) => {
    if (!description) {
      return 'No details available.'
    }

    const compact = description.replace(/\s+/g, ' ').trim()
    return compact.length > 150 ? `${compact.slice(0, 150)}...` : compact
  }

  return (
    <main className="ig-layout">
      {showAuth && <AuthModal />}
      <aside className="left-nav">
        <h1 className="brand">SnapTravel</h1>
        <nav>
          {navItems.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => {
                if (item === 'Profile' && !user) {
                  setShowAuth(true)
                } else {
                  onNavClick(item)
                }
              }}
              className={`nav-item ${activeNav === item ? 'active' : ''}`}
            >
              <span className="nav-dot" />
              {item}
            </button>
          ))}
          {!user && (
            <button className="nav-item" onClick={() => setShowAuth(true)}>Login/Sign Up</button>
          )}
        </nav>
      </aside>

      <section className="main-feed">
        {flashMessage && <p className="flash-banner">{flashMessage}</p>}

        <section className="utility-bar">
          <input
            ref={searchInputRef}
            value={searchKeyword}
            onChange={(event) => setSearchKeyword(event.target.value)}
            className="search-input"
            placeholder="Search spots, categories, areas"
          />
          <button type="button" className="menu-button" onClick={loadDashboard}>Refresh</button>
          <button type="button" className="menu-button" onClick={resetPlannerForm}>Reset Form</button>
        </section>

        <header className="stories-row">
          {stories.map((story, index) => (
            <button
              type="button"
              key={`${story.id}-${index}`}
              className={`story-item button-reset ${selectedStory === story.name ? 'active' : ''}`}
              onClick={() => onStoryClick(story.name || 'Story')}
            >
              <span className="story-ring">
                <span>{story.name?.slice(0, 1) || 'T'}</span>
              </span>
              <p>{story.name || 'Story'}</p>
            </button>
          ))}
        </header>

        <article ref={plannerRef} className="post-card planner-post">
          <div className="post-header">
            <div className="avatar">SV</div>
            <div>
              <h2>taipei.vibe.planner</h2>
              <p>AI itinerary composer</p>
            </div>
          </div>

          <form className="planner-grid" onSubmit={onGeneratePlan}>
            <input name="style" value={form.style} onChange={onFormChange} placeholder="旅遊風格" />
            <input name="mustVisit" value={form.mustVisit} onChange={onFormChange} placeholder="必去景點" />
            <select name="budget" value={form.budget} onChange={onFormChange}>
              <option value="省錢">省錢</option>
              <option value="中等">中等</option>
              <option value="高端">高端</option>
            </select>
            <select name="duration" value={form.duration} onChange={onFormChange}>
              <option value="half day">半日</option>
              <option value="1 day">一日</option>
              <option value="2 days">兩日</option>
            </select>
            <select name="weather" value={form.weather} onChange={onFormChange}>
              <option value="晴天">晴天</option>
              <option value="陰天">陰天</option>
              <option value="雨天">雨天</option>
            </select>
            <button type="submit" disabled={planning}>
              {planning ? 'Generating...' : 'Generate Plan'}
            </button>
          </form>
          <div className="post-actions">
            <button type="button" className="action-btn" onClick={() => setFlashMessage('Draft saved')}>Save Draft</button>
            <button type="button" className="action-btn" onClick={() => setFlashMessage('Rain mode applied')}>Rain Mode</button>
            <button type="button" className="action-btn" onClick={resetPlannerForm}>Clear</button>
          </div>
          {planResult?.reason && <p className="inline-note">Fallback: {planResult.reason}</p>}
        </article>

        {plan && (
          <article className="post-card">
            <div className="post-header">
              <div className="avatar alt">AI</div>
              <div>
                <h2>{plan.title}</h2>
                <p>Source: {sourceLabel}</p>
              </div>
            </div>
            <p className="post-summary">{plan.summary}</p>
            <div className="post-actions">
              <button
                type="button"
                className={`action-btn ${likedPosts.plan ? 'on' : ''}`}
                onClick={() => togglePostAction(setLikedPosts, 'plan')}
              >
                {likedPosts.plan ? 'Liked' : 'Like'}
              </button>
              <button
                type="button"
                className={`action-btn ${savedPosts.plan ? 'on' : ''}`}
                onClick={() => togglePostAction(setSavedPosts, 'plan')}
              >
                {savedPosts.plan ? 'Saved' : 'Save'}
              </button>
              <button
                type="button"
                className={`action-btn ${sharedPosts.plan ? 'on' : ''}`}
                onClick={() => togglePostAction(setSharedPosts, 'plan')}
              >
                {sharedPosts.plan ? 'Shared' : 'Share'}
              </button>
            </div>
            <ul className="timeline-list">
              {(plan.steps || []).map((step, index) => (
                <li key={`${step.time || 'time'}-${index}`}>
                  <strong>{step.time}</strong>
                  <span>{step.activity}</span>
                  <small>{step.transport} · {step.note}</small>
                </li>
              ))}
            </ul>
          </article>
        )}

        {activeNav === 'Messages' && (
          <article className="post-card status-panel">
            <h3>Messages</h3>
            <p>Group planning chat is ready. Invite collaborators from the right rail.</p>
            <button type="button" className="menu-button" onClick={() => onNavClick('Home')}>Back to Home</button>
          </article>
        )}

        {activeNav === 'Notifications' && (
          <article className="post-card status-panel">
            <h3>Notifications</h3>
            <p>No urgent alerts. Weather and legal-stay checks are currently normal.</p>
            <button type="button" className="menu-button" onClick={() => onNavClick('Home')}>Back to Home</button>
          </article>
        )}

        {filteredSpots.map((spot, index) => {
          const postId = `spot-${spot.id || index}`

          return (
          <article key={spot.id || `${spot.name}-${index}`} className="post-card">
            <div className="post-header">
              <div className="avatar">{spot.name?.slice(0, 1) || 'T'}</div>
              <div>
                <h2>{spot.name}</h2>
                <p>{spot.category} · {spot.location}</p>
              </div>
            </div>
            <div className="post-image" data-tone={index % 4} />
            <p className="post-summary">{compactDescription(spot.description)}</p>
            <div className="post-actions">
              <button
                type="button"
                className={`action-btn ${likedPosts[postId] ? 'on' : ''}`}
                onClick={() => togglePostAction(setLikedPosts, postId)}
              >
                {likedPosts[postId] ? 'Liked' : 'Like'}
              </button>
              <button
                type="button"
                className={`action-btn ${savedPosts[postId] ? 'on' : ''}`}
                onClick={() => togglePostAction(setSavedPosts, postId)}
              >
                {savedPosts[postId] ? 'Saved' : 'Save'}
              </button>
              <button
                type="button"
                className={`action-btn ${sharedPosts[postId] ? 'on' : ''}`}
                onClick={() => togglePostAction(setSharedPosts, postId)}
              >
                {sharedPosts[postId] ? 'Shared' : 'Share'}
              </button>
            </div>
          </article>
          )
        })}

        {!filteredSpots.length && (
          <article className="post-card status-panel">
            <h3>No matches found</h3>
            <p>Try another keyword or switch to Home to view all spots.</p>
          </article>
        )}

        {error && <p className="error-banner">{error}</p>}
      </section>

      <aside className="right-rail">
        <article className="profile-card">
          <div className="avatar large">LK</div>
          <div>
            <h3>linche.taiwan</h3>
            <p>Luke Lin</p>
          </div>
        </article>

        <section className="health-box">
          <h4>System status</h4>
          <p>Node: {health?.status || 'loading'}</p>
          <p>Python: {health?.python?.status || 'loading'}</p>
          <p>AI source: {sourceLabel}</p>
        </section>

        <section className="metrics-box">
          <h4>Taipei dataset overview</h4>
          {loadingInit && <p>Loading...</p>}
          {!loadingInit && topMetrics.map((metric) => (
            <p key={metric.label}><span>{metric.label}</span><strong>{metric.value}</strong></p>
          ))}
        </section>

        <section className="suggestions-box">
          <h4>Suggested for you</h4>
          {suggestionUsers.map((user) => (
            <div key={user.name} className="suggestion-item">
              <div className="avatar mini">{user.name.slice(0, 1).toUpperCase()}</div>
              <div>
                <p>{user.name}</p>
                <small>{user.subtitle}</small>
              </div>
              <button type="button" className="suggest-btn" onClick={() => toggleFollow(user.name)}>
                {followedUsers[user.name] ? 'Following' : 'Follow'}
              </button>
            </div>
          ))}
        </section>
      </aside>

      <nav className="mobile-nav">
        {navItems.slice(0, 5).map((item) => (
          <button
            key={`mobile-${item}`}
            type="button"
            onClick={() => onNavClick(item)}
            className={`nav-item mobile-item ${activeNav === item ? 'active' : ''}`}
          >
            <span className="nav-dot" />
            {item}
          </button>
        ))}
      </nav>
    </main>
  )
}

export default App
