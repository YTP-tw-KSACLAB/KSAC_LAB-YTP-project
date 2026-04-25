import React, { useEffect, useState } from 'react';
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
  const [markers, setMarkers] = useState([]);

  useEffect(() => {
    // If steps don't have lat/lng, we will assign a default Taipei center and add some offset
    const defaultCenter = [25.0330, 121.5654]; // Taipei 101
    
    if (steps && steps.length > 0) {
      const newMarkers = steps.map((step, index) => {
        let lat = step.lat;
        let lng = step.lng;
        if (!lat || !lng) {
          // Fake coordinates for visualization if API doesn't provide them
          lat = defaultCenter[0] + (Math.random() - 0.5) * 0.05;
          lng = defaultCenter[1] + (Math.random() - 0.5) * 0.05;
        }
        return { ...step, lat, lng, id: index };
      });
      setMarkers(newMarkers);
    } else {
      setMarkers([]);
    }
  }, [steps]);

  const center = markers.length > 0 && markers[0].lat ? [markers[0].lat, markers[0].lng] : [25.0330, 121.5654];

  return (
    <div className="map-container-wrapper" style={{ height: '300px', width: '100%', borderRadius: '12px', overflow: 'hidden', marginTop: '16px', zIndex: 0 }}>
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
