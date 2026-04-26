import React, { useMemo, useState } from 'react';
import { useAppContext } from '../context/AppContext';
import MapComponent from '../MapComponent';

export default function Navigation() {
  const { spots, parseJsonSafely, setFlashMessage } = useAppContext();
  const [aiResponse, setAiResponse] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);

  const routedSpots = useMemo(() => {
    return spots
      .filter((spot) => Number.isFinite(Number(spot?.lat)) && Number.isFinite(Number(spot?.lng)))
      .slice(0, 6)
      .map((spot, index) => ({
        ...spot,
        time: `${10 + index}:00`,
        activity: spot.name,
        transport: index === 0 ? 'Start' : 'MRT/Walk',
      }));
  }, [spots]);

  const askAi = async (prompt) => {
    setIsAiLoading(true);
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: [{ sender: 'user', text: prompt }] }),
      });
      const data = await parseJsonSafely(res);
      setAiResponse(data.reply || 'No response received.');
    } catch (error) {
      setAiResponse('Navigation assistant is currently unavailable.');
    } finally {
      setIsAiLoading(false);
    }
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: '1.5rem', minHeight: 'calc(100vh - 6rem)' }}>
      <section className="post-card" style={{ display: 'grid', gridTemplateRows: 'auto 1fr', gap: '1rem' }}>
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 style={{ margin: 0 }}>Navigation</h2>
            <p style={{ margin: '0.3rem 0 0', color: 'var(--text-muted)' }}>Dataset-backed route with real coordinates only.</p>
          </div>
          <button
            type="button"
            className="action-btn"
            onClick={() => setFlashMessage('Route refreshed from current spot dataset.')}
          >
            Refresh Route
          </button>
        </header>

        <div style={{ minHeight: '460px' }}>
          <MapComponent steps={routedSpots} />
        </div>
      </section>

      <aside style={{ display: 'grid', gap: '1rem', alignContent: 'start' }}>
        <article className="post-card" style={{ display: 'grid', gap: '0.8rem' }}>
          <h3 style={{ margin: 0 }}>Route Stops</h3>
          {!routedSpots.length && (
            <p style={{ margin: 0, color: 'var(--text-muted)' }}>No coordinate-ready spots are available yet.</p>
          )}
          {routedSpots.map((step) => (
            <div key={`${step.id}-${step.time}`} className="glass-card" style={{ padding: '0.8rem' }}>
              <strong style={{ display: 'block' }}>{step.time} · {step.activity}</strong>
              <small style={{ color: 'var(--text-muted)' }}>{step.transport}</small>
            </div>
          ))}
        </article>

        <article className="post-card" style={{ display: 'grid', gap: '0.8rem' }}>
          <h3 style={{ margin: 0 }}>Assistant</h3>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.6rem' }}>
            <button type="button" className="action-btn" onClick={() => askAi('Suggest a less crowded sequence for my current route in Taipei.')}>Less Crowded</button>
            <button type="button" className="action-btn" onClick={() => askAi('Suggest a rain-safe alternative stop near this route.')}>Rain Backup</button>
          </div>
          <div className="glass-card" style={{ padding: '0.9rem', minHeight: '110px' }}>
            {isAiLoading ? 'Thinking...' : aiResponse || 'Ask for route optimizations to see suggestions here.'}
          </div>
        </article>
      </aside>
    </div>
  );
}
