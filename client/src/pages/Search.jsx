import React, { useState, useMemo } from 'react';
import { useAppContext } from '../context/AppContext';

export default function Search() {
  const { spots, setFlashMessage } = useAppContext();
  const [activeVibe, setActiveVibe] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  const vibes = ['All', '歷史建築', '夜市', '自然景觀', '博物館', '文創園區', '購物'];

  const handleSurpriseMe = () => {
    if (!spots.length) return;
    const randomSpot = spots[Math.floor(Math.random() * spots.length)];
    setFlashMessage(`✨ Surprise! Check out ${randomSpot.name} in ${randomSpot.location}`);
    setSearchQuery(randomSpot.name);
  };

  const filteredSpots = useMemo(() => {
    return spots.filter(spot => {
      const matchesVibe = activeVibe === 'All' || (spot.category && spot.category.includes(activeVibe));
      const matchesQuery = !searchQuery || 
                           spot.name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
                           spot.location?.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesVibe && matchesQuery;
    });
  }, [spots, activeVibe, searchQuery]);

  return (
    <div className="search-container" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      
      {/* Top Section: Creative Search Input & Surprise */}
      <div className="glass-effect" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', padding: '2rem', textAlign: 'center', background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.1), rgba(59, 130, 246, 0.1))' }}>
        <h2 style={{ fontSize: '2rem', margin: 0 }}>Where to next?</h2>
        <div style={{ display: 'flex', gap: '1rem', maxWidth: '600px', margin: '0 auto', width: '100%' }}>
          <input 
            type="text" 
            placeholder="Search by name or district..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ flex: 1, padding: '1rem 1.5rem', borderRadius: '30px', border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(0,0,0,0.5)', color: 'white', fontSize: '1.1rem' }}
          />
          <button 
            onClick={handleSurpriseMe}
            style={{ padding: '0 1.5rem', borderRadius: '30px', background: 'linear-gradient(45deg, #ec4899, #8b5cf6)', border: 'none', color: 'white', fontWeight: 'bold', cursor: 'pointer', transition: 'transform 0.2s' }}
            onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
            onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
          >
            🎲 Surprise Me
          </button>
        </div>

        {/* Vibe Cloud */}
        <div>
          <p style={{ color: '#94a3b8', marginBottom: '1rem' }}>Or explore by vibe:</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.8rem', justifyContent: 'center' }}>
            {vibes.map(vibe => (
              <button
                key={vibe}
                onClick={() => setActiveVibe(vibe)}
                style={{
                  padding: '0.6rem 1.2rem', borderRadius: '20px', border: '1px solid',
                  background: activeVibe === vibe ? 'white' : 'rgba(255,255,255,0.05)',
                  color: activeVibe === vibe ? 'black' : 'white',
                  borderColor: activeVibe === vibe ? 'white' : 'rgba(255,255,255,0.2)',
                  cursor: 'pointer', transition: 'all 0.3s'
                }}
              >
                {vibe === '歷史建築' ? '🏮 ' : vibe === '夜市' ? '🍜 ' : vibe === '自然景觀' ? '🌲 ' : ''}
                {vibe}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Masonry Grid Results */}
      <div style={{ columnCount: 3, columnGap: '1.5rem' }}>
        {filteredSpots.length > 0 ? filteredSpots.map((spot, idx) => (
          <div key={spot.id || idx} className="glass-effect" style={{ breakInside: 'avoid', marginBottom: '1.5rem', padding: 0, overflow: 'hidden' }}>
            <div style={{ height: `${150 + (idx % 3) * 50}px`, background: `var(--tone-${(idx % 4) + 1})`, display: 'flex', alignItems: 'flex-end', padding: '1rem' }}>
              {/* Optional: Add a subtle overlay gradient */}
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.8), transparent)', zIndex: 1 }} />
              <div style={{ position: 'relative', zIndex: 2, color: 'white' }}>
                <span style={{ background: 'rgba(255,255,255,0.2)', padding: '2px 8px', borderRadius: '12px', fontSize: '0.7rem', display: 'inline-block', marginBottom: '0.5rem' }}>{spot.category}</span>
                <h3 style={{ margin: '0 0 0.2rem 0', fontSize: '1.1rem' }}>{spot.name}</h3>
                <p style={{ margin: 0, fontSize: '0.8rem', opacity: 0.8 }}>📍 {spot.location}</p>
              </div>
            </div>
            {spot.description && (
              <div style={{ padding: '1rem' }}>
                <p style={{ fontSize: '0.85rem', color: '#cbd5e1', margin: 0 }}>
                  {spot.description.substring(0, 100)}...
                </p>
              </div>
            )}
          </div>
        )) : (
          <div style={{ columnSpan: 'all', textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>
            <p style={{ fontSize: '2rem', margin: '0 0 1rem' }}>🕵️</p>
            <p>No spots found matching your vibe.</p>
          </div>
        )}
      </div>

    </div>
  );
}
