import React, { useState, useEffect, useMemo } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';

export default function Layout() {
  const { 
    user, setUser, flashMessage, error, health, overview, loadingInit, points,
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
    { name: 'Planner', path: '/planner' },
    { name: 'Navigation', path: '/navigation' },
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

  return (
    <main className={`ig-layout ${location.pathname.startsWith('/home') ? 'has-right-rail' : ''}`}>
      {showAuth && <AuthModal />}
      
      {/* Left Navigation */}
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

        {user && (
          <div className="glass-panel" style={{ padding: '1rem', marginTop: 'auto', border: '1px solid var(--primary)', background: 'rgba(99, 102, 241, 0.05)' }}>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '1.2rem' }}>💎</span> SnapPoints
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'white', display: 'flex', alignItems: 'baseline', gap: '0.3rem' }}>
              {points} <small style={{ fontSize: '0.7rem', color: 'var(--primary)' }}>pts</small>
            </div>
          </div>
        )}
      </aside>

      {/* Main Feed Outlet */}
      <section className="main-feed">
        {flashMessage && <p className="flash-banner">{flashMessage}</p>}
        <Outlet />
      </section>

      {/* Right Rail - Only on Home */}
      {location.pathname.startsWith('/home') && (
        <aside className="right-rail">
          <article className="profile-card">
            <div className="avatar large">{user ? user.slice(0, 2).toUpperCase() : 'GS'}</div>
            <div>
              <h3>{user ? user : 'Guest User'}</h3>
              <p>{user ? 'Online' : 'Not logged in'}</p>
            </div>
          </article>

          <section className="metrics-box">
            <h4>✨ AI Suggested Routes</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem', marginTop: '1rem' }}>
              <div style={{ background: 'rgba(255,255,255,0.05)', padding: '0.8rem', borderRadius: '8px' }}>
                <strong style={{ display: 'block', marginBottom: '0.2rem' }}>☕ Dadaocheng Retro Walk</strong>
                <small style={{ color: '#94a3b8' }}>A relaxing half-day route focusing on historic architecture and local cafes.</small>
              </div>
              <div style={{ background: 'rgba(255,255,255,0.05)', padding: '0.8rem', borderRadius: '8px' }}>
                <strong style={{ display: 'block', marginBottom: '0.2rem' }}>🌲 Elephant Mountain Sunset</strong>
                <small style={{ color: '#94a3b8' }}>Late afternoon hike for the best views of Taipei 101, ending with a night market.</small>
              </div>
            </div>
          </section>

          <section className="suggestions-box">
            <h4>🔥 Top Hot Routes from Friends</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem', marginTop: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                <div className="avatar mini" style={{ margin: 0 }}>F</div>
                <div>
                  <strong style={{ display: 'block', fontSize: '0.9rem' }}>foodie.tpe's Midnight Snack</strong>
                  <small style={{ color: '#94a3b8', fontSize: '0.8rem' }}>Saved 2k+ times</small>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                <div className="avatar mini" style={{ margin: 0 }}>T</div>
                <div>
                  <strong style={{ display: 'block', fontSize: '0.9rem' }}>taipei.vibe's Hidden Bars</strong>
                  <small style={{ color: '#94a3b8', fontSize: '0.8rem' }}>Saved 1.5k+ times</small>
                </div>
              </div>
            </div>
          </section>
        </aside>
      )}

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
