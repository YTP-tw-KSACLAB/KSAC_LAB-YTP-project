import React, { useMemo } from 'react';
import { useAppContext } from '../context/AppContext';

export default function Notifications() {
  const { spots, socialPosts } = useAppContext();

  const items = useMemo(() => {
    const spotItems = (spots || []).slice(0, 6).map((spot, index) => ({
      id: `spot-${spot.id || index}`,
      title: `${spot.name} is trending`,
      detail: `Category: ${spot.category} · ${spot.location}`,
      time: `${index + 1}h ago`,
      image: spot.image_url,
    }));

    const socialItems = (socialPosts || []).slice(0, 4).map((post) => ({
      id: `social-${post.id}`,
      title: `${post.username} shared an update`,
      detail: post.content,
      time: 'Today',
      image: post.image_url,
    }));

    return [...socialItems, ...spotItems];
  }, [socialPosts, spots]);

  return (
    <section className="post-card" style={{ display: 'grid', gap: '1rem' }}>
      <header>
        <h2 style={{ margin: 0 }}>Notifications</h2>
        <p style={{ margin: '0.3rem 0 0', color: 'var(--text-muted)' }}>Live updates from your dataset-backed travel feed.</p>
      </header>

      <div style={{ display: 'grid', gap: '0.8rem' }}>
        {!items.length && <p style={{ margin: 0, color: 'var(--text-muted)' }}>No notifications yet.</p>}
        {items.map((item) => (
          <article key={item.id} className="glass-card" style={{ padding: '0.8rem', display: 'grid', gridTemplateColumns: '72px 1fr', gap: '0.8rem', alignItems: 'center' }}>
            {item.image ? (
              <img src={item.image} alt={item.title} style={{ width: '72px', height: '72px', borderRadius: '12px', objectFit: 'cover' }} />
            ) : (
              <div style={{ width: '72px', height: '72px', borderRadius: '12px', background: 'rgba(255,255,255,0.08)' }} />
            )}
            <div>
              <strong style={{ display: 'block' }}>{item.title}</strong>
              <p style={{ margin: '0.3rem 0', color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: 1.35 }}>{item.detail}</p>
              <small style={{ color: 'var(--text-muted)' }}>{item.time}</small>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
