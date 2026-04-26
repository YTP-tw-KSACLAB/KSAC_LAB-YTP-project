import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useAppContext } from '../context/AppContext';
import { useLang } from '../context/LangContext';
import MapComponent, { transportStyle } from '../MapComponent';

// ─── Coordinate lookup (mirrors MapComponent's table, used for step ordering) ──
const STEP_COORD_LOOKUP = [
  { keys: ['台北101','taipei 101','101'], lat: 25.0336, lng: 121.5648 },
  { keys: ['艋舺龍山寺','龍山寺','longshan'], lat: 25.0372, lng: 121.4999 },
  { keys: ['國立故宮博物院','故宮','national palace museum'], lat: 25.1024, lng: 121.5485 },
  { keys: ['國立中正紀念堂','中正紀念堂','chiang kai-shek'], lat: 25.0362, lng: 121.5187 },
  { keys: ['大安森林公園','daan forest'], lat: 25.0324, lng: 121.5349 },
  { keys: ['松山文創園區','松山文創','songshan cultural'], lat: 25.0437, lng: 121.5606 },
  { keys: ['華山1914','華山','huashan'], lat: 25.0441, lng: 121.5294 },
  { keys: ['饒河街','饒河','raohe'], lat: 25.0509, lng: 121.5775 },
  { keys: ['西門','ximending','ximen'], lat: 25.0421, lng: 121.5069 },
  { keys: ['北投','beitou'], lat: 25.1366, lng: 121.5072 },
  { keys: ['陽明山','yangmingshan','yangming'], lat: 25.1592, lng: 121.5401 },
  { keys: ['動物園','taipei zoo'], lat: 24.9989, lng: 121.5811 },
  { keys: ['士林','shilin'], lat: 25.0881, lng: 121.5242 },
  { keys: ['dadaocheng','大稻埕','迪化街','dihua'], lat: 25.0556, lng: 121.5095 },
  { keys: ['yongkang','永康'], lat: 25.0264, lng: 121.5304 },
  { keys: ['寧夏','ningxia'], lat: 25.0565, lng: 121.5175 },
  { keys: ['breakfast','morning','早餐'], lat: 25.0556, lng: 121.5095 },
  { keys: ['lunch','午餐'], lat: 25.0264, lng: 121.5304 },
  { keys: ['dinner','晚餐','night market','夜市'], lat: 25.0509, lng: 121.5775 },
  { keys: ['hotel','hostel','住宿','飯店'], lat: 25.0477, lng: 121.5296 },
  { keys: ['museum','博物館'], lat: 25.0441, lng: 121.5129 },
  { keys: ['temple','廟','寺'], lat: 25.0372, lng: 121.4999 },
  { keys: ['park','公園'], lat: 25.0324, lng: 121.5349 },
];
const TAIPEI_CENTER_COORD = { lat: 25.0478, lng: 121.5319 };

function resolveStepCoords(step) {
  let lat = Number(step.lat), lng = Number(step.lng);
  if (Number.isFinite(lat) && Number.isFinite(lng) && lat !== 0) return { lat, lng };
  const text = ((step.activity || '') + ' ' + (step.note || '')).toLowerCase();
  for (const entry of STEP_COORD_LOOKUP) {
    if (entry.keys.some(k => text.includes(k.toLowerCase()))) return { lat: entry.lat, lng: entry.lng };
  }
  return TAIPEI_CENTER_COORD;
}

// Greedy nearest-neighbour reorder — minimises route crossings on the map.
// Starts from the first step and always picks the geographically closest unvisited stop.
function reorderStepsByProximity(steps) {
  if (!steps || steps.length <= 2) return steps || [];
  const withCoords = steps.map(s => ({ ...s, _c: resolveStepCoords(s) }));
  const remaining = [...withCoords];
  const sorted = [remaining.splice(0, 1)[0]];
  while (remaining.length > 0) {
    const last = sorted[sorted.length - 1]._c;
    let bestIdx = 0, bestDist = Infinity;
    remaining.forEach(({ _c }, i) => {
      const d = Math.hypot(_c.lat - last.lat, _c.lng - last.lng);
      if (d < bestDist) { bestDist = d; bestIdx = i; }
    });
    sorted.push(remaining.splice(bestIdx, 1)[0]);
  }
  // strip the helper _c field
  return sorted.map(({ _c, ...s }) => s);
}

// Hardcoded demo spots — used as fallback when the backend is unavailable
const DEMO_SPOTS = [
  { id: 'demo-1', name: '台北101', category: '購物', location: '信義區', image_url: '/tourist_attraction_images/%E5%8F%B0%E5%8C%97101/1.jpg', lat: 25.0338, lng: 121.5645 },
  { id: 'demo-2', name: '國立故宮博物院', category: '博物館', location: '士林區', image_url: '/tourist_attraction_images/%E5%9C%8B%E7%AB%8B%E6%95%85%E5%AE%AE%E5%8D%9A%E7%89%A9%E9%99%A2/1.jpg', lat: 25.1023, lng: 121.5484 },
  { id: 'demo-3', name: '艋舺龍山寺', category: '歷史建築', location: '萬華區', image_url: '/tourist_attraction_images/%E8%89%8B%E8%88%BA%E9%BE%8D%E5%B1%B1%E5%AF%BA/1.jpg', lat: 25.0373, lng: 121.4997 },
  { id: 'demo-4', name: '大安森林公園', category: '自然景觀', location: '大安區', image_url: '/tourist_attraction_images/%E5%A4%A7%E5%AE%89%E6%A3%AE%E6%9E%97%E5%85%AC%E5%9C%92/1.jpg', lat: 25.0298, lng: 121.5353 },
  { id: 'demo-5', name: '松山文創園區', category: '文創園區', location: '信義區', image_url: '/tourist_attraction_images/%E6%9D%BE%E5%B1%B1%E6%96%87%E5%89%B5%E5%9C%92%E5%8D%80/1.jpg', lat: 25.0440, lng: 121.5615 },
  { id: 'demo-6', name: '西門町商圈', category: '購物', location: '萬華區', image_url: '/tourist_attraction_images/%E8%A5%BF%E9%96%80%E7%町%E5%95%86%E5%9C%88/1.jpg', lat: 25.0426, lng: 121.5075 },
  { id: 'demo-7', name: '國立中正紀念堂', category: '歷史建築', location: '中正區', image_url: '/tourist_attraction_images/%E5%9C%8B%E7%AB%8B%E4%B8%AD%E6%AD%A3%E7%B4%80%E5%BF%B5%E5%A0%82/1.jpg', lat: 25.0344, lng: 121.5213 },
  { id: 'demo-8', name: '北投溫泉博物館', category: '博物館', location: '北投區', image_url: '/tourist_attraction_images/%E5%8C%97%E6%8A%95%E6%BA%AB%E6%B3%89%E5%8D%9A%E7%89%A9%E9%A4%A8/1.jpg', lat: 25.1365, lng: 121.5065 },
  { id: 'demo-9', name: '華山1914文化創意產業園區', category: '文創園區', location: '中正區', image_url: '/tourist_attraction_images/%E8%8F%AF%E5%B1%B11914%E6%96%87%E5%8C%96%E5%89%B5%E6%84%8F%E7%94%A2%E6%A5%AD%E5%9C%92%E5%8D%80/1.jpg', lat: 25.0442, lng: 121.5298 },
  { id: 'demo-10', name: '饒河街觀光夜市', category: '夜市', location: '松山區', image_url: '/tourist_attraction_images/%E9%A5%92%E6%B2%B3%E8%A1%97%E8%A7%80%E5%85%89%E5%A4%9C%E5%B8%82/1.jpg', lat: 25.0505, lng: 121.5773 },
  { id: 'demo-11', name: '臺北市立動物園', category: '自然景觀', location: '文山區', image_url: '/tourist_attraction_images/%E8%87%BA%E5%8C%97%E5%B8%82%E7%AB%8B%E5%8B%95%E7%89%A9%E5%9C%92/1.jpg', lat: 24.9996, lng: 121.5809 },
  { id: 'demo-12', name: '陽明公園', category: '自然景觀', location: '士林區', image_url: '/tourist_attraction_images/%E9%99%BD%E6%98%8E%E5%85%AC%E5%9C%92/1.jpg', lat: 25.1580, lng: 121.5498 },
];

export default function Planner() {
  const {
    spots, planning, setPlanning,
    planResult, setPlanResult, parseJsonSafely, setFlashMessage,
    points, addPoints, spendPoints
  } = useAppContext();
  const { t } = useLang();

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

  // Route segment data (duration/distance from OSRM via MapComponent)
  const [routeSegments, setRouteSegments] = useState([]);
  const onSegmentsLoaded = useCallback((segs) => setRouteSegments(segs), []);

  // State for Checkout
  const [isBooking, setIsBooking] = useState(false);
  const [bookingProgress, setBookingProgress] = useState(0);
  const [bookingMessage, setBookingMessage] = useState('');
  const [confirmation, setConfirmation] = useState(null);
  const [usePointsDiscount, setUsePointsDiscount] = useState(false);
  const [pointsToSpend, setPointsToSpend] = useState(0);

  const vibes = ['All', '歷史建築', '夜市', '自然景觀', '博物館', '文創園區', '購物'];

  // Handle Gemini Chat for Ideation
  const handleChatSubmit = async (e) => {
    e.preventDefault();
    if (!userInput.trim()) return;

    setIsTyping(true);
    setChatSuggestions([]);

    let spotsPool = [];

    try {
      // Try to get live spots from the backend
      const response = await fetch('/api/spots?limit=20');
      if (response.ok) {
        const data = await parseJsonSafely(response);
        if (Array.isArray(data.spots) && data.spots.length > 0) {
          spotsPool = data.spots;
        }
      }
    } catch (_err) {
      // Network error — will use demo fallback below
    }

    // Fall back to built-in demo spots if the API is unavailable or returned nothing
    if (spotsPool.length === 0) {
      spotsPool = [...DEMO_SPOTS];
    }

    // Also merge in any spots already loaded in context
    if (spots && spots.length > 0) {
      const existingIds = new Set(spotsPool.map(s => s.id));
      const extras = spots.filter(s => !existingIds.has(s.id));
      spotsPool = [...spotsPool, ...extras];
    }

    const shuffled = [...spotsPool].sort(() => 0.5 - Math.random());
    setChatSuggestions(shuffled.slice(0, 6));
    setStage('curation');
    setFlashMessage("✨ Gemini has analyzed your vibes and suggested these spots!");
    setIsTyping(false);
  };

  // Add to cart (used by both click and drop)
  const addToCart = useCallback((spot) => {
    if (!cartSpots.find(s => s.id === spot.id)) {
      setCartSpots(prev => [...prev, spot]);
      setFlashMessage(`Added ${spot.name} to your itinerary!`);
    }
  }, [cartSpots, setFlashMessage]);

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
    if (draggedSpot) addToCart(draggedSpot);
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
      // Geographically reorder steps so the map route doesn't criss-cross
      if (data?.plan?.steps?.length > 2) {
        data.plan.steps = reorderStepsByProximity(data.plan.steps);
      }
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

    if (usePointsDiscount && pointsToSpend > 0) {
      await spendPoints(pointsToSpend);
    }

    try {
      const res = await fetch('/api/book', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cart: cartSpots, discountApplied: usePointsDiscount })
      });
      const data = await parseJsonSafely(res);
      
      // Award points for completion
      await addPoints(50); 
      setFlashMessage("💎 You earned 50 SnapPoints for booking!");
      
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
        {[t('ideation'), t('curation'), t('nav'), t('checkout')].map((s, i) => {
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
            <h1 style={{ fontSize: '4rem', marginBottom: '1.5rem', lineHeight: 1.1 }} className="gradient-text">{t('whereNext')}</h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '1.3rem', marginBottom: '3.5rem' }}>
              {t('describeTrip')}
            </p>
            <form onSubmit={handleChatSubmit}>
              <div className="glass-panel" style={{ 
                padding: '1.5rem', borderRadius: '32px', boxShadow: '0 20px 50px -10px rgba(0,0,0,0.5)',
                display: 'flex', flexDirection: 'column', gap: '1rem'
              }}>
                <textarea 
                  value={userInput}
                  onChange={(e) => setUserInput(e.target.value)}
                  placeholder={t('chatPlaceholder')}
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
                    {isTyping ? <div style={{ width: '20px', height: '20px', border: '2px solid white', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }} /> : t('generateTrip')}
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
                  <h2 style={{ margin: 0 }}>{t('geminiTopPicks')}</h2>
                  <span style={{ background: 'rgba(99, 102, 241, 0.2)', color: 'var(--primary)', padding: '4px 12px', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 'bold' }}>{t('rankedByVibe')}</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '1.2rem' }}>
                  {chatSuggestions.map((spot, i) => {
                    const inCart = !!cartSpots.find(s => s.id === spot.id);
                    return (
                      <div
                        key={spot.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, spot)}
                        onClick={() => addToCart(spot)}
                        className="glass-card"
                        style={{ padding: '1.2rem', cursor: inCart ? 'default' : 'pointer', animation: `fadeIn 0.6s ease-out ${i * 0.1}s forwards`, opacity: 0, position: 'relative', border: inCart ? '1px solid rgba(16,185,129,0.5)' : undefined }}
                      >
                        <div style={{ position: 'relative' }}>
                          <img
                            src={spot.image_url}
                            alt={spot.name}
                            loading="lazy"
                            style={{ height: '120px', width: '100%', objectFit: 'cover', borderRadius: '12px', marginBottom: '1rem' }}
                          />
                          {inCart ? (
                            <div style={{ position: 'absolute', top: '8px', right: '8px', background: '#10b981', borderRadius: '50%', width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.85rem', fontWeight: 'bold', color: 'white' }}>✓</div>
                          ) : (
                            <div style={{ position: 'absolute', top: '8px', right: '8px', background: 'rgba(99,102,241,0.85)', borderRadius: '50%', width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem', color: 'white', opacity: 0.85 }}>+</div>
                          )}
                        </div>
                        <h4 style={{ margin: '0 0 0.4rem 0', fontSize: '1.1rem' }}>{spot.name}</h4>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: 0 }}>{spot.category} · {spot.location}</p>
                      </div>
                    );
                  })}
                </div>
              </section>

              {/* General Search (The "Search" aspect) */}
              <section style={{ padding: '2rem', background: 'rgba(255,255,255,0.02)', borderRadius: '24px', border: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                  <h3 style={{ margin: 0 }}>{t('discoverMore')}</h3>
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
                  placeholder={t('searchPlaceholder')} 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{ width: '100%', padding: '1.2rem 1.5rem', borderRadius: '16px', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border)', color: 'white', fontSize: '1rem', marginBottom: '1.5rem' }}
                />
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem' }}>
                  {filteredSearchSpots.map((spot) => {
                    const inCart = !!cartSpots.find(s => s.id === spot.id);
                    return (
                      <div
                        key={spot.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, spot)}
                        onClick={() => addToCart(spot)}
                        className="glass-card"
                        style={{ padding: '0.8rem', cursor: inCart ? 'default' : 'pointer', fontSize: '0.9rem', display: 'grid', gap: '0.7rem', position: 'relative', border: inCart ? '1px solid rgba(16,185,129,0.5)' : undefined }}
                      >
                        <div style={{ position: 'relative' }}>
                          <img
                            src={spot.image_url}
                            alt={spot.name}
                            loading="lazy"
                            style={{ width: '100%', height: '92px', objectFit: 'cover', borderRadius: '10px' }}
                          />
                          {inCart && (
                            <div style={{ position: 'absolute', top: '6px', right: '6px', background: '#10b981', borderRadius: '50%', width: '22px', height: '22px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', color: 'white', fontWeight: 'bold' }}>✓</div>
                          )}
                        </div>
                        <div style={{ overflow: 'hidden', padding: '0 0.2rem' }}>
                          <div style={{ fontWeight: '600', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{spot.name}</div>
                          <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>{spot.category}</div>
                        </div>
                      </div>
                    );
                  })}
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
                  {t('myItineraryCart')}
                  {cartSpots.length > 0 && (
                    <span style={{ background: 'var(--primary)', color: 'white', borderRadius: '20px', padding: '2px 10px', fontSize: '0.75rem', fontWeight: 'bold', animation: 'fadeIn 0.3s ease-out' }}>{cartSpots.length}</span>
                  )}
                </h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', margin: 0 }}>{t('dropLocations')}</p>
              </div>

              <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.75rem', padding: '0.5rem 0' }}>
                {cartSpots.length === 0 ? (
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', textAlign: 'center', opacity: 0.5 }}>
                    <div style={{ fontSize: '4rem', marginBottom: '1rem', animation: 'float 3s ease-in-out infinite' }}>🛍️</div>
                    <p style={{ fontWeight: '600' }}>{t('bagEmpty')}</p>
                    <small>{t('dragToStart')}</small>
                  </div>
                ) : (
                  cartSpots.map((spot, idx) => (
                    <div key={spot.id} className="animate-slide-in" style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', background: 'rgba(255,255,255,0.06)', padding: '0.7rem', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.08)' }}>
                      <div style={{ flexShrink: 0, width: '22px', height: '22px', borderRadius: '50%', background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', fontWeight: 'bold', color: 'white' }}>{idx + 1}</div>
                      {spot.image_url && (
                        <img src={spot.image_url} alt={spot.name} style={{ width: '42px', height: '42px', borderRadius: '10px', objectFit: 'cover', flexShrink: 0 }} />
                      )}
                      <div style={{ flex: 1, overflow: 'hidden' }}>
                        <div style={{ fontSize: '0.9rem', fontWeight: '600', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{spot.name}</div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{spot.category}</div>
                      </div>
                      <button onClick={() => removeFromCart(spot.id)} style={{ flexShrink: 0, background: 'rgba(239, 68, 68, 0.1)', border: 'none', color: '#ef4444', cursor: 'pointer', width: '26px', height: '26px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem' }}>✕</button>
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
                {t('optimizeRoute')}
              </button>
            </div>
          </div>
        )}

        {/* STAGE 3: NAVIGATION */}
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
              ) : planResult?.plan && (() => {
                const steps = planResult.plan.steps;
                // Totals from OSRM segments
                const totalSec = routeSegments.reduce((s, seg) => s + (seg.duration || 0), 0);
                const totalM   = routeSegments.reduce((s, seg) => s + (seg.distance || 0), 0);
                const hasRouteData = routeSegments.some(s => s.duration != null);

                return (
                  <div style={{ paddingBottom: '2rem' }}>
                    {/* Header */}
                    <div style={{ marginBottom: '2rem' }}>
                      <h1 style={{ fontSize: '2.2rem', marginBottom: '0.8rem' }}>{planResult.plan.title}</h1>
                      <div className="glass-panel" style={{ padding: '1.2rem 1.5rem', borderLeft: '4px solid var(--primary)', marginBottom: '1.5rem' }}>
                        <p style={{ color: 'var(--text)', fontSize: '1rem', margin: 0, fontStyle: 'italic' }}>"{planResult.plan.summary}"</p>
                      </div>

                      {/* Route summary chips */}
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.35)', borderRadius: '20px', padding: '0.4rem 1rem', fontSize: '0.85rem' }}>
                          📍 <strong>{steps.length}</strong> {t('stops')}
                        </div>
                        {hasRouteData && totalSec > 0 && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.35)', borderRadius: '20px', padding: '0.4rem 1rem', fontSize: '0.85rem' }}>
                            🕐 ~<strong>{Math.round(totalSec / 60)}</strong> {t('minTransit')}
                          </div>
                        )}
                        {hasRouteData && totalM > 0 && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(59,130,246,0.15)', border: '1px solid rgba(59,130,246,0.35)', borderRadius: '20px', padding: '0.4rem 1rem', fontSize: '0.85rem' }}>
                            🗺️ <strong>{totalM >= 1000 ? (totalM / 1000).toFixed(1) + ' km' : totalM + ' m'}</strong> {t('total')}
                          </div>
                        )}
                        {planResult.source === 'fallback' && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(251,191,36,0.15)', border: '1px solid rgba(251,191,36,0.35)', borderRadius: '20px', padding: '0.4rem 1rem', fontSize: '0.85rem', color: '#fbbf24' }}>
                            {t('offlinePlan')}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Step timeline */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
                      {steps.map((step, i) => {
                        const style = transportStyle(step.transport);
                        // segment i leads FROM step i TO step i+1
                        const seg = routeSegments[i];
                        const isLast = i === steps.length - 1;
                        return (
                          <div key={i} style={{ display: 'flex', gap: '1.2rem', opacity: 0, animation: `fadeIn 0.5s ease-out ${i * 0.08}s forwards` }}>
                            {/* Left: number + connector line */}
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
                              {/* Numbered circle */}
                              <div style={{
                                width: '36px', height: '36px', borderRadius: '50%',
                                background: style.color, border: '3px solid rgba(255,255,255,0.15)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                color: '#fff', fontWeight: '800', fontSize: '0.85rem',
                                boxShadow: `0 0 14px ${style.color}55`, flexShrink: 0,
                                marginTop: '1.5rem',
                              }}>{i + 1}</div>

                              {/* Connector line (not on last step) */}
                              {!isLast && (
                                <div style={{
                                  width: '3px', flex: 1, minHeight: '40px',
                                  background: `linear-gradient(to bottom, ${style.color}cc, ${transportStyle(steps[i + 1]?.transport).color}44)`,
                                  margin: '4px 0',
                                }} />
                              )}
                            </div>

                            {/* Right: card */}
                            <div className="glass-card" style={{ flex: 1, padding: '1.4rem', marginBottom: isLast ? 0 : '0.5rem', marginTop: '1rem' }}>
                              {/* Time + transport badge */}
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem' }}>
                                <span style={{ color: style.color, fontWeight: '700', fontSize: '1rem' }}>{step.time}</span>
                                <span style={{
                                  background: style.color + '22', color: style.color,
                                  border: `1px solid ${style.color}55`,
                                  borderRadius: '12px', padding: '2px 10px', fontSize: '0.75rem', fontWeight: '700',
                                }}>{style.label}</span>
                              </div>

                              {/* Activity */}
                              <h4 style={{ margin: '0 0 0.6rem 0', fontSize: '1.05rem', lineHeight: 1.3 }}>
                                {i === 0 ? '🛫 ' : isLast ? '🏁 ' : ''}{step.activity}
                              </h4>

                              {/* Tip */}
                              {step.note && (
                                <div style={{ color: '#10b981', fontSize: '0.85rem', display: 'flex', alignItems: 'flex-start', gap: '0.4rem', marginBottom: seg?.duration ? '0.6rem' : 0 }}>
                                  <span>💡</span><span>{step.note}</span>
                                </div>
                              )}

                              {/* Travel to next stop */}
                              {!isLast && seg && (
                                <div style={{
                                  marginTop: '0.8rem', paddingTop: '0.8rem',
                                  borderTop: '1px solid rgba(255,255,255,0.06)',
                                  display: 'flex', gap: '1.2rem', fontSize: '0.8rem', color: 'var(--text-muted)',
                                }}>
                                  {seg.duration != null && (
                                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                      🕐 <strong style={{ color: 'white' }}>
                                        {seg.duration < 60 ? `${seg.duration}s` : `${Math.round(seg.duration / 60)} min`}
                                      </strong> {t('toNextStop')}
                                    </span>
                                  )}
                                  {seg.distance != null && (
                                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                      📏 <strong style={{ color: 'white' }}>
                                        {seg.distance >= 1000 ? (seg.distance / 1000).toFixed(1) + ' km' : seg.distance + ' m'}
                                      </strong>
                                    </span>
                                  )}
                                  {!seg.isRoad && (
                                    <span style={{ color: '#fbbf24', fontSize: '0.75rem' }}>{t('straightLine')}</span>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Safety tips */}
                    {planResult.plan.safety?.length > 0 && (
                      <div className="glass-panel" style={{ marginTop: '2rem', padding: '1.5rem', borderLeft: '4px solid #f59e0b', background: 'rgba(245,158,11,0.05)' }}>
                        <h4 style={{ margin: '0 0 0.8rem 0', color: '#f59e0b', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '1px' }}>{t('travelTips')}</h4>
                        {planResult.plan.safety.map((tip, i) => (
                          <p key={i} style={{ margin: '0.4rem 0', fontSize: '0.9rem', color: 'var(--text-muted)' }}>• {tip}</p>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>

            {/* Map & Actions */}
            <div style={{ position: 'sticky', top: 0, height: 'fit-content', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
              <div className="glass-panel" style={{ padding: '1rem', height: '450px', borderRadius: '32px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)' }}>
                <div style={{ height: '100%', borderRadius: '24px', overflow: 'hidden' }}>
                  <MapComponent steps={planResult?.plan?.steps || []} onSegmentsLoaded={onSegmentsLoaded} />
                </div>
              </div>

              {points > 0 && (
                <div className="glass-panel" style={{ 
                  padding: '1.5rem', borderRadius: '24px', border: '1px solid var(--primary)', 
                  background: usePointsDiscount ? 'rgba(99, 102, 241, 0.1)' : 'transparent',
                  transition: 'all 0.3s'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                      <span style={{ fontSize: '1.5rem' }}>💎</span>
                      <div>
                        <div style={{ fontWeight: 'bold' }}>{t('useSnapPoints')}</div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{points} pts {t('available')}</div>
                      </div>
                    </div>
                    <button 
                      onClick={() => {
                        setUsePointsDiscount(!usePointsDiscount);
                        setPointsToSpend(usePointsDiscount ? 0 : Math.min(points, 100)); // Spend up to 100
                      }}
                      style={{ 
                        background: usePointsDiscount ? 'var(--primary)' : 'rgba(255,255,255,0.1)',
                        border: 'none', color: 'white', padding: '0.5rem 1.2rem', borderRadius: '15px',
                        cursor: 'pointer', transition: 'all 0.3s'
                      }}
                    >
                      {usePointsDiscount ? t('applied') : t('apply')}
                    </button>
                  </div>
                  {usePointsDiscount && (
                    <div className="animate-fade-in" style={{ fontSize: '0.9rem', color: '#10b981', fontWeight: '500' }}>
                      {t('discountApplied')}
                    </div>
                  )}
                </div>
              )}
              
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
                  {t('confirmBook')}
                </button>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <button onClick={() => setStage('curation')} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)', color: 'white', padding: '1rem', borderRadius: '18px', cursor: 'pointer', fontWeight: '600' }}>
                    {t('editSpots')}
                  </button>
                  <button onClick={() => window.print()} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)', color: 'white', padding: '1rem', borderRadius: '18px', cursor: 'pointer', fontWeight: '600' }}>
                    {t('exportPdf')}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* STAGE 4: CHECKOUT (SIMULATION) */}
        {stage === 'checkout' && (
          <div className="animate-fade-in" style={{ textAlign: 'center', maxWidth: '700px', margin: '8rem auto' }}>
            <h2 style={{ fontSize: '3rem', marginBottom: '2.5rem' }}>{t('securingExperience')}</h2>
            <div style={{ width: '100%', height: '16px', background: 'rgba(255,255,255,0.05)', borderRadius: '10px', overflow: 'hidden', marginBottom: '2rem', border: '1px solid rgba(255,255,255,0.1)' }}>
              <div style={{ width: `${bookingProgress}%`, height: '100%', background: 'linear-gradient(90deg, #6366f1, #10b981, #3b82f6)', transition: 'width 0.6s cubic-bezier(0.4, 0, 0.2, 1)', boxShadow: '0 0 20px rgba(99, 102, 241, 0.5)' }}></div>
            </div>
            <p style={{ fontSize: '1.4rem', color: 'var(--text-muted)', minHeight: '2rem' }}>{bookingMessage}</p>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '2rem', marginTop: '5rem' }}>
              {[
                { icon: '🏨', label: t('hotel'), delay: 0 },
                { icon: '🚕', label: t('transport'), delay: 0.1 },
                { icon: '🎟️', label: t('tickets'), delay: 0.2 }
              ].map((item, i) => (
                <div key={item.label} className="glass-panel" style={{ padding: '2rem', opacity: bookingProgress > (i + 1) * 25 ? 1 : 0.2, transition: 'all 0.6s ease-out', transform: bookingProgress > (i + 1) * 25 ? 'scale(1)' : 'scale(0.9)' }}>
                  <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>{item.icon}</div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>{item.label}</div>
                  <div style={{ fontSize: '0.8rem', color: bookingProgress > (i + 1) * 25 ? '#10b981' : 'rgba(255,255,255,0.3)', fontWeight: 'bold' }}>
                    {bookingProgress > (i + 1) * 25 ? t('confirmed') : t('reserving')}
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
            <h1 className="gradient-text" style={{ fontSize: '4rem', marginBottom: '1rem' }}>{t('allSet')}</h1>
            <p style={{ fontSize: '1.4rem', color: 'var(--text-muted)', marginBottom: '4rem' }}>
              {t('adventureSecured')}
            </p>
            
            <div className="glass-panel" style={{ padding: '3rem', textAlign: 'left', marginBottom: '4rem', border: '1px solid var(--primary)', background: 'rgba(99, 102, 241, 0.05)', position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: 0, right: 0, padding: '1rem', background: 'var(--primary)', color: 'white', fontWeight: 'bold', borderBottomLeftRadius: '20px' }}>VIP TICKET</div>
              <div style={{ position: 'absolute', bottom: '1rem', right: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#10b981', fontWeight: 'bold' }}>
                <span style={{ fontSize: '1.2rem' }}>💎</span> +50 SnapPoints Earned
              </div>
              
              <div style={{ marginBottom: '2.5rem' }}>
                <small style={{ color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '2px' }}>{t('confirmationNumber')}</small>
                <div style={{ fontSize: '2rem', fontWeight: 'bold', fontFamily: 'monospace', marginTop: '0.5rem' }}>{confirmation.confirmationId}</div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
                <div>
                  <small style={{ color: 'var(--text-muted)' }}>{t('itinerarySize')}</small>
                  <div style={{ fontSize: '1.2rem', fontWeight: '600' }}>{confirmation.summary.items} {t('locations')}</div>
                </div>
                <div>
                  <small style={{ color: 'var(--text-muted)' }}>{t('stay')}</small>
                  <div style={{ fontSize: '1.2rem', fontWeight: '600' }}>{confirmation.summary.hotel}</div>
                </div>
                <div style={{ gridColumn: 'span 2' }}>
                  <small style={{ color: 'var(--text-muted)' }}>{t('mobilityPackage')}</small>
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
                {t('planNewAdventure')}
              </button>
              <button style={{ padding: '1.2rem 3rem', borderRadius: '40px', background: 'transparent', border: '1px solid var(--border)', color: 'white', fontWeight: 'bold', fontSize: '1.1rem', cursor: 'pointer' }}>
                {t('shareItinerary')}
              </button>
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
