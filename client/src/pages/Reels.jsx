import React, { useMemo, useState } from 'react';
import { useAppContext } from '../context/AppContext';

const boothFilters = [
  { id: 'none', label: 'Original', css: 'none' },
  { id: 'bw', label: 'Mono', css: 'grayscale(1) contrast(1.08)' },
  { id: 'warm', label: 'Warm', css: 'sepia(0.35) saturate(1.12)' },
  { id: 'vivid', label: 'Vivid', css: 'saturate(1.28) contrast(1.06)' },
];

export default function Reels() {
  const { spots, setFlashMessage } = useAppContext();
  const [activeIndex, setActiveIndex] = useState(0);
  const [activeFilter, setActiveFilter] = useState('none');
  const [stripShots, setStripShots] = useState([]);

  const reelsData = useMemo(
    () => spots.filter((spot) => spot?.image_url && spot?.name),
    [spots],
  );

  const current = reelsData[activeIndex] || null;
  const filterCss = boothFilters.find((item) => item.id === activeFilter)?.css || 'none';

  if (!current) {
    return (
      <article className="post-card status-panel">
        <h3>No photo booth spots available</h3>
        <p>Spots must include real dataset images to appear here.</p>
      </article>
    );
  }

  const move = (delta) => {
    const next = (activeIndex + delta + reelsData.length) % reelsData.length;
    setActiveIndex(next);
  };

  const captureShot = () => {
    const shot = {
      key: `${current.id}-${Date.now()}`,
      name: current.name,
      image_url: current.image_url,
      filter: activeFilter,
      takenAt: new Date().toLocaleTimeString(),
    };

    setStripShots((previous) => [shot, ...previous].slice(0, 8));
    setFlashMessage(`Captured ${current.name} to your photo strip.`);
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 360px', gap: '1.5rem', minHeight: 'calc(100vh - 6rem)' }}>
      <section className="post-card" style={{ display: 'grid', gridTemplateRows: 'auto 1fr auto', gap: '1rem' }}>
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 style={{ margin: 0 }}>Photo Booth Reel</h2>
            <p style={{ margin: '0.3rem 0 0', color: 'var(--text-muted)' }}>{current.name} · {current.location}</p>
          </div>
          <strong style={{ color: 'var(--text-muted)' }}>{activeIndex + 1} / {reelsData.length}</strong>
        </header>

        <div style={{ position: 'relative', borderRadius: '16px', overflow: 'hidden', border: '1px solid var(--border)', minHeight: '460px' }}>
          <img
            src={current.image_url}
            alt={current.name}
            loading="lazy"
            style={{ width: '100%', height: '100%', objectFit: 'cover', filter: filterCss, transition: 'filter 0.25s ease' }}
          />
          <div style={{ position: 'absolute', inset: 'auto 0 0 0', padding: '1rem', background: 'linear-gradient(transparent, rgba(0,0,0,0.75))' }}>
            <p style={{ margin: 0, color: 'white', lineHeight: 1.4 }}>
              {(current.description || '').slice(0, 120)}{(current.description || '').length > 120 ? '...' : ''}
            </p>
          </div>
        </div>

        <div style={{ display: 'grid', gap: '0.9rem' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.6rem' }}>
            {boothFilters.map((filter) => (
              <button
                key={filter.id}
                type="button"
                className={`action-btn ${activeFilter === filter.id ? 'on' : ''}`}
                onClick={() => setActiveFilter(filter.id)}
              >
                {filter.label}
              </button>
            ))}
          </div>

          <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
            <button type="button" className="action-btn" onClick={() => move(-1)}>Previous</button>
            <button type="button" className="action-btn" onClick={() => move(1)}>Next</button>
            <button type="button" className="action-btn on" onClick={captureShot}>Capture Shot</button>
          </div>
        </div>
      </section>

      <aside className="post-card" style={{ display: 'grid', gridTemplateRows: 'auto 1fr', gap: '1rem' }}>
        <header>
          <h3 style={{ margin: 0 }}>Photo Strip</h3>
          <p style={{ margin: '0.3rem 0 0', color: 'var(--text-muted)' }}>Latest captured frames</p>
        </header>

        <div style={{ display: 'grid', gap: '0.8rem', alignContent: 'start', overflowY: 'auto' }}>
          {!stripShots.length && (
            <p style={{ color: 'var(--text-muted)', margin: 0 }}>Capture shots to build your reel strip.</p>
          )}

          {stripShots.map((shot) => {
            const shotFilter = boothFilters.find((item) => item.id === shot.filter)?.css || 'none';
            return (
              <div key={shot.key} className="glass-card" style={{ padding: '0.7rem', display: 'grid', gap: '0.5rem' }}>
                <img src={shot.image_url} alt={shot.name} style={{ width: '100%', height: '110px', objectFit: 'cover', borderRadius: '10px', filter: shotFilter }} />
                <div>
                  <strong style={{ display: 'block', fontSize: '0.85rem' }}>{shot.name}</strong>
                  <small style={{ color: 'var(--text-muted)' }}>{shot.filter.toUpperCase()} · {shot.takenAt}</small>
                </div>
              </div>
            );
          })}
        </div>
      </aside>
    </div>
  );
}
