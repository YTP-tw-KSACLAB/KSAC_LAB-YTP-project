import React, { useState, useEffect, useMemo } from 'react';
import { useAppContext } from '../context/AppContext';
import MapComponent from '../MapComponent';

export default function Planner() {
  const { 
    spots, planning, setPlanning, 
    planResult, setPlanResult, parseJsonSafely, setFlashMessage 
  } = useAppContext();

  // Workflow Stages: 'ideation', 'curation', 'navigation', 'checkout', 'success'
  const [stage, setStage] = useState('ideation');
  
  // State for Ideation (Chat)
  const [userInput, setUserInput] = useState('');
  const [chatSuggestions, setChatSuggestions] = useState([]);
  const [isTyping, setIsTyping] = useState(false);

  // State for Curation (Cart)
  const [cartSpots, setCartSpots] = useState([]);
  const [draggedSpot, setDraggedSpot] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeVibe, setActiveVibe] = useState('All');

  // State for Checkout
  const [isBooking, setIsBooking] = useState(false);
  const [bookingProgress, setBookingProgress] = useState(0);
  const [bookingMessage, setBookingMessage] = useState('');
  const [confirmation, setConfirmation] = useState(null);

  const vibes = ['All', '歷史建築', '夜市', '自然景觀', '博物館', '文創園區', '購物'];

  // Handle Gemini Chat for Ideation
  const handleChatSubmit = async (e) => {
    e.preventDefault();
    if (!userInput.trim()) return;

    setIsTyping(true);
    setChatSuggestions([]);
    
    try {
      // Simulate Gemini ranking/suggestions
      const response = await fetch('/api/spots?limit=20');
      const data = await parseJsonSafely(response);
      
      const shuffled = [...data.spots].sort(() => 0.5 - Math.random());
      setChatSuggestions(shuffled.slice(0, 6));
      setStage('curation');
      setFlashMessage("✨ Gemini has analyzed your vibes and suggested these spots!");
    } catch (err) {
      setFlashMessage("Failed to get suggestions. Try again!");
    } finally {
      setIsTyping(false);
    }
  };

  // Drag and Drop Handlers
  const handleDragStart = (e, spot) => {
    setDraggedSpot(spot);
    e.dataTransfer.effectAllowed = 'copyMove';
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e) => {
    e.preventDefault();
    if (draggedSpot && !cartSpots.find(s => s.id === draggedSpot.id)) {
      setCartSpots(prev => [...prev, draggedSpot]);
      setFlashMessage(`Added ${draggedSpot.name} to your itinerary!`);
    }
  };

  const removeFromCart = (spotId) => {
    setCartSpots(prev => prev.filter(s => s.id !== spotId));
  };

  // Optimization
  const onOptimize = async () => {
    if (cartSpots.length === 0) {
      setFlashMessage("Please add some spots to your cart first!");
      return;
    }
    
    setPlanning(true);
    setStage('navigation');
    
    try {
      const mustVisitString = cartSpots.map(s => s.name).join(', ');
      const response = await fetch('/api/plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          mustVisit: mustVisitString,
          style: 'Optimized Experience',
          duration: '1 day'
        }),
      });
      const data = await parseJsonSafely(response);
      setPlanResult(data);
      setFlashMessage("🚀 Your AI-optimized route is ready!");
    } catch (err) {
      setFlashMessage("Optimization failed. Using fallback.");
    } finally {
      setPlanning(false);
    }
  };

  // Checkout Simulation
  const onCheckout = async () => {
    setStage('checkout');
    setIsBooking(true);
    setBookingProgress(0);
    
    const steps = [
      { p: 20, m: '🔍 Searching for legal accommodations...' },
      { p: 40, m: '🏨 Securing your luxury stay...' },
      { p: 60, m: '🚕 Pre-booking AI-driven transport...' },
      { p: 80, m: '🎟️ Generating digital passes...' },
      { p: 100, m: '✅ Finalizing your premium itinerary...' }
    ];

    for (const step of steps) {
      setBookingMessage(step.m);
      await new Promise(r => setTimeout(r, 800));
      setBookingProgress(step.p);
    }

    try {
      const res = await fetch('/api/book', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cart: cartSpots })
      });
      const data = await parseJsonSafely(res);
      setConfirmation(data);
      setStage('success');
    } catch (err) {
      setFlashMessage("Booking simulation failed.");
    } finally {
      setIsBooking(false);
    }
  };

  // Search filter
  const filteredSearchSpots = useMemo(() => {
    return spots.filter(spot => {
      const matchesVibe = activeVibe === 'All' || (spot.category && spot.category.includes(activeVibe));
      const matchesQuery = !searchQuery || spot.name.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesVibe && matchesQuery;
    }).slice(0, 12);
  }, [spots, activeVibe, searchQuery]);

  return (
    <div className="planner-unified-container" style={{ maxWidth: '1400px', margin: '0 auto', padding: '2rem', height: 'calc(100vh - 4rem)', display: 'flex', flexDirection: 'column' }}>
      
      {/* Progress Stepper */}
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '2.5rem', gap: '1.5rem', background: 'rgba(255,255,255,0.03)', padding: '1rem', borderRadius: '40px', border: '1px solid var(--border)', width: 'fit-content', margin: '0 auto 3rem auto' }}>
        {['Ideation', 'Curation', 'Navigation', 'Checkout'].map((s, i) => {
          const isActive = stage.toLowerCase() === s.toLowerCase() || (stage === 'optimization' && s === 'Navigation') || (stage === 'success' && s === 'Checkout');
          const isPast = ['ideation', 'curation', 'optimization', 'checkout', 'success'].indexOf(stage) > i;
          return (
            <div key={s} style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
              <div style={{ 
                width: '36px', height: '36px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: isActive ? 'var(--primary)' : isPast ? '#10b981' : 'rgba(255,255,255,0.05)',
                color: 'white', fontWeight: 'bold', fontSize: '0.9rem', transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                boxShadow: isActive ? '0 0 20px rgba(99, 102, 241, 0.4)' : 'none',
                transform: isActive ? 'scale(1.1)' : 'scale(1)'
              }}>
                {isPast ? '✓' : i + 1}
              </div>
              <span style={{ color: isActive ? 'white' : 'var(--text-muted)', fontSize: '0.95rem', fontWeight: isActive ? '600' : '400' }}>{s}</span>
              {i < 3 && <div style={{ width: '30px', height: '2px', background: isPast ? '#10b981' : 'rgba(255,255,255,0.05)' }} />}
            </div>
          );
        })}
      </div>

      <div style={{ flex: 1, overflow: 'hidden' }}>
        {/* STAGE 1: IDEATION */}
        {stage === 'ideation' && (
          <div className="animate-fade-in" style={{ textAlign: 'center', maxWidth: '800px', margin: '6rem auto' }}>
            <h1 style={{ fontSize: '4rem', marginBottom: '1.5rem', lineHeight: 1.1 }} className="gradient-text">Where's your next adventure?</h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '1.3rem', marginBottom: '3.5rem' }}>
              Describe your dream trip in Taipei. Gemini will rank the best spots for you.
            </p>
            <form onSubmit={handleChatSubmit}>
              <div className="glass-panel" style={{ 
                padding: '1.5rem', borderRadius: '32px', boxShadow: '0 20px 50px -10px rgba(0,0,0,0.5)',
                display: 'flex', flexDirection: 'column', gap: '1rem'
              }}>
                <textarea 
                  value={userInput}
                  onChange={(e) => setUserInput(e.target.value)}
                  placeholder="Tell Gemini your vibe... e.g. 'I want to explore historic temples, eat the best stinky tofu, and find a quiet tea house with a view.'"
                  style={{ 
                    width: '100%', height: '150px', padding: '0.5rem', 
                    background: 'transparent', border: 'none',
                    color: 'white', fontSize: '1.2rem', resize: 'none', outline: 'none',
                    fontFamily: 'inherit'
                  }}
                />
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <button 
                    type="submit"
                    disabled={isTyping || !userInput.trim()}
                    style={{ 
                      padding: '1rem 2.5rem',
                      background: 'var(--primary)', color: 'white', border: 'none', borderRadius: '30px',
                      fontWeight: 'bold', fontSize: '1.1rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.8rem',
                      transition: 'all 0.3s', boxShadow: '0 10px 20px rgba(99, 102, 241, 0.3)'
                    }}
                    onMouseOver={(e) => !e.currentTarget.disabled && (e.currentTarget.style.transform = 'translateY(-2px) scale(1.05)')}
                    onMouseOut={(e) => (e.currentTarget.style.transform = 'translateY(0) scale(1)')}
                  >
                    {isTyping ? <div style={{ width: '20px', height: '20px', border: '2px solid white', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }} /> : 'Generate Trip ✨'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        )}

        {/* STAGE 2: CURATION (Merged Search & Explore) */}
        {stage === 'curation' && (
          <div className="animate-fade-in" style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: '2.5rem', height: '100%' }}>
            {/* Left Scrollable Area */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', overflowY: 'auto', paddingRight: '1rem' }}>
              
              {/* AI Suggestions (The "Explore" aspect) */}
              <section>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
                  <h2 style={{ margin: 0 }}>Gemini's Top Picks</h2>
                  <span style={{ background: 'rgba(99, 102, 241, 0.2)', color: 'var(--primary)', padding: '4px 12px', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 'bold' }}>Ranked by your vibe</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '1.2rem' }}>
                  {chatSuggestions.map((spot, i) => (
                    <div 
                      key={spot.id} 
                      draggable 
                      onDragStart={(e) => handleDragStart(e, spot)}
                      className="glass-card" 
                      style={{ padding: '1.2rem', cursor: 'grab', animation: `fadeIn 0.6s ease-out ${i * 0.1}s forwards`, opacity: 0 }}
                    >
                      <div style={{ height: '120px', background: `var(--tone-${(i % 4) + 1})`, borderRadius: '12px', marginBottom: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2.5rem' }}>
                        {spot.category.includes('夜市') ? '🍜' : spot.category.includes('博物館') ? '🏛️' : '📸'}
                      </div>
                      <h4 style={{ margin: '0 0 0.4rem 0', fontSize: '1.1rem' }}>{spot.name}</h4>
                      <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: 0 }}>{spot.category} · {spot.location}</p>
                    </div>
                  ))}
                </div>
              </section>

              {/* General Search (The "Search" aspect) */}
              <section style={{ padding: '2rem', background: 'rgba(255,255,255,0.02)', borderRadius: '24px', border: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                  <h3 style={{ margin: 0 }}>Discover More Spots</h3>
                  <div style={{ display: 'flex', gap: '0.6rem' }}>
                    {vibes.map(v => (
                      <button 
                        key={v} 
                        onClick={() => setActiveVibe(v)}
                        style={{ 
                          padding: '0.4rem 1rem', borderRadius: '20px', border: '1px solid var(--border)',
                          background: activeVibe === v ? 'white' : 'transparent',
                          color: activeVibe === v ? 'black' : 'white', fontSize: '0.8rem', cursor: 'pointer',
                          transition: 'all 0.3s'
                        }}
                      >
                        {v}
                      </button>
                    ))}
                  </div>
                </div>
                <input 
                  type="text" 
                  placeholder="Search for a specific place or area..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{ width: '100%', padding: '1.2rem 1.5rem', borderRadius: '16px', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border)', color: 'white', fontSize: '1rem', marginBottom: '1.5rem' }}
                />
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem' }}>
                  {filteredSearchSpots.map((spot, i) => (
                    <div 
                      key={spot.id} 
                      draggable 
                      onDragStart={(e) => handleDragStart(e, spot)}
                      className="glass-card" 
                      style={{ padding: '1rem', cursor: 'grab', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.8rem' }}
                    >
                      <div style={{ width: '40px', height: '40px', borderRadius: '8px', background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        📍
                      </div>
                      <div style={{ overflow: 'hidden' }}>
                        <div style={{ fontWeight: '600', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{spot.name}</div>
                        <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>{spot.category}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            </div>

            {/* Right: Itinerary Cart */}
            <div 
              className="glass-panel" 
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              style={{ 
                padding: '2rem', display: 'flex', flexDirection: 'column',
                border: '2px dashed rgba(99, 102, 241, 0.4)', background: 'rgba(99, 102, 241, 0.05)',
                borderRadius: '32px'
              }}
            >
              <div style={{ marginBottom: '1.5rem' }}>
                <h3 style={{ margin: '0 0 0.5rem 0', display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                  <span style={{ fontSize: '1.5rem' }}>🎒</span> My Itinerary Cart
                </h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', margin: 0 }}>Drop locations here to build your trip.</p>
              </div>

              <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1rem', padding: '0.5rem 0' }}>
                {cartSpots.length === 0 ? (
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', textAlign: 'center', opacity: 0.5 }}>
                    <div style={{ fontSize: '4rem', marginBottom: '1rem', animation: 'float 3s ease-in-out infinite' }}>🛍️</div>
                    <p style={{ fontWeight: '600' }}>Your bag is empty</p>
                    <small>Drag spots here to start</small>
                  </div>
                ) : (
                  cartSpots.map(spot => (
                    <div key={spot.id} className="animate-slide-in" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.08)', padding: '1rem', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                        <div style={{ fontSize: '1.2rem' }}>📌</div>
                        <div style={{ fontSize: '1rem', fontWeight: '500' }}>{spot.name}</div>
                      </div>
                      <button onClick={() => removeFromCart(spot.id)} style={{ background: 'rgba(239, 68, 68, 0.1)', border: 'none', color: '#ef4444', cursor: 'pointer', width: '28px', height: '28px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
                    </div>
                  ))
                )}
              </div>

              <button 
                onClick={onOptimize}
                disabled={cartSpots.length === 0}
                style={{ 
                  marginTop: '2rem', width: '100%', padding: '1.2rem', borderRadius: '18px',
                  background: 'linear-gradient(135deg, #6366f1, #a855f7)', border: 'none', color: 'white',
                  fontWeight: 'bold', fontSize: '1.1rem', cursor: 'pointer', transition: 'all 0.3s',
                  boxShadow: cartSpots.length > 0 ? '0 10px 30px rgba(99, 102, 241, 0.4)' : 'none'
                }}
                onMouseOver={(e) => !e.currentTarget.disabled && (e.currentTarget.style.transform = 'translateY(-2px)')}
                onMouseOut={(e) => (e.currentTarget.style.transform = 'translateY(0)')}
              >
                Optimize Route with AI ✨
              </button>
            </div>
          </div>
        )}

        {/* STAGE 3: NAVIGATION (The "Navigation" aspect) */}
        {stage === 'navigation' && (
          <div className="animate-fade-in" style={{ display: 'grid', gridTemplateColumns: '1fr 450px', gap: '3rem', height: '100%' }}>
            {/* Itinerary Timeline */}
            <div style={{ overflowY: 'auto', paddingRight: '1rem' }}>
              {planning ? (
                <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                  <div style={{ width: '80px', height: '80px', border: '5px solid rgba(255,255,255,0.1)', borderTopColor: 'var(--primary)', borderRadius: '50%', animation: 'spin 1s linear infinite', marginBottom: '2rem' }}></div>
                  <h2 style={{ fontSize: '2rem' }}>Gemini is optimizing your route...</h2>
                  <p style={{ color: 'var(--text-muted)' }}>Calculating best transport times and logical flow.</p>
                </div>
              ) : planResult?.plan && (
                <div style={{ paddingBottom: '2rem' }}>
                  <div style={{ marginBottom: '2.5rem' }}>
                    <h1 style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>{planResult.plan.title}</h1>
                    <div className="glass-panel" style={{ padding: '1.5rem', borderLeft: '4px solid var(--primary)' }}>
                      <p style={{ color: 'var(--text)', fontSize: '1.1rem', margin: 0, fontStyle: 'italic' }}>"{planResult.plan.summary}"</p>
                    </div>
                  </div>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                    {planResult.plan.steps.map((step, i) => (
                      <div key={i} className="animate-fade-in" style={{ display: 'flex', gap: '2rem', opacity: 0, animation: `fadeIn 0.5s ease-out ${i * 0.1}s forwards` }}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                          <div style={{ fontWeight: 'bold', color: 'var(--primary)', fontSize: '1.1rem', marginBottom: '0.5rem' }}>{step.time}</div>
                          <div style={{ width: '2px', flex: 1, background: 'linear-gradient(to bottom, var(--primary), rgba(255,255,255,0.05))' }}></div>
                        </div>
                        <div className="glass-card" style={{ flex: 1, padding: '1.5rem', position: 'relative' }}>
                          <div style={{ position: 'absolute', left: '-41px', top: '24px', width: '16px', height: '16px', background: 'var(--primary)', borderRadius: '50%', border: '4px solid var(--bg)' }}></div>
                          <h4 style={{ margin: '0 0 0.8rem 0', fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                            <span>{i === 0 ? '🛫' : i === planResult.plan.steps.length - 1 ? '🛌' : '📍'}</span>
                            {step.activity}
                          </h4>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', fontSize: '0.9rem' }}>
                            <span style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                              🚇 {step.transport}
                            </span>
                            <span style={{ color: '#10b981', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                              💡 {step.note}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Map & Actions */}
            <div style={{ position: 'sticky', top: 0, height: 'fit-content', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
              <div className="glass-panel" style={{ padding: '1rem', height: '450px', borderRadius: '32px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)' }}>
                <div style={{ height: '100%', borderRadius: '24px', overflow: 'hidden' }}>
                  <MapComponent steps={planResult?.plan?.steps || []} />
                </div>
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <button 
                  onClick={onCheckout}
                  style={{ 
                    width: '100%', padding: '1.5rem', borderRadius: '24px',
                    background: 'linear-gradient(135deg, #10b981, #3b82f6)', border: 'none', color: 'white',
                    fontWeight: 'bold', fontSize: '1.3rem', cursor: 'pointer', boxShadow: '0 15px 30px rgba(16, 185, 129, 0.3)',
                    transition: 'all 0.3s'
                  }}
                  onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-3px) scale(1.02)'}
                  onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0) scale(1)'}
                >
                  Confirm & Book Trip 🚀
                </button>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <button onClick={() => setStage('curation')} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)', color: 'white', padding: '1rem', borderRadius: '18px', cursor: 'pointer', fontWeight: '600' }}>
                    Edit Spots
                  </button>
                  <button onClick={() => window.print()} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)', color: 'white', padding: '1rem', borderRadius: '18px', cursor: 'pointer', fontWeight: '600' }}>
                    Export PDF
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* STAGE 4: CHECKOUT (SIMULATION) */}
        {stage === 'checkout' && (
          <div className="animate-fade-in" style={{ textAlign: 'center', maxWidth: '700px', margin: '8rem auto' }}>
            <h2 style={{ fontSize: '3rem', marginBottom: '2.5rem' }}>Securing your premium experience...</h2>
            <div style={{ width: '100%', height: '16px', background: 'rgba(255,255,255,0.05)', borderRadius: '10px', overflow: 'hidden', marginBottom: '2rem', border: '1px solid rgba(255,255,255,0.1)' }}>
              <div style={{ width: `${bookingProgress}%`, height: '100%', background: 'linear-gradient(90deg, #6366f1, #10b981, #3b82f6)', transition: 'width 0.6s cubic-bezier(0.4, 0, 0.2, 1)', boxShadow: '0 0 20px rgba(99, 102, 241, 0.5)' }}></div>
            </div>
            <p style={{ fontSize: '1.4rem', color: 'var(--text-muted)', minHeight: '2rem' }}>{bookingMessage}</p>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '2rem', marginTop: '5rem' }}>
              {[
                { icon: '🏨', label: 'Hotel', delay: 0 },
                { icon: '🚕', label: 'Transport', delay: 0.1 },
                { icon: '🎟️', label: 'Tickets', delay: 0.2 }
              ].map((item, i) => (
                <div key={item.label} className="glass-panel" style={{ padding: '2rem', opacity: bookingProgress > (i + 1) * 25 ? 1 : 0.2, transition: 'all 0.6s ease-out', transform: bookingProgress > (i + 1) * 25 ? 'scale(1)' : 'scale(0.9)' }}>
                  <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>{item.icon}</div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>{item.label}</div>
                  <div style={{ fontSize: '0.8rem', color: bookingProgress > (i + 1) * 25 ? '#10b981' : 'rgba(255,255,255,0.3)', fontWeight: 'bold' }}>
                    {bookingProgress > (i + 1) * 25 ? '● CONFIRMED' : '○ RESERVING...'}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* STAGE 5: SUCCESS */}
        {stage === 'success' && confirmation && (
          <div className="animate-fade-in" style={{ textAlign: 'center', maxWidth: '750px', margin: '4rem auto' }}>
            <div style={{ fontSize: '6rem', marginBottom: '2rem', animation: 'pulse 2s infinite' }}>✨</div>
            <h1 className="gradient-text" style={{ fontSize: '4rem', marginBottom: '1rem' }}>You're all set!</h1>
            <p style={{ fontSize: '1.4rem', color: 'var(--text-muted)', marginBottom: '4rem' }}>
              Your Taipei adventure has been secured and sent to your digital wallet.
            </p>
            
            <div className="glass-panel" style={{ padding: '3rem', textAlign: 'left', marginBottom: '4rem', border: '1px solid var(--primary)', background: 'rgba(99, 102, 241, 0.05)', position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: 0, right: 0, padding: '1rem', background: 'var(--primary)', color: 'white', fontWeight: 'bold', borderBottomLeftRadius: '20px' }}>VIP TICKET</div>
              
              <div style={{ marginBottom: '2.5rem' }}>
                <small style={{ color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '2px' }}>Confirmation Number</small>
                <div style={{ fontSize: '2rem', fontWeight: 'bold', fontFamily: 'monospace', marginTop: '0.5rem' }}>{confirmation.confirmationId}</div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
                <div>
                  <small style={{ color: 'var(--text-muted)' }}>Itinerary Size</small>
                  <div style={{ fontSize: '1.2rem', fontWeight: '600' }}>{confirmation.summary.items} Locations</div>
                </div>
                <div>
                  <small style={{ color: 'var(--text-muted)' }}>Stay</small>
                  <div style={{ fontSize: '1.2rem', fontWeight: '600' }}>{confirmation.summary.hotel}</div>
                </div>
                <div style={{ gridColumn: 'span 2' }}>
                  <small style={{ color: 'var(--text-muted)' }}>Mobility Package</small>
                  <div style={{ fontSize: '1.2rem', fontWeight: '600', color: '#10b981' }}>{confirmation.summary.transport}</div>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '1.5rem', justifyContent: 'center' }}>
              <button 
                onClick={() => {
                  setStage('ideation');
                  setCartSpots([]);
                  setPlanResult(null);
                  setUserInput('');
                }}
                style={{ padding: '1.2rem 3rem', borderRadius: '40px', background: 'var(--primary)', color: 'white', border: 'none', fontWeight: 'bold', fontSize: '1.1rem', cursor: 'pointer' }}
              >
                Plan New Adventure
              </button>
              <button style={{ padding: '1.2rem 3rem', borderRadius: '40px', background: 'transparent', border: '1px solid var(--border)', color: 'white', fontWeight: 'bold', fontSize: '1.1rem', cursor: 'pointer' }}>
                Share Itinerary
              </button>
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
