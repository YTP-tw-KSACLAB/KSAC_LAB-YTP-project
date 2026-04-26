import React, { useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix for default marker icons in react-leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Helper component to adjust map bounds
const MapBounds = ({ steps }) => {
  const map = useMap();

  useEffect(() => {
    if (steps && steps.length > 0) {
      const validSteps = steps.filter(s => s.lat && s.lng);
      if (validSteps.length > 0) {
        const bounds = L.latLngBounds(validSteps.map(s => [s.lat, s.lng]));
        map.fitBounds(bounds, { padding: [50, 50] });
      }
    }
  }, [steps, map]);

  return null;
};

export default function MapComponent({ steps }) {
  const markers = useMemo(() => {
    return (steps || [])
      .map((step, index) => {
        const lat = Number(step.lat);
        const lng = Number(step.lng);

        if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
          return null;
        }

        return { ...step, lat, lng, id: index };
      })
      .filter(Boolean);
  }, [steps]);

  if (markers.length === 0) {
    return (
      <div className="map-container-wrapper glass-panel" style={{ padding: '1.5rem', minHeight: '180px', display: 'grid', placeItems: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <strong>Dataset coordinates unavailable</strong>
          <p style={{ margin: '0.4rem 0 0', color: 'var(--text-muted)' }}>This route has no latitude and longitude in the dataset, so no synthetic map pins are shown.</p>
        </div>
      </div>
    );
  }

  const center = [markers[0].lat, markers[0].lng];

  return (
    <div className="map-container-wrapper" style={{ height: '100%', width: '100%', borderRadius: '12px', overflow: 'hidden', zIndex: 0 }}>
      <MapContainer center={center} zoom={13} style={{ height: '100%', width: '100%' }}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
        />
        <MapBounds steps={markers} />
        {markers.map((marker) => (
          <Marker key={marker.id} position={[marker.lat, marker.lng]}>
            <Popup>
              <strong>{marker.time}</strong><br />
              {marker.activity}<br />
              <em>{marker.transport}</em>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
