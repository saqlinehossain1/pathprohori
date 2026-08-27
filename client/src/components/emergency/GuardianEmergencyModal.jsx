import React, { useState, useEffect, useContext, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { SocketContext } from '../../context/SocketContext';
import { AuthContext } from '../../context/AuthContext';
import {
  Siren,
  PhoneCall,
  X,
  Navigation,
  Car,
  User,
  MapPin
} from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';

// Helper to fix grey tiles inside a modal
const MapResizer = ({ bounds }) => {
  const map = useMap();
  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        map.invalidateSize();
        if (bounds && Array.isArray(bounds) && bounds.length > 1) {
          map.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 });
        }
      } catch (e) {
        console.warn('MapResizer error:', e);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [map, bounds]);
  return null;
};

export const GuardianEmergencyModal = () => {
  const {
    socket,
    latestEmergencyAlert,
    showGuardianModal,
    closeGuardianEmergencyModal
  } = useContext(SocketContext);
  const { user } = useContext(AuthContext);

  const [livePos, setLivePos] = useState(null);
  const [roadRoutePoints, setRoadRoutePoints] = useState([]);

  // Live heartbeat position update
  useEffect(() => {
    if (!socket || !latestEmergencyAlert) return;
    const handleHeartbeat = (data) => {
      if (
        data &&
        data.tripId === latestEmergencyAlert.tripId &&
        typeof data.latitude === 'number' &&
        typeof data.longitude === 'number' &&
        !isNaN(data.latitude) &&
        !isNaN(data.longitude)
      ) {
        setLivePos({ lat: data.latitude, lng: data.longitude });
      }
    };
    socket.on('HEARTBEAT_RECEIVED', handleHeartbeat);
    return () => socket.off('HEARTBEAT_RECEIVED', handleHeartbeat);
  }, [socket, latestEmergencyAlert]);

  // Validated coordinates
  const startLatLng = useMemo(() => {
    const lat = latestEmergencyAlert?.startCoords?.lat;
    const lng = latestEmergencyAlert?.startCoords?.lng;
    return typeof lat === 'number' && typeof lng === 'number' && !isNaN(lat) && !isNaN(lng)
      ? [lat, lng]
      : [23.7808875, 90.4068305];
  }, [latestEmergencyAlert]);

  const destLatLng = useMemo(() => {
    const lat = latestEmergencyAlert?.destinationCoords?.lat;
    const lng = latestEmergencyAlert?.destinationCoords?.lng;
    return typeof lat === 'number' && typeof lng === 'number' && !isNaN(lat) && !isNaN(lng)
      ? [lat, lng]
      : [23.7925, 90.4167];
  }, [latestEmergencyAlert]);

  const commuterLatLng = useMemo(() => {
    if (livePos && typeof livePos.lat === 'number' && !isNaN(livePos.lat)) {
      return [livePos.lat, livePos.lng];
    }
    return startLatLng;
  }, [livePos, startLatLng]);

  // Fetch OSRM road-following route
  useEffect(() => {
    let isMounted = true;
    const fetchRoute = async () => {
      try {
        const [sLat, sLng] = startLatLng;
        const [dLat, dLng] = destLatLng;
        const res = await fetch(
          `https://router.project-osrm.org/route/v1/driving/${sLng},${sLat};${dLng},${dLat}?overview=full&geometries=geojson`
        );
        const data = await res.json();
        if (isMounted && data?.routes?.[0]) {
          const coords = data.routes[0].geometry.coordinates
            .map((c) => [c[1], c[0]])
            .filter((pt) => Array.isArray(pt) && pt.length >= 2 && typeof pt[0] === 'number' && !isNaN(pt[0]));
          setRoadRoutePoints(coords);
        }
      } catch (err) {
        console.error('OSRM route fetch error:', err);
      }
    };
    fetchRoute();
    return () => { isMounted = false; };
  }, [startLatLng[0], startLatLng[1], destLatLng[0], destLatLng[1]]);

  const activePolyline = useMemo(() => {
    const raw = roadRoutePoints.length > 0 ? roadRoutePoints : [startLatLng, commuterLatLng, destLatLng];
    return raw.filter(
      (pt) => Array.isArray(pt) && pt.length >= 2 && typeof pt[0] === 'number' && typeof pt[1] === 'number' && !isNaN(pt[0]) && !isNaN(pt[1])
    );
  }, [roadRoutePoints, startLatLng, commuterLatLng, destLatLng]);

  const mapBounds = useMemo(() => {
    return activePolyline.length > 0 ? activePolyline : [startLatLng, destLatLng];
  }, [activePolyline, startLatLng, destLatLng]);

  // Lazy icon creation (must be inside component)
  const startIcon = useMemo(() => L.divIcon({
    className: 'custom-start-marker',
    html: `<div style="background-color:#10B981;width:34px;height:34px;border-radius:50%;display:flex;align-items:center;justify-content:center;color:white;border:3px solid white;box-shadow:0 4px 10px rgba(0,0,0,0.3)"><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg></div>`,
    iconSize: [34, 34],
    iconAnchor: [17, 34],
  }), []);

  const destIcon = useMemo(() => L.divIcon({
    className: 'custom-dest-marker',
    html: `<div style="background-color:#E11D48;width:34px;height:34px;border-radius:50%;display:flex;align-items:center;justify-content:center;color:white;border:3px solid white;box-shadow:0 4px 10px rgba(0,0,0,0.3)"><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg></div>`,
    iconSize: [34, 34],
    iconAnchor: [17, 34],
  }), []);

  const commuterIcon = useMemo(() => {
    const name = latestEmergencyAlert?.commuterName || 'Commuter';
    const avatarUrl = latestEmergencyAlert?.avatarUrl;
    const initial = typeof name === 'string' && name.trim().length > 0 ? name.trim().charAt(0).toUpperCase() : 'C';
    const avatarContent = avatarUrl
      ? `<img src="${avatarUrl}" alt="${name}" style="width:40px;height:40px;border-radius:50%;object-fit:cover;border:3px solid white;box-shadow:0 4px 12px rgba(0,0,0,0.4)" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'" /><div style="display:none;width:40px;height:40px;border-radius:50%;background:#E11D48;color:white;font-weight:900;border:3px solid white;align-items:center;justify-content:center;font-family:sans-serif;font-size:15px">${initial}</div>`
      : `<div style="width:40px;height:40px;border-radius:50%;background:#E11D48;color:white;font-weight:900;border:3px solid white;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 12px rgba(0,0,0,0.4);font-family:sans-serif;font-size:15px">${initial}</div>`;
    return L.divIcon({
      className: 'custom-commuter-avatar',
      html: `
        <div style="position:relative;width:40px;height:40px">
          <div style="position:absolute;inset:-5px;border-radius:50%;background:rgba(225,29,72,0.5);animation:ping 1s infinite"></div>
          ${avatarContent}
        </div>`,
      iconSize: [40, 40],
      iconAnchor: [20, 20],
    });
  }, [latestEmergencyAlert?.commuterName, latestEmergencyAlert?.avatarUrl]);

  if (!showGuardianModal || !latestEmergencyAlert || (user && String(user._id) === String(latestEmergencyAlert.commuterId))) {
    return null;
  }

  const commuterName = latestEmergencyAlert.commuterName || 'Commuter';
  const commuterPhone = latestEmergencyAlert.commuterPhone || '';
  const vehicleType = latestEmergencyAlert.vehicleType || 'Vehicle';
  const numberPlate = latestEmergencyAlert.numberPlate || '';
  const destination = latestEmergencyAlert.destination || 'In Transit';

  return createPortal(
    <div className="fixed inset-0 z-[10000] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="max-w-lg w-full bg-white border border-slate-200 rounded-3xl shadow-2xl overflow-hidden">

        {/* Compact Red Alert Header */}
        <div className="bg-rose-600 px-5 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Siren className="w-5 h-5 text-white animate-pulse" />
            <div>
              <p className="text-white font-black text-sm font-display tracking-tight">Emergency SOS Signal</p>
              <p className="text-rose-200 text-[10px] font-medium">Live commuter distress alert</p>
            </div>
          </div>
          <button
            onClick={closeGuardianEmergencyModal}
            className="p-1.5 rounded-xl text-white/70 hover:text-white hover:bg-white/15 transition-all cursor-pointer"
            title="Minimize — reopen from header"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Commuter + Vehicle Info */}
        <div className="px-5 pt-4 pb-3 grid grid-cols-2 gap-3 text-xs">
          <div className="space-y-0.5">
            <p className="text-[10px] font-extrabold uppercase text-slate-400 font-display">Commuter</p>
            <p className="font-extrabold text-slate-900 text-sm font-display">{commuterName}</p>
            {commuterPhone && <p className="text-slate-500 font-mono">{commuterPhone}</p>}
          </div>
          <div className="space-y-0.5">
            <p className="text-[10px] font-extrabold uppercase text-slate-400 font-display">Vehicle / Destination</p>
            <p className="font-extrabold text-slate-900 text-sm font-display truncate">
              {vehicleType} {numberPlate ? `(${numberPlate})` : ''}
            </p>
            <p className="text-slate-500 truncate">{destination}</p>
          </div>
        </div>

        {/* Live Map — same style as commuter OngoingJourneyMap */}
        <div className="px-5 pb-4">
          <div className="h-56 rounded-2xl overflow-hidden border border-slate-200 relative">
            <MapContainer
              key={latestEmergencyAlert?.tripId || 'sos-map'}
              center={commuterLatLng}
              zoom={13}
              scrollWheelZoom={false}
              className="w-full h-full"
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <MapResizer bounds={mapBounds} />

              {/* Route Outer Glow + Inner Line — matches commuter map exactly */}
              {activePolyline.length > 1 && (
                <>
                  <Polyline positions={activePolyline} pathOptions={{ color: '#F43F5E', weight: 8, opacity: 0.35 }} />
                  <Polyline positions={activePolyline} pathOptions={{ color: '#E11D48', weight: 5, opacity: 0.9, dashArray: '10, 6' }} />
                </>
              )}

              <Marker position={startLatLng} icon={startIcon}>
                <Popup><span className="text-xs font-bold text-emerald-700">Start Location</span></Popup>
              </Marker>

              <Marker position={destLatLng} icon={destIcon}>
                <Popup><span className="text-xs font-bold text-rose-700">Destination: {destination}</span></Popup>
              </Marker>

              <Marker position={commuterLatLng} icon={commuterIcon} zIndexOffset={1000}>
                <Popup>
                  <div className="p-1 text-center">
                    <p className="text-xs font-black text-rose-600">🚨 {commuterName}</p>
                    <p className="text-[10px] text-slate-500 font-mono">Live GPS</p>
                  </div>
                </Popup>
              </Marker>
            </MapContainer>

            {/* Live Route Badge — bottom left, same as commuter map */}
            <div className="absolute bottom-3 left-3 z-[400] bg-slate-900/90 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/10 text-[10px] font-extrabold text-white flex items-center gap-1.5 shadow-md font-display">
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
              <span>Tracking Commuter Live Route</span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="px-5 pb-5 space-y-2.5">
          <div className="grid grid-cols-2 gap-2.5">
            <a
              href="tel:999"
              className="py-3 bg-rose-600 hover:bg-rose-700 text-white rounded-2xl text-xs font-black transition-all flex items-center justify-center gap-2 shadow-md active:scale-95 font-display uppercase"
            >
              <PhoneCall className="w-4 h-4 animate-pulse" />
              Call 999
            </a>

            {commuterPhone ? (
              <a
                href={`tel:${commuterPhone}`}
                className="py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-xs font-black transition-all flex items-center justify-center gap-2 shadow-md active:scale-95 font-display"
              >
                <PhoneCall className="w-4 h-4" />
                Call Commuter
              </a>
            ) : (
              <button
                onClick={closeGuardianEmergencyModal}
                className="py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl text-xs font-extrabold transition-all font-display cursor-pointer"
              >
                Acknowledge
              </button>
            )}
          </div>

          {latestEmergencyAlert?.trackingToken && (
            <a
              href={`/track/${latestEmergencyAlert.trackingToken}`}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-2.5 bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 text-white font-extrabold rounded-xl text-xs transition-all flex items-center justify-center gap-1.5 shadow"
            >
              Open Dedicated Live Tracking Screen (4h Expiry)
            </a>
          )}

          <button
            onClick={closeGuardianEmergencyModal}
            className="w-full py-2.5 bg-slate-50 hover:bg-slate-100 text-slate-600 font-extrabold rounded-xl text-xs transition-all cursor-pointer font-display border border-slate-200"
          >
            Minimize Panel — reopen anytime from header
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default GuardianEmergencyModal;
