import React, { useState, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import MapComponent from '../MapComponent';

export default function Planner() {
  const { 
    spots, planning, setPlanning, 
    planResult, setPlanResult, parseJsonSafely, setFlashMessage 
  } = useAppContext();

  const [models, setModels] = useState([]);
  const [selectedModel, setSelectedModel] = useState('');
  const [isFetchingModels, setIsFetchingModels] = useState(true);

  // Drag and Drop State
  const [cartSpots, setCartSpots] = useState([]);
  const [draggedSpot, setDraggedSpot] = useState(null);

  useEffect(() => {
    const fetchModels = async () => {
      try {
        const res = await fetch('/api/models');
        const data = await parseJsonSafely(res);
        if (data.models && data.models.length > 0) {
          setModels(data.models);
          setSelectedModel(data.models[0]);
        }
      } catch (err) {
        console.error("Failed to fetch models", err);
      } finally {
        setIsFetchingModels(false);
      }
    };
    fetchModels();
  }, [parseJsonSafely]);

  // Handle Drag Start from left grid
  const handleDragStart = (e, spot) => {
    setDraggedSpot(spot);
    e.dataTransfer.effectAllowed = 'copyMove';
    e.currentTarget.style.opacity = '0.4';
  };

  const handleDragEnd = (e) => {
    e.currentTarget.style.opacity = '1';
    setDraggedSpot(null);
  };

  // Handle Drop in Cart
  const handleDragOver = (e) => {
    e.preventDefault(); // Necessary to allow dropping
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e) => {
    e.preventDefault();
    if (draggedSpot && !cartSpots.find(s => s.id === draggedSpot.id)) {
      setCartSpots(prev => [...prev, draggedSpot]);
      setFlashMessage(`Added ${draggedSpot.name} to cart!`);
    } else if (draggedSpot) {
      setFlashMessage(`${draggedSpot.name} is already in the cart.`);
    }
  };

  const removeFromCart = (spotId) => {
    setCartSpots(prev => prev.filter(s => s.id !== spotId));
  };

  const onOptimizeRoute = async () => {
    if (cartSpots.length === 0) {
      setFlashMessage("Please add some spots to your cart first!");
      return;
    }
    
    setPlanning(true);
    try {
      const mustVisitString = cartSpots.map(s => s.name).join(', ');
      const payload = { 
        style: 'Custom Route',
        budget: 'Flexible',
        duration: cartSpots.length > 3 ? '1 day' : 'half day',
        weather: '晴天',
        mustVisit: mustVisitString, 
        model: selectedModel 
      };

      const response = await fetch('/api/plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await parseJsonSafely(response);
      if (!response.ok) {
        setPlanResult({
          source: 'gateway-fallback',
          plan: data.fallback || null,
          reason: data.error || data.message || 'Planner request failed.',
        });
        setFlashMessage("Failed to get smart route, using fallback.");
      } else {
        setPlanResult(data);
        setFlashMessage("Route optimized successfully!");
      }
    } catch (plannerError) {
      setFlashMessage(plannerError.message);
    } finally {
      setPlanning(false);
    }
  };

  const plan = planResult?.plan;

  // Render a visual list of popular/random spots for the user to pick from
  const popularSpots = spots.slice(0, 12);

  return (
    <div className="planner-interactive-container" style={{ display: 'grid', gridTemplateColumns: '1fr 350px', gap: '2rem', alignItems: 'start', height: 'calc(100vh - 4rem)' }}>
      
      {/* Left Column: Draggable Spots */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', height: '100%', overflowY: 'auto', paddingRight: '1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2>Discover & Drag</h2>
          {isFetchingModels ? (
            <small>Loading models...</small>
          ) : (
            <select 
              value={selectedModel} 
              onChange={e => setSelectedModel(e.target.value)}
              style={{ padding: '0.4rem 1rem', borderRadius: '20px', background: 'rgba(255,255,255,0.1)', color: 'white', border: '1px solid rgba(255,255,255,0.2)' }}
            >
              {models.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          )}
        </div>
        
        <p style={{ color: '#94a3b8', marginTop: '-1rem' }}>Drag cards from here into your Itinerary Cart on the right.</p>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem' }}>
          {popularSpots.map((spot, idx) => (
            <div 
              key={spot.id || idx} 
              draggable 
              onDragStart={(e) => handleDragStart(e, spot)}
              onDragEnd={handleDragEnd}
              className="glass-effect"
              style={{ 
                cursor: 'grab', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', 
                border: '1px solid rgba(255,255,255,0.1)', transition: 'transform 0.2s',
                background: `linear-gradient(135deg, rgba(255,255,255,0.05), rgba(255,255,255,0))` 
              }}
            >
              <div style={{ height: '80px', borderRadius: '8px', background: `var(--tone-${(idx % 4) + 1})`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem' }}>
                {spot.category === '夜市' ? '🍜' : spot.category === '博物館' ? '🏛️' : spot.category === '公園' ? '🌲' : '📸'}
              </div>
              <h4 style={{ margin: 0, fontSize: '1rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{spot.name}</h4>
              <small style={{ color: '#94a3b8' }}>{spot.category}</small>
            </div>
          ))}
        </div>

        {/* Result Area */}
        {plan && (
          <article className="post-card" style={{ borderTop: '3px solid #10b981', marginTop: '2rem' }}>
            <div className="post-header">
              <div className="avatar alt">AI</div>
              <div>
                <h2>{plan.title}</h2>
                <p>Source: {planResult?.source}</p>
              </div>
            </div>
            <p className="post-summary">{plan.summary}</p>
            <ul className="timeline-list">
              {(plan.steps || []).map((step, index) => (
                <li key={`${step.time || 'time'}-${index}`}>
                  <strong>{step.time}</strong>
                  <span>{step.activity}</span>
                  <small>{step.transport} · {step.note}</small>
                </li>
              ))}
            </ul>
            <MapComponent steps={plan.steps || []} />
          </article>
        )}
      </div>

      {/* Right Column: Drop Zone (Cart) */}
      <div 
        className="glass-effect"
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        style={{ 
          position: 'sticky', top: '0', height: '100%', display: 'flex', flexDirection: 'column', gap: '1rem',
          border: '2px dashed rgba(139, 92, 246, 0.5)', background: 'rgba(139, 92, 246, 0.05)'
        }}
      >
        <div style={{ paddingBottom: '1rem', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
          <h3 style={{ margin: '0 0 0.5rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span>🛒</span> Itinerary Cart
          </h3>
          <p style={{ margin: 0, fontSize: '0.85rem', color: '#94a3b8' }}>Drop locations here to build your route.</p>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
          {cartSpots.length === 0 ? (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.3)', fontWeight: 'bold' }}>
              Drag spots here!
            </div>
          ) : (
            cartSpots.map((spot, idx) => (
              <div key={spot.id || idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(0,0,0,0.3)', padding: '0.8rem', borderRadius: '8px' }}>
                <div>
                  <div style={{ fontWeight: 'bold', fontSize: '0.9rem' }}>{spot.name}</div>
                  <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{spot.category}</div>
                </div>
                <button onClick={() => removeFromCart(spot.id)} style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer' }}>✕</button>
              </div>
            ))
          )}
        </div>

        <button 
          onClick={onOptimizeRoute} 
          disabled={planning || cartSpots.length === 0}
          className="action-btn" 
          style={{ background: 'linear-gradient(135deg, #8b5cf6, #3b82f6)', color: 'white', border: 'none', padding: '1rem', fontWeight: 'bold', fontSize: '1.1rem', marginTop: 'auto' }}
        >
          {planning ? '✨ Computing Route...' : '✨ Optimize Smart Route'}
        </button>
      </div>

    </div>
  );
}
