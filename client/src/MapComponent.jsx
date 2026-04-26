import React, { useEffect, useMemo, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// ─── Coordinate lookup table ────────────────────────────────────────────────
const TAIPEI_COORD_LOOKUP = [
  { keys: ['台北101', 'taipei 101', '101'], lat: 25.03361, lng: 121.56476 },
  { keys: ['艋舺龍山寺', '龍山寺', 'longshan'], lat: 25.03716, lng: 121.4999 },
  { keys: ['國立故宮博物院', '故宮', 'national palace museum'], lat: 25.10236, lng: 121.54849 },
  { keys: ['國立中正紀念堂', '中正紀念堂', 'chiang kai-shek'], lat: 25.03619, lng: 121.51868 },
  { keys: ['大安森林公園', '大安森林', 'daan forest'], lat: 25.03244, lng: 121.5349 },
  { keys: ['松山文創園區', '松山文創', 'songshan cultural'], lat: 25.04369, lng: 121.56063 },
  { keys: ['華山1914', '華山', 'huashan'], lat: 25.04413, lng: 121.5294 },
  { keys: ['饒河街觀光夜市', '饒河', 'raohe'], lat: 25.05091, lng: 121.57754 },
  { keys: ['西門紅樓', '西門', 'ximending', 'ximen'], lat: 25.04207, lng: 121.50693 },
  { keys: ['北投溫泉博物館', '北投溫泉', 'beitou'], lat: 25.13658, lng: 121.50715 },
  { keys: ['陽明公園', '陽明山', 'yangmingshan', 'yangming'], lat: 25.15921, lng: 121.54013 },
  { keys: ['臺北市立動物園', '木柵動物園', 'taipei zoo'], lat: 24.99886, lng: 121.58106 },
  { keys: ['臺北市立美術館', '北美館', 'taipei fine arts'], lat: 25.07196, lng: 121.52437 },
  { keys: ['臺北流行音樂中心', '流行音樂'], lat: 25.05211, lng: 121.59859 },
  { keys: ['臺北表演藝術中心', '北藝中心', 'tpac'], lat: 25.08512, lng: 121.52437 },
  { keys: ['國立臺灣博物館', '臺灣博物館'], lat: 25.04413, lng: 121.51292 },
  { keys: ['國民革命忠烈祠', '忠烈祠', 'martyrs shrine'], lat: 25.07838, lng: 121.53313 },
  { keys: ['台北當代藝術館', '當代藝術館', 'moca taipei'], lat: 25.05072, lng: 121.51892 },
  { keys: ['台北霞海城隍廟', '霞海城隍廟', '城隍廟'], lat: 25.0556, lng: 121.51017 },
  { keys: ['大龍峒保安宮', '保安宮', 'baoan temple'], lat: 25.07321, lng: 121.51554 },
  { keys: ['關渡自然公園', '關渡', 'guandu'], lat: 25.1189, lng: 121.4708 },
  { keys: ['白石湖吊橋', '白石湖', 'bihu'], lat: 25.09917, lng: 121.58711 },
  { keys: ['美麗華百樂園', '美麗華', 'miramar'], lat: 25.08331, lng: 121.55716 },
  { keys: ['臺北市立天文科學教育館', '天文館'], lat: 25.09583, lng: 121.5183 },
  { keys: ['臺北市立兒童新樂園', '兒童新樂園'], lat: 25.09724, lng: 121.51494 },
  { keys: ['士林官邸', 'shilin residence'], lat: 25.09204, lng: 121.52521 },
  { keys: ['新北投車站', '新北投', 'xinbeitou'], lat: 25.13665, lng: 121.50346 },
  { keys: ['梅庭'], lat: 25.13693, lng: 121.50877 },
  { keys: ['凱達格蘭文化館', '凱達格蘭'], lat: 25.13707, lng: 121.50583 },
  { keys: ['新芳春茶行', '新芳春'], lat: 25.05708, lng: 121.51255 },
  { keys: ['林安泰古厝', '林安泰'], lat: 25.07175, lng: 121.53035 },
  { keys: ['寶藏巖', 'treasure hill'], lat: 25.01465, lng: 121.53388 },
  { keys: ['臺北孔廟', '孔廟', 'confucius temple'], lat: 25.07357, lng: 121.51352 },
  { keys: ['草山行館', '草山'], lat: 25.15428, lng: 121.53811 },
  { keys: ['芝山文化生態綠園', '芝山', 'zhishan'], lat: 25.10428, lng: 121.53192 },
  { keys: ['信義公民會館', '信義公民'], lat: 25.03292, lng: 121.56569 },
  { keys: ['松山慈祐宮', '慈祐宮'], lat: 25.05108, lng: 121.57773 },
  { keys: ['內雙溪自然中心', '內雙溪'], lat: 25.1145, lng: 121.57782 },
  { keys: ['臺北製糖所', '製糖所'], lat: 25.0332, lng: 121.49506 },
  { keys: ['dadaocheng', '大稻埕', '迪化街', 'dihua'], lat: 25.0556, lng: 121.5095 },
  { keys: ['yongkang', '永康', 'yongkang street'], lat: 25.02636, lng: 121.53042 },
  { keys: ['zhongshan', '中山'], lat: 25.06361, lng: 121.52083 },
  { keys: ['xinyi', '信義', 'xinyi district'], lat: 25.03382, lng: 121.56443 },
  { keys: ['wanhua', '萬華'], lat: 25.03716, lng: 121.4999 },
  { keys: ['daan', '大安'], lat: 25.02760, lng: 121.54330 },
  { keys: ['shilin', '士林', 'shilin night market', '士林夜市'], lat: 25.08812, lng: 121.52421 },
  { keys: ['ningxia', '寧夏夜市'], lat: 25.05653, lng: 121.51754 },
  { keys: ['gongguan', '公館'], lat: 25.01363, lng: 121.53428 },
  { keys: ['breakfast', 'morning', '早餐'], lat: 25.0556, lng: 121.5095 },
  { keys: ['lunch', '午餐'], lat: 25.02636, lng: 121.53042 },
  { keys: ['dinner', '晚餐'], lat: 25.08812, lng: 121.52421 },
  { keys: ['night market', '夜市'], lat: 25.05091, lng: 121.57754 },
  { keys: ['hotel', 'accommodation', 'hostel', '住宿', '飯店'], lat: 25.04770, lng: 121.52959 },
  { keys: ['museum', '博物館'], lat: 25.04413, lng: 121.51292 },
  { keys: ['temple', '廟', '寺'], lat: 25.03716, lng: 121.4999 },
  { keys: ['park', '公園'], lat: 25.03244, lng: 121.5349 },
  { keys: ['market', '市場', '市集'], lat: 25.0556, lng: 121.5095 },
];

const TAIPEI_CENTER = { lat: 25.0478, lng: 121.5319 };
const SYNTHETIC_OFFSETS = [
  { dlat: 0.000, dlng: 0.000 }, { dlat: 0.012, dlng: 0.025 },
  { dlat: -0.010, dlng: 0.015 }, { dlat: 0.020, dlng: -0.010 },
  { dlat: -0.015, dlng: -0.020 }, { dlat: 0.005, dlng: 0.040 },
  { dlat: 0.030, dlng: 0.005 }, { dlat: -0.025, dlng: 0.030 },
];

function lookupCoords(text) {
  if (!text) return null;
  const lower = text.toLowerCase();
  for (const entry of TAIPEI_COORD_LOOKUP) {
    if (entry.keys.some(k => lower.includes(k.toLowerCase()))) {
      return { lat: entry.lat, lng: entry.lng };
    }
  }
  return null;
}

// ─── Transport colour & style ────────────────────────────────────────────────
// MRT/Bus checked BEFORE walk so "MRT/Walk" → MRT (red)
export function transportStyle(transportText) {
  const t = (transportText || '').toLowerCase();
  if (/mrt|metro|捷運|subway|tube/.test(t))   return { color: '#ef4444', dashArray: null,   weight: 5, label: '🚇 MRT',   profile: 'driving' };
  if (/bus|巴士|公車/.test(t))                return { color: '#3b82f6', dashArray: '12 4', weight: 4, label: '🚌 Bus',   profile: 'driving' };
  if (/taxi|cab|uber|car|計程車/.test(t))     return { color: '#f97316', dashArray: null,   weight: 4, label: '🚕 Taxi',  profile: 'driving' };
  if (/bike|youbike|bicycle|自行車/.test(t))  return { color: '#84cc16', dashArray: '6 4',  weight: 4, label: '🚲 Bike',  profile: 'bike'    };
  if (/walk|步行|徒步|foot/.test(t))          return { color: '#22c55e', dashArray: '8 6',  weight: 4, label: '🚶 Walk',  profile: 'foot'    };
  return                                       { color: '#8b5cf6', dashArray: null,   weight: 4, label: '🗺️ Route', profile: 'driving' };
}

// ─── Numbered DivIcon ────────────────────────────────────────────────────────
function numberedIcon(index, color) {
  return L.divIcon({
    className: '',
    iconSize: [34, 34],
    iconAnchor: [17, 17],
    popupAnchor: [0, -20],
    html: `<div style="
      width:34px;height:34px;border-radius:50%;
      background:${color};border:3px solid #fff;
      box-shadow:0 2px 10px rgba(0,0,0,0.5);
      display:flex;align-items:center;justify-content:center;
      color:#fff;font-weight:800;font-size:14px;font-family:sans-serif;
    ">${index + 1}</div>`,
  });
}

// ─── OSRM proxy fetch ────────────────────────────────────────────────────────
async function fetchOsrmRoute(from, to, profile) {
  const params = new URLSearchParams({
    from_lat: from.lat, from_lng: from.lng,
    to_lat: to.lat,     to_lng: to.lng,
    profile,
  });
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 7000);
  try {
    const res = await fetch(`/api/route?${params}`, { signal: ctrl.signal });
    clearTimeout(timer);
    if (!res.ok) return null;
    const data = await res.json();
    const route = data?.routes?.[0];
    if (!route) return null;
    const coords = route.geometry?.coordinates;
    if (!coords || coords.length < 2) return null;
    return {
      path: coords.map(([lng, lat]) => [lat, lng]),
      duration: Math.round(route.duration),   // seconds
      distance: Math.round(route.distance),   // metres
    };
  } catch {
    clearTimeout(timer);
    return null;
  }
}

// ─── Fit-bounds helper (inside MapContainer) ─────────────────────────────────
function MapBounds({ markers }) {
  const map = useMap();
  useEffect(() => {
    if (markers.length > 0) {
      const bounds = L.latLngBounds(markers.map(m => [m.lat, m.lng]));
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [markers, map]);
  return null;
}

// ─── Legend (absolute-positioned over the map) ───────────────────────────────
function RouteLegend({ segments }) {
  const seen = useMemo(() => {
    const map = new Map();
    segments.forEach(s => {
      if (!map.has(s.style.label)) map.set(s.style.label, s.style);
    });
    return Array.from(map.values());
  }, [segments]);

  if (seen.length === 0) return null;
  return (
    <div style={{
      position: 'absolute', bottom: 28, left: 10, zIndex: 1000,
      background: 'rgba(12,12,20,0.85)', backdropFilter: 'blur(8px)',
      borderRadius: 10, padding: '8px 12px',
      border: '1px solid rgba(255,255,255,0.1)',
      display: 'flex', flexDirection: 'column', gap: 5,
      pointerEvents: 'none',
    }}>
      {seen.map(s => (
        <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12, color: '#fff' }}>
          <div style={{
            width: 24, height: 4, borderRadius: 2, background: s.color,
            ...(s.dashArray ? { backgroundImage: `repeating-linear-gradient(90deg,${s.color} 0,${s.color} 8px,transparent 8px,transparent 14px)`, background: 'none' } : {}),
          }} />
          {s.label}
        </div>
      ))}
    </div>
  );
}

// ─── Main component ──────────────────────────────────────────────────────────
export default function MapComponent({ steps, onSegmentsLoaded }) {
  // ── 1. Resolve coordinates for every step ──
  const markers = useMemo(() => {
    const resolved = (steps || []).map((step, index) => {
      let lat = Number(step.lat);
      let lng = Number(step.lng);
      if (!Number.isFinite(lat) || !Number.isFinite(lng) || lat === 0) {
        const found = lookupCoords(step.activity) || lookupCoords(step.note);
        if (found) { lat = found.lat; lng = found.lng; }
      }
      if (!Number.isFinite(lat) || !Number.isFinite(lng) || lat === 0) {
        const off = SYNTHETIC_OFFSETS[index % SYNTHETIC_OFFSETS.length];
        lat = TAIPEI_CENTER.lat + off.dlat;
        lng = TAIPEI_CENTER.lng + off.dlng;
      }
      return { ...step, lat, lng, id: index };
    });

    // Spread markers that share the exact same coordinate so pins don't stack
    const SPREAD = 0.0012; // ~130 m
    const seen = new Map();
    return resolved.map(m => {
      const key = `${m.lat.toFixed(5)},${m.lng.toFixed(5)}`;
      const count = seen.get(key) || 0;
      seen.set(key, count + 1);
      if (count === 0) return m;
      const angle = (count * 137.5 * Math.PI) / 180; // golden-angle spiral
      return { ...m, lat: m.lat + SPREAD * Math.sin(angle), lng: m.lng + SPREAD * Math.cos(angle) };
    });
  }, [steps]);

  // ── 2. Stable key — only changes when coordinates actually change ──
  const markersKey = useMemo(
    () => markers.map(m => `${m.lat.toFixed(5)},${m.lng.toFixed(5)}`).join('|'),
    [markers]
  );

  // ── 3. Route segments — fetched once per unique set of coordinates ──
  const [segments, setSegments] = useState([]);
  const cacheRef = useRef(new Map()); // persists across re-renders

  useEffect(() => {
    if (markers.length < 2) { setSegments([]); return; }

    const pairs = markers.slice(0, -1).map((m, i) => ({
      from: m, to: markers[i + 1], step: m,
    }));

    let cancelled = false;

    Promise.all(pairs.map(({ from, to, step }) => {
      const style = transportStyle(step.transport);
      const key = `${from.lat.toFixed(5)},${from.lng.toFixed(5)}-${to.lat.toFixed(5)},${to.lng.toFixed(5)}-${style.profile}`;

      if (cacheRef.current.has(key)) {
        return Promise.resolve(cacheRef.current.get(key));
      }

      return fetchOsrmRoute(from, to, style.profile).then(result => {
        const seg = {
          path:     result ? result.path     : [[from.lat, from.lng], [to.lat, to.lng]],
          duration: result ? result.duration : null,
          distance: result ? result.distance : null,
          style,
          isRoad: !!result,
        };
        cacheRef.current.set(key, seg);
        return seg;
      });
    })).then(segs => {
      if (!cancelled) {
        setSegments(segs);
        if (onSegmentsLoaded) onSegmentsLoaded(segs);
      }
    });

    return () => { cancelled = true; };
  }, [markersKey]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── 4. Empty state ──
  if (markers.length === 0) {
    return (
      <div style={{ height: '100%', display: 'grid', placeItems: 'center', color: 'var(--text-muted)' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>🗺️</div>
          <p style={{ margin: 0 }}>Map will appear once your route is ready.</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ height: '100%', width: '100%', borderRadius: '12px', overflow: 'hidden', position: 'relative' }}>
      <MapContainer
        center={[markers[0].lat, markers[0].lng]}
        zoom={13}
        style={{ height: '100%', width: '100%', zIndex: 0 }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
        />
        <MapBounds markers={markers} />

        {/* Route lines */}
        {segments.map((seg, i) => (
          <Polyline
            key={i}
            positions={seg.path}
            pathOptions={{
              color: seg.style.color,
              weight: seg.style.weight,
              dashArray: seg.style.dashArray,
              opacity: 0.9,
            }}
          />
        ))}

        {/* Numbered markers */}
        {markers.map((marker) => {
          const style = transportStyle(marker.transport);
          const seg = segments[marker.id];      // segment leading INTO this stop
          return (
            <Marker
              key={marker.id}
              position={[marker.lat, marker.lng]}
              icon={numberedIcon(marker.id, style.color)}
            >
              <Popup minWidth={180}>
                <div style={{ fontFamily: 'sans-serif', fontSize: 13 }}>
                  <div style={{ fontWeight: 700, marginBottom: 4, color: style.color }}>
                    Stop {marker.id + 1}{marker.time ? ` · ${marker.time}` : ''}
                  </div>
                  <div style={{ fontWeight: 600, marginBottom: 6 }}>{marker.activity}</div>
                  <div style={{
                    display: 'inline-flex', alignItems: 'center', gap: 4,
                    background: style.color + '22', color: style.color,
                    border: `1px solid ${style.color}55`,
                    borderRadius: 12, padding: '2px 8px', fontSize: 11, fontWeight: 600,
                    marginBottom: seg ? 6 : 0,
                  }}>
                    {style.label}
                  </div>
                  {seg && seg.duration != null && (
                    <div style={{ fontSize: 11, color: '#555', marginTop: 4 }}>
                      🕐 {seg.duration < 60 ? `${seg.duration}s` : `${Math.round(seg.duration / 60)} min`}
                      {seg.distance != null && ` · 📍 ${seg.distance >= 1000 ? (seg.distance / 1000).toFixed(1) + ' km' : seg.distance + ' m'}`}
                    </div>
                  )}
                  {marker.note && (
                    <div style={{ marginTop: 6, fontSize: 11, color: '#666', borderTop: '1px solid #eee', paddingTop: 5 }}>
                      💡 {marker.note}
                    </div>
                  )}
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>

      <RouteLegend segments={segments} />
    </div>
  );
}
