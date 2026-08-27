import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import {
  Shield,
  ShieldAlert,
  ShieldCheck,
  Clock,
  BatteryMedium,
  BatteryLow,
  PhoneCall,
  Share2,
  CheckCircle2,
  Navigation,
  MapPin,
  Car,
  Radio,
  EyeOff,
  LocateFixed,
} from 'lucide-react';
import tripApi from '../api/tripApi';
import { socket } from '../services/socket';

// Commuter Avatar Map Marker (Pulsing Radar halo + profile picture)
const createCommuterAvatarIcon = (commuter, isEmergency, isResolved) => {
  const avatarUrl = commuter?.avatarUrl;
  const initial = commuter?.name ? commuter.name.charAt(0).toUpperCase() : 'C';

  let borderColor = '#0284C7'; // Cyan
  let ringBg = 'rgba(2, 132, 199, 0.4)';
  let bgFill = 'bg-cyan-600';

  if (isResolved) {
    borderColor = '#10B981'; // Emerald
    ringBg = 'rgba(16, 185, 129, 0.35)';
    bgFill = 'bg-emerald-600';
  } else if (isEmergency) {
    borderColor = '#E11D48'; // Rose
    ringBg = 'rgba(225, 29, 72, 0.55)';
    bgFill = 'bg-rose-600';
  }

  const avatarHtml = avatarUrl
    ? `<img src="${avatarUrl}" class="w-10 h-10 rounded-full object-cover border-2 shadow-xl" style="border-color: ${borderColor};" />`
    : `<div class="w-10 h-10 rounded-full ${bgFill} text-white font-black text-xs border-2 border-white flex items-center justify-center shadow-xl">${initial}</div>`;

  return L.divIcon({
    className: 'custom-commuter-avatar-marker',
    html: `
      <div style="position: relative; width: 44px; height: 44px; display: flex; align-items: center; justify-content: center; z-index: 999;">
        <div style="position: absolute; inset: -5px; border-radius: 50%; background: ${ringBg}; animation: ping 1.5s infinite;"></div>
        <div style="position: relative; z-index: 10;">
          ${avatarHtml}
        </div>
      </div>
    `,
    iconSize: [44, 44],
    iconAnchor: [22, 22],
  });
};

const startIcon = L.divIcon({
  className: 'custom-start-marker',
  html: `<div style="background-color: #10B981; width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; border: 2.5px solid white; box-shadow: 0 4px 10px rgba(0,0,0,0.25);"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg></div>`,
  iconSize: [28, 28],
  iconAnchor: [14, 28],
});

const destIcon = L.divIcon({
  className: 'custom-dest-marker',
  html: `<div style="background-color: #E11D48; width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; border: 2.5px solid white; box-shadow: 0 4px 10px rgba(0,0,0,0.25);"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg></div>`,
  iconSize: [28, 28],
  iconAnchor: [14, 28],
});

// Map Viewport Controller: Fits bounds strictly ONCE on mount or when clicking Recenter
const MapViewportController = ({ initialCenter, initialBounds, recenterSignal }) => {
  const map = useMap();
  const initialFitDone = useRef(false);

  // Initial load auto-fit
  useEffect(() => {
    if (!initialFitDone.current && map) {
      if (initialBounds && initialBounds.length > 1) {
        map.fitBounds(initialBounds, { padding: [50, 50], maxZoom: 16 });
        initialFitDone.current = true;
      } else if (initialCenter?.lat && initialCenter?.lng) {
        map.setView([initialCenter.lat, initialCenter.lng], 15);
        initialFitDone.current = true;
      }
    }
  }, [map, initialBounds, initialCenter]);

  // Recenter click
  useEffect(() => {
    if (recenterSignal > 0 && map) {
      if (initialCenter?.lat && initialCenter?.lng) {
        map.flyTo([initialCenter.lat, initialCenter.lng], 16, { duration: 0.8 });
      } else if (initialBounds && initialBounds.length > 1) {
        map.fitBounds(initialBounds, { padding: [50, 50], maxZoom: 16 });
      }
    }
  }, [recenterSignal, map, initialCenter, initialBounds]);

  return null;
};

export const PublicLiveTracking = () => {
  const { token } = useParams();
  const [loading, setLoading] = useState(true);
  const [sessionData, setSessionData] = useState(null);
  const [errorReason, setErrorReason] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [currentPosition, setCurrentPosition] = useState(null);
  const [breadcrumbs, setBreadcrumbs] = useState([]);
  const [roadRoutePoints, setRoadRoutePoints] = useState([]);
  const [batteryLevel, setBatteryLevel] = useState(100);
  const [lastUpdatedAt, setLastUpdatedAt] = useState(new Date());
  const [tripStatus, setTripStatus] = useState('ACTIVE');
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const [copied, setCopied] = useState(false);
  const [isSocketLive, setIsSocketLive] = useState(socket.connected);
  const [recenterCount, setRecenterCount] = useState(0);

  // Fetch initial tracking data
  const fetchTracking = async () => {
    try {
      setLoading(true);
      const res = await tripApi.getPublicTracking(token);
      if (!res.valid) {
        setErrorReason(res.reason);
        setErrorMessage(res.message);
        setSessionData(res.trip || null);
        return;
      }

      setSessionData(res);
      setCurrentPosition(res.currentLocation);
      setBreadcrumbs(res.breadcrumbs.map((b) => [b.lat, b.lng]));
      setRemainingSeconds(res.expiresInSeconds || 0);
      setTripStatus(res.trip.status);

      if (res.breadcrumbs.length > 0) {
        const last = res.breadcrumbs[res.breadcrumbs.length - 1];
        if (typeof last.batteryLevel === 'number') {
          setBatteryLevel(last.batteryLevel);
        }
      }
    } catch (err) {
      console.error('Failed to load tracking data:', err);
      setErrorReason('ERROR');
      setErrorMessage(err.response?.data?.message || 'Failed to load tracking session.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTracking();
  }, [token]);

  // Fetch OSRM Road Path Geometry (Google Maps style road polyline)
  useEffect(() => {
    if (!sessionData?.trip) return;
    const { startCoords, destinationCoords } = sessionData.trip;
    if (
      !startCoords ||
      !destinationCoords ||
      typeof startCoords.lat !== 'number' ||
      typeof destinationCoords.lat !== 'number'
    ) {
      return;
    }

    const fetchRoadPath = async () => {
      try {
        const url = `https://router.project-osrm.org/route/v1/driving/${startCoords.lng},${startCoords.lat};${destinationCoords.lng},${destinationCoords.lat}?overview=full&geometries=geojson`;
        const response = await fetch(url);
        const data = await response.json();
        if (data && data.routes && data.routes[0]) {
          const coords = data.routes[0].geometry.coordinates.map((c) => [c[1], c[0]]);
          setRoadRoutePoints(coords);
        }
      } catch (err) {
        console.warn('OSRM road geometry fetch notice:', err.message);
      }
    };

    fetchRoadPath();
  }, [sessionData?.trip]);

  // Real-time Socket.io updates
  useEffect(() => {
    if (!sessionData?.trip?._id) return;

    const tripId = sessionData.trip._id;
    socket.emit('JOIN_PUBLIC_TRACKING', tripId);
    setIsSocketLive(socket.connected);

    const onConnect = () => {
      setIsSocketLive(true);
      socket.emit('JOIN_PUBLIC_TRACKING', tripId);
    };

    const onDisconnect = () => setIsSocketLive(false);

    const onLocationUpdate = (data) => {
      if (data.coords && typeof data.coords.lat === 'number') {
        setCurrentPosition(data.coords);
        setBreadcrumbs((prev) => [...prev, [data.coords.lat, data.coords.lng]]);
        setLastUpdatedAt(new Date(data.updatedAt || Date.now()));
        if (typeof data.batteryLevel === 'number') setBatteryLevel(data.batteryLevel);
        if (data.status) setTripStatus(data.status);
      }
    };

    const onTrackingExpired = (data) => {
      setErrorReason(data.reason || 'EXPIRED');
      setErrorMessage(data.message || 'The live tracking session has concluded.');
    };

    const onEmergencyResolved = () => {
      setTripStatus('RESOLVED');
    };

    const onStatusUpdate = (data) => {
      if (data.status) {
        setTripStatus(data.status);
      }
    };

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('TRACKING_LOCATION_UPDATE', onLocationUpdate);
    socket.on('TRACKING_EXPIRED', onTrackingExpired);
    socket.on('EMERGENCY_RESOLVED', onEmergencyResolved);
    socket.on('TRACKING_STATUS_UPDATE', onStatusUpdate);

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('TRACKING_LOCATION_UPDATE', onLocationUpdate);
      socket.off('TRACKING_EXPIRED', onTrackingExpired);
      socket.off('EMERGENCY_RESOLVED', onEmergencyResolved);
      socket.off('TRACKING_STATUS_UPDATE', onStatusUpdate);
    };
  }, [sessionData?.trip?._id]);

  // 4-Hour Countdown Timer
  useEffect(() => {
    if (remainingSeconds <= 0) return;

    const interval = setInterval(() => {
      setRemainingSeconds((prev) => {
        if (prev <= 1) {
          setErrorReason('EXPIRED');
          setErrorMessage('This emergency tracking link has exceeded its 4-hour security window.');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [remainingSeconds]);

  const formatCountdown = (secs) => {
    const hours = Math.floor(secs / 3600);
    const minutes = Math.floor((secs % 3600) / 60);
    const seconds = secs % 60;
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRecenter = () => {
    setRecenterCount((prev) => prev + 1);
  };

  // Loading Screen
  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A070F] text-slate-200 flex flex-col items-center justify-center p-4">
        <div className="w-9 h-9 border-2 border-rose-500 border-t-transparent rounded-full animate-spin mb-3" />
        <p className="text-xs font-semibold tracking-wider text-rose-300 uppercase">
          Connecting Secure Live Stream...
        </p>
      </div>
    );
  }

  // Expired or Completed Screen
  if (errorReason) {
    const isCompletedSafe = errorReason === 'TRIP_COMPLETED';
    return (
      <div className="min-h-screen bg-[#0A070F] text-slate-100 flex flex-col items-center justify-center p-6 text-center">
        <div className="max-w-md w-full bg-[#130E1A] border border-white/10 rounded-2xl p-8 shadow-xl space-y-5">
          <div
            className={`w-14 h-14 mx-auto rounded-full flex items-center justify-center ${
              isCompletedSafe
                ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20'
                : 'bg-rose-500/15 text-rose-400 border border-rose-500/20'
            }`}
          >
            {isCompletedSafe ? <CheckCircle2 className="w-7 h-7" /> : <EyeOff className="w-7 h-7" />}
          </div>

          <div>
            <h1 className="text-lg font-bold text-white mb-1.5">
              {isCompletedSafe ? 'Journey Completed Safely' : 'Tracking Link Expired'}
            </h1>
            <p className="text-xs text-slate-400 leading-relaxed">
              {errorMessage ||
                (isCompletedSafe
                  ? 'The commuter completed their journey safely. This tracking session has automatically closed.'
                  : 'This emergency live tracking link has reached its 4-hour limit and has self-destructed.')}
            </p>
          </div>

          <div className="pt-3 border-t border-white/10">
            <Link
              to="/login"
              className="w-full py-2.5 px-4 bg-rose-600 hover:bg-rose-500 text-white font-medium rounded-xl text-xs transition flex items-center justify-center gap-2"
            >
              <Shield className="w-4 h-4" /> Open PathProhori App
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const { commuter, trip } = sessionData;
  const isEmergency = tripStatus === 'EMERGENCY' || tripStatus === 'DURESS';
  const isResolved = tripStatus === 'RESOLVED' || tripStatus === 'COMPLETED';

  // Compute map bounding coordinates once
  const initialMapBounds = [
    trip.startCoords?.lat && trip.startCoords?.lng ? [trip.startCoords.lat, trip.startCoords.lng] : null,
    trip.destinationCoords?.lat && trip.destinationCoords?.lng ? [trip.destinationCoords.lat, trip.destinationCoords.lng] : null,
    currentPosition?.lat && currentPosition?.lng ? [currentPosition.lat, currentPosition.lng] : null,
  ].filter(Boolean);

  return (
    <div className="min-h-screen bg-[#09060E] text-slate-100 flex flex-col font-sans">
      {/* Minimal Header */}
      <header className="bg-[#120D1A]/95 border-b border-white/10 backdrop-blur-md px-4 py-2 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-3">
          {/* Commuter Name & Live Indicator */}
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-rose-500 to-pink-600 flex items-center justify-center text-white shadow-xs">
              <Shield className="w-3.5 h-3.5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xs font-bold text-white tracking-tight">
                  {commuter.name}'s Live Transit
                </h1>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/25">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                  LIVE
                </span>
              </div>
            </div>
          </div>

          {/* Countdown & Share */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-white/5 border border-white/10 text-slate-300 text-xs font-mono">
              <Clock className="w-3 h-3 text-rose-400" />
              <span className="text-[10px] text-slate-400">Expires:</span>
              <span className="text-rose-300 font-semibold text-xs">{formatCountdown(remainingSeconds)}</span>
            </div>

            <button
              onClick={handleCopyLink}
              className="p-1 px-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white transition text-xs flex items-center gap-1 cursor-pointer"
              title="Copy Link"
            >
              <Share2 className="w-3 h-3" />
              <span className="text-[11px]">{copied ? 'Copied' : 'Share'}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Dynamic Status Notification Banner (Status display only, no action button) */}
      {isResolved ? (
        <div className="bg-emerald-950/70 text-emerald-200 px-4 py-1.5 text-xs font-medium border-b border-emerald-500/30 flex items-center justify-between">
          <div className="max-w-6xl mx-auto w-full flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>
              <strong>EMERGENCY RESOLVED:</strong> Commuter confirmed safe. Alarm is resolved.
            </span>
          </div>
        </div>
      ) : isEmergency ? (
        <div className="bg-rose-950/80 text-rose-200 px-4 py-1.5 text-xs font-medium border-b border-rose-500/30 flex items-center justify-between">
          <div className="max-w-6xl mx-auto w-full flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-rose-400 animate-pulse shrink-0" />
            <span>
              <strong>CRITICAL PANIC ACTIVE:</strong> Commuter triggered panic protocol. Location broadcasting live.
            </span>
          </div>
        </div>
      ) : null}

      {/* Main Grid */}
      <div className="flex-1 max-w-6xl w-full mx-auto p-2 sm:p-3 grid grid-cols-1 lg:grid-cols-3 gap-3">
        {/* Left Column: Interactive Zoomable Map (No snapping back!) */}
        <div className="lg:col-span-2 flex flex-col bg-[#120D1A] rounded-xl border border-white/10 overflow-hidden shadow-sm h-[52vh] lg:h-[calc(100vh-130px)] min-h-[360px] relative">
          {/* Top Overlays: GPS status & Battery */}
          <div className="absolute top-2.5 left-2.5 right-2.5 z-[1000] flex items-center justify-between pointer-events-none">
            <div className="pointer-events-auto bg-[#0E0915]/85 backdrop-blur-md border border-white/10 px-2.5 py-1 rounded-lg text-[10px] font-medium text-slate-300 flex items-center gap-1.5 shadow">
              <Radio className={`w-3 h-3 ${isSocketLive ? 'text-emerald-400 animate-pulse' : 'text-amber-400'}`} />
              <span>{isSocketLive ? 'Live GPS Stream' : 'Connecting...'}</span>
            </div>

            <div className="pointer-events-auto bg-[#0E0915]/85 backdrop-blur-md border border-white/10 px-2.5 py-1 rounded-lg text-[10px] font-medium text-slate-300 flex items-center gap-1.5 shadow">
              <span className="text-slate-400">Battery:</span>
              <span className="font-semibold text-white">{batteryLevel}%</span>
              {batteryLevel <= 15 ? (
                <BatteryLow className="w-3 h-3 text-rose-400" />
              ) : (
                <BatteryMedium className="w-3 h-3 text-emerald-400" />
              )}
            </div>
          </div>

          {/* Floating Recenter Map Button */}
          <button
            onClick={handleRecenter}
            className="absolute bottom-3 right-3 z-[1000] p-2 bg-[#120D1A]/90 hover:bg-[#1C1527] border border-white/15 text-slate-200 hover:text-white rounded-xl shadow-md transition flex items-center gap-1 text-xs backdrop-blur-md cursor-pointer"
            title="Recenter Map View"
          >
            <LocateFixed className="w-3.5 h-3.5 text-rose-400" />
            <span className="hidden sm:inline text-[11px] font-medium">Recenter</span>
          </button>

          {/* Leaflet Map (Freely zoomable & pannable) */}
          {currentPosition ? (
            <MapContainer
              center={[currentPosition.lat, currentPosition.lng]}
              zoom={15}
              className="w-full h-full"
              zoomControl={true}
              scrollWheelZoom={true}
              doubleClickZoom={true}
              touchZoom={true}
              dragging={true}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />

              {/* Viewport controller (fits bounds ONCE on load, never overrides zoom/pan on timer ticks) */}
              <MapViewportController
                initialCenter={currentPosition}
                initialBounds={initialMapBounds}
                recenterSignal={recenterCount}
              />

              {/* Start Point Marker */}
              {trip.startCoords?.lat && trip.startCoords?.lng && (
                <Marker position={[trip.startCoords.lat, trip.startCoords.lng]} icon={startIcon}>
                  <Popup>
                    <div className="p-1 text-slate-900 text-xs">
                      <p className="font-bold text-emerald-700">Origin</p>
                      <p>{trip.startingLocation}</p>
                    </div>
                  </Popup>
                </Marker>
              )}

              {/* Destination Point Marker */}
              {trip.destinationCoords?.lat && trip.destinationCoords?.lng && (
                <Marker position={[trip.destinationCoords.lat, trip.destinationCoords.lng]} icon={destIcon}>
                  <Popup>
                    <div className="p-1 text-slate-900 text-xs">
                      <p className="font-bold text-rose-700">Destination</p>
                      <p>{trip.destination}</p>
                    </div>
                  </Popup>
                </Marker>
              )}

              {/* Road-Following Route Path (Cyan Route Line) */}
              {roadRoutePoints.length > 1 && (
                <Polyline
                  positions={roadRoutePoints}
                  pathOptions={{
                    color: '#0284C7',
                    weight: 3.5,
                    opacity: 0.65,
                  }}
                />
              )}

              {/* Active Breadcrumb Trail (Recorded Actual Movement) */}
              {breadcrumbs.length > 1 && (
                <Polyline
                  positions={breadcrumbs}
                  pathOptions={{
                    color: isEmergency ? '#E11D48' : '#10B981',
                    weight: 4.5,
                    opacity: 0.9,
                    dashArray: isEmergency ? '6, 6' : undefined,
                  }}
                />
              )}

              {/* Commuter Live Avatar Marker */}
              <Marker
                position={[currentPosition.lat, currentPosition.lng]}
                icon={createCommuterAvatarIcon(commuter, isEmergency, isResolved)}
              >
                <Popup>
                  <div className="p-1 text-slate-900 text-xs space-y-0.5">
                    <p className="font-bold text-rose-600">{commuter.name}</p>
                    <p className="text-[10px] text-slate-600 font-mono">
                      {currentPosition.lat.toFixed(5)}, {currentPosition.lng.toFixed(5)}
                    </p>
                    <p className="text-[10px] text-slate-400">
                      Updated: {new Date(lastUpdatedAt).toLocaleTimeString()}
                    </p>
                  </div>
                </Popup>
              </Marker>
            </MapContainer>
          ) : (
            <div className="w-full h-full flex items-center justify-center text-slate-400 text-xs">
              Acquiring GPS fix...
            </div>
          )}
        </div>

        {/* Right Column: Minimal Info & Dialers Panel */}
        <div className="flex flex-col gap-2.5">
          {/* Commuter & Journey Card */}
          <div className="bg-[#120D1A] border border-white/10 rounded-xl p-3.5 shadow-sm space-y-3">
            {/* Commuter Header */}
            <div className="flex items-center gap-2.5 pb-2.5 border-b border-white/10">
              <div className="w-9 h-9 rounded-full bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-white font-bold text-xs overflow-hidden shrink-0">
                {commuter.avatarUrl ? (
                  <img src={commuter.avatarUrl} alt={commuter.name} className="w-full h-full object-cover" />
                ) : (
                  commuter.name.charAt(0).toUpperCase()
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-xs font-bold text-white truncate">{commuter.name}</h2>
                <p className="text-[11px] text-slate-400 truncate">{commuter.phone || 'Phone not provided'}</p>
              </div>
            </div>

            {/* Vehicle & Route Summary */}
            <div className="space-y-2 text-xs text-slate-300">
              <div className="flex items-start gap-2">
                <Car className="w-3.5 h-3.5 text-rose-400 shrink-0 mt-0.5" />
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-semibold">Vehicle</span>
                  <span className="text-white font-medium text-[11px]">
                    {trip.vehicleType} {trip.vehicleColor && `• ${trip.vehicleColor}`}
                  </span>
                  {trip.numberPlate && (
                    <span className="ml-1 px-1.5 py-0.2 rounded bg-white/10 font-mono text-[10px] text-amber-300">
                      {trip.numberPlate}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-start gap-2">
                <Navigation className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-semibold">Route</span>
                  <p className="text-slate-400 text-[11px]">From: <span className="text-slate-200">{trip.startingLocation}</span></p>
                  <p className="text-slate-400 text-[11px]">To: <span className="text-rose-300 font-semibold">{trip.destination}</span></p>
                </div>
              </div>

              {trip.driverDescription && (
                <div className="p-2 rounded-lg bg-white/5 border border-white/5 text-[11px]">
                  <span className="text-slate-400 block text-[9px] uppercase font-semibold">Driver Notes</span>
                  <p className="text-slate-200 text-[11px]">{trip.driverDescription}</p>
                </div>
              )}
            </div>

            {/* Quick Action Dialers */}
            <div className="pt-2 border-t border-white/10 grid grid-cols-2 gap-2">
              {commuter.phone ? (
                <a
                  href={`tel:${commuter.phone}`}
                  className="py-2 px-2.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/30 text-emerald-300 font-semibold text-xs transition flex items-center justify-center gap-1 shadow-xs"
                >
                  <PhoneCall className="w-3 h-3" />
                  Call Commuter
                </a>
              ) : (
                <button
                  disabled
                  className="py-2 px-2.5 rounded-lg bg-white/5 border border-white/10 text-slate-500 text-xs flex items-center justify-center gap-1 cursor-not-allowed"
                >
                  No Phone
                </button>
              )}

              <a
                href="tel:999"
                className="py-2 px-2.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs transition flex items-center justify-center gap-1 shadow-xs"
              >
                <ShieldAlert className="w-3 h-3" />
                Call 999 Police
              </a>
            </div>
          </div>

          {/* Privacy Note */}
          <div className="bg-[#120D1A]/60 border border-white/5 rounded-xl p-2.5 text-[10px] text-slate-400 space-y-1">
            <div className="flex items-center gap-1 text-slate-300 font-medium">
              <Shield className="w-3 h-3 text-rose-400" />
              <span>4h Auto-Destruct Privacy Protocol</span>
            </div>
            <p className="text-[10px] leading-relaxed">
              This session stream expires automatically after 4 hours or upon safe journey completion.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PublicLiveTracking;
