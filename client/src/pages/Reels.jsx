import React, { useState } from 'react';
import { useAppContext } from '../context/AppContext';

export default function Reels() {
  const { spots, setFlashMessage } = useAppContext();
  const [likedPosts, setLikedPosts] = useState({});

  const toggleLike = (id) => {
    setLikedPosts(prev => ({...prev, [id]: !prev[id]}));
  };

  // Filter to have some media-rich spots
  const reelsData = spots.slice(0, 10);

  if (reelsData.length === 0) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', color: '#94a3b8' }}>
        <p>No reels available. Wait for datasets to load.</p>
      </div>
    );
  }

  return (
    <div className="reels-container" style={{ 
      height: 'calc(100vh - 4rem)', 
      overflowY: 'scroll', 
      scrollSnapType: 'y mandatory',
      background: '#000',
      borderRadius: '12px',
      margin: '0 auto',
      maxWidth: '450px',
      position: 'relative'
    }}>
      {reelsData.map((spot, index) => (
        <div key={spot.id || index} style={{ 
          height: '100%', 
          width: '100%', 
          scrollSnapAlign: 'start', 
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          borderBottom: '1px solid rgba(255,255,255,0.1)'
        }}>
          {/* Mock Video Background using tones */}
          <div style={{ 
            position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
            background: `linear-gradient(to bottom, transparent, rgba(0,0,0,0.8)), var(--tone-${(index % 4) + 1})`,
            zIndex: 1
          }} />
          
          <div style={{ position: 'absolute', bottom: '2rem', left: '1rem', right: '4rem', zIndex: 2, color: 'white' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <div className="avatar mini" style={{ margin: 0, border: '2px solid #ec4899' }}>{spot.name?.charAt(0)}</div>
              <span style={{ fontWeight: 'bold' }}>{spot.category}</span>
              <button style={{ background: 'transparent', border: '1px solid white', borderRadius: '4px', padding: '2px 8px', fontSize: '0.7rem', color: 'white' }}>Follow</button>
            </div>
            <h3 style={{ margin: '0 0 0.5rem 0', textShadow: '0 1px 3px rgba(0,0,0,0.5)' }}>{spot.name}</h3>
            <p style={{ fontSize: '0.9rem', margin: 0, opacity: 0.9, textShadow: '0 1px 3px rgba(0,0,0,0.5)' }}>
              {spot.description ? spot.description.substring(0, 80) + '...' : 'Explore this amazing spot in Taipei!'}
            </p>
            <div style={{ marginTop: '0.5rem', display: 'flex', gap: '0.5rem' }}>
              <span style={{ background: 'rgba(255,255,255,0.2)', padding: '2px 8px', borderRadius: '12px', fontSize: '0.8rem' }}>📍 {spot.location}</span>
            </div>
          </div>

          <div style={{ position: 'absolute', bottom: '2rem', right: '1rem', zIndex: 2, display: 'flex', flexDirection: 'column', gap: '1.5rem', alignItems: 'center' }}>
            <button 
              onClick={() => toggleLike(spot.id)}
              style={{ background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}
            >
              <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', color: likedPosts[spot.id] ? '#ef4444' : 'white' }}>
                {likedPosts[spot.id] ? '❤️' : '🤍'}
              </div>
              <span style={{ color: 'white', fontSize: '0.8rem' }}>{Math.floor(Math.random() * 1000) + 100}</span>
            </button>
            <button 
              onClick={() => setFlashMessage("Comment feature coming soon!")}
              style={{ background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}
            >
              <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', color: 'white' }}>
                💬
              </div>
              <span style={{ color: 'white', fontSize: '0.8rem' }}>{Math.floor(Math.random() * 100) + 10}</span>
            </button>
            <button 
              onClick={() => setFlashMessage("Shared to IG stories!")}
              style={{ background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}
            >
              <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', color: 'white' }}>
                ↗️
              </div>
            </button>
            <div className="avatar mini" style={{ border: '2px solid white', marginTop: '1rem' }}>TPE</div>
          </div>
        </div>
      ))}
    </div>
  );
}
