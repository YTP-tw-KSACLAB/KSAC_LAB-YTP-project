import React, { useMemo } from 'react';
import { useAppContext } from '../context/AppContext';

export default function Profile() {
  const { user, points, spots, socialPosts } = useAppContext();

  const stats = useMemo(() => {
    const totalSpots = spots.length;
    const totalPosts = socialPosts.length;
    const categories = new Set(spots.map((spot) => spot.category).filter(Boolean));

    return [
      { label: 'SnapPoints', value: points },
      { label: 'Spots Loaded', value: totalSpots },
      { label: 'Categories', value: categories.size },
      { label: 'Social Posts', value: totalPosts },
    ];
  }, [points, socialPosts, spots]);

  const highlights = useMemo(() => spots.slice(0, 6), [spots]);

  return (
    <div style={{ display: 'grid', gap: '1rem' }}>
      <section className="post-card" style={{ display: 'grid', gap: '1rem' }}>
        <header style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div className="avatar large alt">{(user || 'GU').slice(0, 2).toUpperCase()}</div>
          <div>
            <h2 style={{ margin: 0 }}>{user || 'Guest'}</h2>
            <p style={{ margin: '0.3rem 0 0', color: 'var(--text-muted)' }}>Dataset-only travel profile</p>
          </div>
        </header>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(120px, 1fr))', gap: '0.8rem' }}>
          {stats.map((stat) => (
            <article key={stat.label} className="glass-card" style={{ padding: '0.9rem' }}>
              <small style={{ color: 'var(--text-muted)' }}>{stat.label}</small>
              <strong style={{ display: 'block', fontSize: '1.2rem', marginTop: '0.25rem' }}>{stat.value}</strong>
            </article>
          ))}
        </div>
      </section>

      <section className="post-card" style={{ display: 'grid', gap: '0.8rem' }}>
        <h3 style={{ margin: 0 }}>Saved Highlights</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '0.8rem' }}>
          {highlights.map((spot, index) => (
            <article key={spot.id || index} className="glass-card" style={{ padding: '0.7rem', display: 'grid', gap: '0.55rem' }}>
              <img src={spot.image_url} alt={spot.name} style={{ width: '100%', height: '120px', borderRadius: '10px', objectFit: 'cover' }} />
              <strong style={{ fontSize: '0.95rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{spot.name}</strong>
              <small style={{ color: 'var(--text-muted)' }}>{spot.category}</small>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
