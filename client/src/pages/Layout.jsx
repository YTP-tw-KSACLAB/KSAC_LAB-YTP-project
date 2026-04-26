import React, { useState, useEffect, useMemo } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { useLang, LangSwitcher } from '../context/LangContext';

export default function Layout() {
  const {
    user, setUser, flashMessage, error, health, overview, loadingInit, points,
    form, setForm, planning, setPlanning, setPlanResult, parseJsonSafely, setFlashMessage
  } = useAppContext();
  const { t } = useLang();

  const navigate = useNavigate();
  const location = useLocation();

  const [showAuth, setShowAuth] = useState(false);
  const [isRegistering, setIsRegistering] = useState(true);
  const [authData, setAuthData] = useState({ username: '', email: '' });
  
  const [legalQuery, setLegalQuery] = useState('');
  const [legalResult, setLegalResult] = useState(null);
  const [isLegalLoading, setIsLegalLoading] = useState(false);

  const navItems = [
    { key: 'home',          icon: '🏠', name: t('home'),          path: '/home' },
    { key: 'planner',       icon: '✈️', name: t('planner'),       path: '/planner' },
    { key: 'navigation',    icon: '🗺️', name: t('navigation'),    path: '/navigation' },
    { key: 'reels',         icon: '🎬', name: t('reels'),         path: '/reels' },
    { key: 'messages',      icon: '💬', name: t('messages'),      path: '/messages' },
    { key: 'notifications', icon: '🔔', name: t('notifications'), path: '/notifications' },
    { key: 'profile',       icon: '👤', name: t('profile'),       path: '/profile' },
  ];

  useEffect(() => {
    if (!flashMessage) return;
    const timer = setTimeout(() => setFlashMessage(''), 4000);
    return () => clearTimeout(timer);
  }, [flashMessage, setFlashMessage]);

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
        <h3>{isRegistering ? t('signUp') : t('logIn')}</h3>
        <input placeholder={t('username')} onChange={(e) => setAuthData({...authData, username: e.target.value})} />
        {isRegistering && <input placeholder={t('email')} onChange={(e) => setAuthData({...authData, email: e.target.value})} />}
        <button onClick={handleAuth}>{isRegistering ? t('register') : t('login')}</button>
        <button onClick={() => setIsRegistering(!isRegistering)}>
          {isRegistering ? t('switchToLogin') : t('switchToSignUp')}
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
      { label: t('scenicData'),   value: overview.scenicCount },
      { label: t('legalHotels'),  value: overview.hotelCount },
      { label: t('legalHostels'), value: overview.hostelCount },
      { label: t('busStops'),     value: overview.busStopCount },
    ];
  }, [overview, t]);

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
                  key={item.key}
                  type="button"
                  onClick={() => {
                    if (item.key === 'profile' && !user) {
                      setShowAuth(true);
                    } else {
                      navigate(item.path);
                    }
                  }}
                  className={`nav-item ${isActive ? 'active' : ''}`}
                >
                  <span style={{ fontSize: '1.2rem', lineHeight: 1 }}>{item.icon}</span>
                  {item.name}
                </button>
              );
            })}
            {!user && (
              <button className="nav-item" onClick={() => setShowAuth(true)}>{t('loginSignUp')}</button>
            )}
          </nav>

          {/* Language switcher */}
          <div style={{ marginTop: '1.5rem' }}>
            <LangSwitcher />
          </div>
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
        {flashMessage && (
          <div className="flash-banner" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
            <span>{flashMessage}</span>
            <button onClick={() => setFlashMessage('')} style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', fontSize: '1rem', opacity: 0.7, padding: '0 0.2rem', lineHeight: 1 }}>✕</button>
          </div>
        )}
        <Outlet />
      </section>

      {/* Right Rail - Only on Home */}
      {location.pathname.startsWith('/home') && (
        <aside className="right-rail">
          <article className="profile-card">
            <div className="avatar large">{user ? user.slice(0, 2).toUpperCase() : 'GS'}</div>
            <div>
              <h3>{user ? user : 'Guest User'}</h3>
              <p>{user ? t('online') : t('notLoggedIn')}</p>
            </div>
          </article>

          <section className="metrics-box">
            <h4>{t('aiSuggestedRoutes')}</h4>
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
            <h4>{t('topHotRoutes')}</h4>
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
            <span style={{ fontSize: '1.4rem', lineHeight: 1 }}>{item.icon}</span>
            {item.name}
          </button>
        ))}
      </nav>
    </main>
  );
}
