import React, { useState, useEffect, useMemo } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';

export default function Layout() {
  const { 
    user, setUser, flashMessage, error, health, overview, loadingInit,
    form, setForm, planning, setPlanning, setPlanResult, parseJsonSafely, setFlashMessage
  } = useAppContext();

  const navigate = useNavigate();
  const location = useLocation();

  const [showAuth, setShowAuth] = useState(false);
  const [isRegistering, setIsRegistering] = useState(true);
  const [authData, setAuthData] = useState({ username: '', email: '' });
  
  const [legalQuery, setLegalQuery] = useState('');
  const [legalResult, setLegalResult] = useState(null);
  const [isLegalLoading, setIsLegalLoading] = useState(false);

  const navItems = [
    { name: 'Home', path: '/home' },
    { name: 'Search', path: '/search' },
    { name: 'Explore', path: '/explore' },
    { name: 'Reels', path: '/reels' },
    { name: 'Messages', path: '/messages' },
    { name: 'Notifications', path: '/notifications' },
    { name: 'Profile', path: '/profile' }
  ];

  const handleAuth = async () => {
    const endpoint = isRegistering ? '/api/register' : '/api/login';
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(authData),
    });
    if (response.ok) {
      setUser(authData.username);
      setShowAuth(false);
      setFlashMessage(`Welcome ${authData.username}`);
    } else {
      setFlashMessage('Auth failed');
    }
  };

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
  );

  const onFormChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const resetPlannerForm = () => {
    setForm({
      style: '文青探索',
      budget: '中等',
      duration: '1 day',
      mustVisit: '台北101',
      weather: '晴天',
    });
    setFlashMessage('Form reset');
  };

  const applyRainMode = async () => {
    setFlashMessage('Rain mode applied. Searching indoor options...');
    setForm(prev => ({ ...prev, weather: 'rain' }));
    setPlanning(true);
    try {
      const response = await fetch('/api/plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, weather: 'rain' }),
      });
      const data = await parseJsonSafely(response);
      setPlanResult(data);
      if (location.pathname !== '/home') navigate('/home');
    } catch (err) {
      setFlashMessage(err.message);
    } finally {
      setPlanning(false);
    }
  };

  const onGeneratePlan = async (event) => {
    event.preventDefault();
    setPlanning(true);
    try {
      const response = await fetch('/api/plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await parseJsonSafely(response);
      setPlanResult(data);
      if (location.pathname !== '/home') navigate('/home');
    } catch (plannerError) {
      setFlashMessage(plannerError.message);
    } finally {
      setPlanning(false);
    }
  };

  const handleLegalCheck = async (e) => {
    e.preventDefault();
    if (!legalQuery.trim()) return;
    setIsLegalLoading(true);
    setLegalResult(null);
    try {
      const response = await fetch(`/api/check-hotel?q=${encodeURIComponent(legalQuery)}`);
      const data = await parseJsonSafely(response);
      setLegalResult(data);
    } catch (err) {
      setLegalResult({ legal: false, message: 'Check failed.', recommendations: [] });
    } finally {
      setIsLegalLoading(false);
    }
  };

  const topMetrics = useMemo(() => {
    if (!overview) return [];
    return [
      { label: '景點資料', value: overview.scenicCount },
      { label: '合法旅館', value: overview.hotelCount },
      { label: '合法民宿', value: overview.hostelCount },
      { label: '公車站牌', value: overview.busStopCount },
    ];
  }, [overview]);

  const sourceLabel = 'gemini';

  return (
    <main className="ig-layout">
      {showAuth && <AuthModal />}
      
      {/* Left Navigation and Planner */}
      <aside className="left-nav" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        <div>
          <h1 className="brand">SnapTravel</h1>
          <nav>
            {navItems.map((item) => {
              const isActive = location.pathname.startsWith(item.path);
              return (
                <button
                  key={item.name}
                  type="button"
                  onClick={() => {
                    if (item.name === 'Profile' && !user) {
                      setShowAuth(true);
                    } else {
                      navigate(item.path);
                    }
                  }}
                  className={`nav-item ${isActive ? 'active' : ''}`}
                >
                  <span className="nav-dot" />
                  {item.name}
                </button>
              );
            })}
            {!user && (
              <button className="nav-item" onClick={() => setShowAuth(true)}>Login/Sign Up</button>
            )}
          </nav>
        </div>

        {/* Planner moved to left nav */}
        <article className="post-card planner-post" style={{ padding: '1rem', background: 'rgba(0,0,0,0.1)' }}>
          <div className="post-header">
            <div className="avatar">AI</div>
            <div>
              <h2 style={{fontSize: '0.9rem'}}>Trip Planner</h2>
            </div>
          </div>
          <form className="planner-grid" style={{ gridTemplateColumns: '1fr', gap: '0.5rem' }} onSubmit={onGeneratePlan}>
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
            <button type="submit" disabled={planning} style={{ width: '100%', marginTop: '0.5rem' }}>
              {planning ? 'Generating...' : 'Generate Plan'}
            </button>
          </form>
          <div className="post-actions" style={{ flexDirection: 'column', gap: '0.4rem', marginTop: '0.8rem' }}>
            <button type="button" className="action-btn" onClick={applyRainMode} style={{ justifyContent: 'center' }}>Rain Mode</button>
            <button type="button" className="action-btn" onClick={resetPlannerForm} style={{ justifyContent: 'center' }}>Clear</button>
          </div>
        </article>
      </aside>

      {/* Main Feed Outlet */}
      <section className="main-feed">
        {flashMessage && <p className="flash-banner">{flashMessage}</p>}
        <Outlet />
      </section>

      {/* Right Rail */}
      <aside className="right-rail">
        <article className="profile-card">
          <div className="avatar large">{user ? user.slice(0, 2).toUpperCase() : 'GS'}</div>
          <div>
            <h3>{user ? user : 'Guest User'}</h3>
            <p>{user ? 'Online' : 'Not logged in'}</p>
          </div>
        </article>

        <section className="legal-check-box">
          <h4>🏨 Legal Stay Check</h4>
          <form onSubmit={handleLegalCheck} className="legal-form">
            <input 
              type="text" 
              placeholder="Hotel name or URL" 
              value={legalQuery} 
              onChange={e => setLegalQuery(e.target.value)} 
            />
            <button type="submit" disabled={isLegalLoading}>Verify</button>
          </form>
          {legalResult && (
            <div className={`legal-result ${legalResult.legal ? 'legal-ok' : 'legal-warn'}`}>
              <p>{legalResult.message}</p>
              {!legalResult.legal && legalResult.recommendations && (
                <div className="legal-recs">
                  <small>Try these verified alternatives:</small>
                  <ul>
                    {legalResult.recommendations.map((rec, i) => <li key={i}>{rec}</li>)}
                  </ul>
                </div>
              )}
            </div>
          )}
        </section>

        <section className="metrics-box">
          <h4>Taipei dataset overview</h4>
          {loadingInit && <p>Loading...</p>}
          {!loadingInit && topMetrics.map((metric) => (
            <p key={metric.label}><span>{metric.label}</span><strong>{metric.value}</strong></p>
          ))}
        </section>
      </aside>

      {/* Mobile nav placeholder */}
      <nav className="mobile-nav">
        {navItems.slice(0, 4).map((item) => (
          <button
            key={`mobile-${item.name}`}
            type="button"
            onClick={() => navigate(item.path)}
            className={`nav-item mobile-item ${location.pathname.startsWith(item.path) ? 'active' : ''}`}
          >
            <span className="nav-dot" />
            {item.name}
          </button>
        ))}
      </nav>
    </main>
  );
}
