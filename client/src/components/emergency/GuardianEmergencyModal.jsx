import React, { useState, useEffect, useContext, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { SocketContext } from '../../context/SocketContext';
import { AuthContext } from '../../context/AuthContext';
import {
  Siren,
  PhoneCall,
  MapPin,
  Car,
  CheckCircle2,
  X,
  AlertTriangle,
  Radio,
  ExternalLink,
  Navigation
} from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';

// Helper component to fix Leaflet grey tiles inside modal safely
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

  // Listen for real-time heartbeat updates to move commuter avatar live on Guardian's map
  useEffect(() => {
    if (!socket || !latestEmergencyAlert) return;

    const handleHeartbeatReceived = (data) => {
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

    socket.on('HEARTBEAT_RECEIVED', handleHeartbeatReceived);
    return () => {
      socket.off('HEARTBEAT_RECEIVED', handleHeartbeatReceived);
    };
  }, [socket, latestEmergencyAlert]);

  // Fail-Safe Coordinates Calculation with useMemo
  const startLatLng = useMemo(() => {
    const lat = latestEmergencyAlert?.startCoords?.lat;
    const lng = latestEmergencyAlert?.startCoords?.lng;
    if (typeof lat === 'number' && typeof lng === 'number' && !isNaN(lat) && !isNaN(lng)) {
      return [lat, lng];
    }
    return [23.7808875, 90.4068305];
  }, [latestEmergencyAlert]);

  const destLatLng = useMemo(() => {
    const lat = latestEmergencyAlert?.destinationCoords?.lat;
    const lng = latestEmergencyAlert?.destinationCoords?.lng;
    if (typeof lat === 'number' && typeof lng === 'number' && !isNaN(lat) && !isNaN(lng)) {
      return [lat, lng];
    }
    return [23.7925, 90.4167];
  }, [latestEmergencyAlert]);

  const commuterLatLng = useMemo(() => {
    if (
      livePos &&
      typeof livePos.lat === 'number' &&
      typeof livePos.lng === 'number' &&
      !isNaN(livePos.lat) &&
      !isNaN(livePos.lng)
    ) {
      return [livePos.lat, livePos.lng];
    }
    return startLatLng;
  }, [livePos, startLatLng]);

  // Fetch Actual Road-Following Route Geometry via OSRM API (Google Maps style)
  useEffect(() => {
    let isMounted = true;
    const fetchOSRMRoute = async () => {
      try {
        const [sLat, sLng] = startLatLng;
        const [dLat, dLng] = destLatLng;
        const url = `https://router.project-osrm.org/route/v1/driving/${sLng},${sLat};${dLng},${dLat}?overview=full&geometries=geojson`;
        const res = await fetch(url);
        const data = await res.json();
        if (isMounted && data && data.routes && data.routes[0]) {
          const coords = data.routes[0].geometry.coordinates
            .map((c) => [c[1], c[0]])
            .filter((pt) => Array.isArray(pt) && pt.length >= 2 && typeof pt[0] === 'number' && !isNaN(pt[0]));
          setRoadRoutePoints(coords);
        }
      } catch (err) {
        console.error('Failed to fetch OSRM road route for Guardian map:', err);
      }
    };

    fetchOSRMRoute();
    return () => {
      isMounted = false;
    };
  }, [startLatLng[0], startLatLng[1], destLatLng[0], destLatLng[1]]);

  // Safe Polyline and Map Bounds
  const activePolyline = useMemo(() => {
    const raw = roadRoutePoints.length > 0 ? roadRoutePoints : [startLatLng, commuterLatLng, destLatLng];
    return raw.filter(
      (pt) =>
        Array.isArray(pt) &&
        pt.length >= 2 &&
        typeof pt[0] === 'number' &&
        typeof pt[1] === 'number' &&
        !isNaN(pt[0]) &&
        !isNaN(pt[1])
    );
  }, [roadRoutePoints, startLatLng, commuterLatLng, destLatLng]);

  const mapBounds = useMemo(() => {
    return activePolyline.length > 0 ? activePolyline : [startLatLng, destLatLng];
  }, [activePolyline, startLatLng, destLatLng]);

  // Lazy Leaflet Icon Creation inside Component lifecycle
  const startIcon = useMemo(() => {
    return L.divIcon({
      className: 'custom-start-marker',
      html: `<div style="background-color: #10B981; width: 30px; height: 30px; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; border: 2px solid white; box-shadow: 0 2px 8px rgba(0,0,0,0.4);"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg></div>`,
      iconSize: [30, 30],
      iconAnchor: [15, 30],
    });
  }, []);

  const destIcon = useMemo(() => {
    return L.divIcon({
      className: 'custom-dest-marker',
      html: `<div style="background-color: #E11D48; width: 30px; height: 30px; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; border: 2px solid white; box-shadow: 0 2px 8px rgba(0,0,0,0.4);"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg></div>`,
      iconSize: [30, 30],
      iconAnchor: [15, 30],
    });
  }, []);

  const commuterAvatarIcon = useMemo(() => {
    const name = latestEmergencyAlert?.commuterName || 'Commuter';
    const initial = typeof name === 'string' && name.trim().length > 0 ? name.trim().charAt(0).toUpperCase() : 'C';
    return L.divIcon({
      className: 'custom-commuter-avatar',
      html: `
        <div style="position: relative; width: 40px; height: 40px;">
          <div style="position: absolute; inset: -4px; border-radius: 50%; background: rgba(225, 29, 72, 0.7); animation: ping 1s infinite;"></div>
          <div style="width: 40px; height: 40px; border-radius: 50%; background: #E11D48; color: white; font-weight: 900; border: 2px solid white; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 12px rgba(0,0,0,0.5); font-family: sans-serif; font-size: 14px;">
            ${initial}
          </div>
        </div>
      `,
      iconSize: [40, 40],
      iconAnchor: [20, 20],
    });
  }, [latestEmergencyAlert?.commuterName]);

  // Don't render if no alert or modal is closed or user is the commuter triggering it
  if (!showGuardianModal || !latestEmergencyAlert || (user && String(user._id) === String(latestEmergencyAlert.commuterId))) {
    return null;
  }

  const commuterName = latestEmergencyAlert.commuterName || 'Commuter';
  const commuterPhone = latestEmergencyAlert.commuterPhone || '';
  const vehicleType = latestEmergencyAlert.vehicleType || 'Vehicle';
  const numberPlate = latestEmergencyAlert.numberPlate || '';
  const destination = latestEmergencyAlert.destination || 'In Transit';

  return createPortal(
    <div className="fixed inset-0 z-[10000] bg-rose-950/85 backdrop-blur-xl flex items-center justify-center p-4">
      <div className="max-w-2xl w-full bg-gradient-to-b from-slate-900 via-rose-950/90 to-slate-900 border-2 border-rose-500 rounded-3xl p-6 shadow-[0_0_80px_rgba(225,29,72,0.4)] text-white space-y-5 animate-in zoom-in-95 duration-300 relative overflow-hidden">
        {/* Ambient Top Glow */}
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-96 h-96 bg-rose-500/20 rounded-full blur-3xl pointer-events-none" />

        {/* Siren Header */}
        <div className="flex items-center justify-between border-b border-rose-800/60 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-rose-600 text-white flex items-center justify-center border-2 border-rose-400 shadow-lg animate-bounce">
              <Siren className="w-7 h-7" />
            </div>
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-rose-500/30 text-rose-200 rounded-full text-[10px] font-black uppercase tracking-widest border border-rose-400/40 font-display">
                <span className="w-2 h-2 rounded-full bg-rose-400 animate-ping" />
                <span>Live Guardian SOS Alert</span>
              </div>
              <h2 className="text-xl font-black text-rose-400 font-display tracking-tight mt-0.5">
                CRITICAL DISTRESS SIGNAL
              </h2>
            </div>
          </div>

          <button
            onClick={closeGuardianEmergencyModal}
            className="p-2 rounded-xl text-rose-300 hover:bg-white/10 transition-all cursor-pointer"
            title="Minimize Panel (Can be reopened anytime from header button)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Commuter & Journey Details */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div className="p-3.5 bg-slate-900/90 rounded-2xl border border-rose-500/30 space-y-1">
            <span className="text-[10px] font-extrabold uppercase text-slate-400 font-display">Commuter Name</span>
            <p className="font-extrabold text-white text-base font-display">{commuterName}</p>
            {commuterPhone && (
              <p className="text-slate-300 font-mono font-medium">Phone: {commuterPhone}</p>
            )}
          </div>

          <div className="p-3.5 bg-slate-900/90 rounded-2xl border border-rose-500/30 space-y-1">
            <span className="text-[10px] font-extrabold uppercase text-slate-400 font-display">Vehicle Info</span>
            <p className="font-extrabold text-amber-300 text-base font-display truncate">
              {vehicleType} {numberPlate ? `(${numberPlate})` : ''}
            </p>
            <p className="text-slate-300 truncate font-medium">Dest: {destination}</p>
          </div>
        </div>

        {/* Interactive Live Location Map Preview with Full Bounds & Avatar */}
        <div className="h-56 rounded-2xl overflow-hidden border border-rose-500/40 relative">
          <MapContainer
            key={latestEmergencyAlert?.tripId || 'emergency-modal-map'}
            center={commuterLatLng}
            zoom={13}
            scrollWheelZoom={false}
            className="w-full h-full"
          >
            <TileLayer
              attribution='&copy; OpenStreetMap'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <MapResizer bounds={mapBounds} />

            {/* Outer Google Blue Glow Polyline */}
            {activePolyline.length > 1 && (
              <>
                <Polyline positions={activePolyline} pathOptions={{ color: '#2563EB', weight: 7, opacity: 0.85 }} />
                <Polyline positions={activePolyline} pathOptions={{ color: '#60A5FA', weight: 4, opacity: 1.0 }} />
              </>
            )}

            {/* Start Marker */}
            <Marker position={startLatLng} icon={startIcon}>
              <Popup><span className="text-xs font-bold">Start Location</span></Popup>
            </Marker>

            {/* Destination Marker */}
            <Marker position={destLatLng} icon={destIcon}>
              <Popup><span className="text-xs font-bold">Destination: {destination}</span></Popup>
            </Marker>

            {/* Commuter Live Avatar Marker */}
            <Marker position={commuterLatLng} icon={commuterAvatarIcon} zIndexOffset={1000}>
              <Popup>
                <div className="p-1 text-center font-display">
                  <span className="text-xs font-black text-rose-600 block">🚨 {commuterName}</span>
                  <span className="text-[10px] text-slate-500 font-mono">Live GPS Location</span>
                </div>
              </Popup>
            </Marker>
          </MapContainer>

          {/* Map Overlay Badge */}
          <div className="absolute bottom-3 left-3 z-[400] bg-slate-900/90 backdrop-blur-md px-3 py-1.5 rounded-xl border border-rose-500/30 text-[10px] font-extrabold text-white flex items-center gap-2 shadow-md">
            <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
            <span>Tracking Commuter Live Route</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-2 pt-1">
          <div className="grid grid-cols-2 gap-2.5">
            <a
              href="tel:999"
              className="py-3.5 bg-rose-600 hover:bg-rose-700 text-white rounded-2xl text-xs font-black transition-all flex items-center justify-center gap-2 shadow-lg active:scale-95 uppercase font-display tracking-wide"
            >
              <PhoneCall className="w-4 h-4 animate-pulse" />
              <span>Call 999 Police</span>
            </a>

            {commuterPhone ? (
              <a
                href={`tel:${commuterPhone}`}
                className="py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-xs font-black transition-all flex items-center justify-center gap-2 shadow-md active:scale-95 font-display tracking-wide"
              >
                <PhoneCall className="w-4 h-4" />
                <span>Call Commuter</span>
              </a>
            ) : (
              <button
                onClick={closeGuardianEmergencyModal}
                className="py-3.5 bg-white/10 hover:bg-white/20 text-white rounded-2xl text-xs font-extrabold transition-all font-display"
              >
                Acknowledge Alert
              </button>
            )}
          </div>

          <button
            onClick={closeGuardianEmergencyModal}
            className="w-full py-2.5 bg-slate-800/80 hover:bg-slate-800 text-slate-300 font-extrabold rounded-xl text-xs transition-all cursor-pointer font-display border border-slate-700/50"
          >
            Acknowledge & Minimize Panel (Can Re-open anytime)
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default GuardianEmergencyModal;
