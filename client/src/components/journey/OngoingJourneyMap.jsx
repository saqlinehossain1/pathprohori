import React, { useState, useEffect, useContext } from 'react';
import { createPortal } from 'react-dom';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import Card from '../common/Card';
import Button from '../common/Button';
import Badge from '../common/Badge';
import { AuthContext } from '../../context/AuthContext';
import { useVoice } from '../../hooks/useVoice';
import DuressPinModal from '../voice/DuressPinModal';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock,
  MapPin,
  Locate,
  Radio,
  Car,
  Camera,
  Navigation,
  PhoneCall,
  ShieldAlert,
  Siren,
  X,
  CheckCircle,
  Mic,
  MicOff,
  Volume2,
  Sparkles
} from 'lucide-react';
import tripApi from '../../api/tripApi';

// Synthesize Emergency Siren Audio via Web Audio API
const playEmergencySirenSound = () => {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(750, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1150, ctx.currentTime + 0.35);
    osc.frequency.exponentialRampToValueAtTime(750, ctx.currentTime + 0.7);
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 1.1);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 1.1);
  } catch (e) {
    console.error('Audio siren play error:', e);
  }
};

// Custom Map Marker Icons for Start & Destination
const startIcon = L.divIcon({
  className: 'custom-start-marker',
  html: `<div style="background-color: #10B981; width: 34px; height: 34px; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; border: 3px solid white; box-shadow: 0 4px 10px rgba(0,0,0,0.3);"><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg></div>`,
  iconSize: [34, 34],
  iconAnchor: [17, 34],
});

const destIcon = L.divIcon({
  className: 'custom-dest-marker',
  html: `<div style="background-color: #E11D48; width: 34px; height: 34px; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; border: 3px solid white; box-shadow: 0 4px 10px rgba(0,0,0,0.3);"><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg></div>`,
  iconSize: [34, 34],
  iconAnchor: [17, 34],
});

// Dynamic User Avatar Map Marker - Cyan Theme (or Pulsing Red during Emergency)
const createUserAvatarIcon = (user, isEmergency) => {
  const avatarUrl = user?.avatarUrl;
  const initial = user?.name ? user.name.charAt(0).toUpperCase() : 'U';

  const avatarBorder = isEmergency ? 'border-rose-500' : 'border-cyan-400';
  const ringBg = isEmergency ? 'rgba(225, 29, 72, 0.6)' : 'rgba(2, 132, 199, 0.45)';

  const avatarHtml = avatarUrl
    ? `<img src="${avatarUrl}" class="w-10 h-10 rounded-full object-cover border-2 ${avatarBorder} shadow-xl" />`
    : `<div class="w-10 h-10 rounded-full ${isEmergency ? 'bg-rose-600' : 'bg-cyan-600'} text-white font-black text-xs border-2 border-white flex items-center justify-center shadow-xl font-display">${initial}</div>`;

  return L.divIcon({
    className: 'custom-user-avatar-marker',
    html: `
      <div style="position: relative; width: 42px; height: 42px; z-index: 9999;">
        <div style="position: absolute; inset: -6px; border-radius: 50%; background: ${ringBg}; animation: ping 1.2s infinite;"></div>
        <div style="position: relative; z-index: 10;">
          ${avatarHtml}
        </div>
      </div>
    `,
    iconSize: [42, 42],
    iconAnchor: [21, 21],
  });
};

// Helper component to auto-recenter map bounds
const MapBoundsAdjuster = ({ bounds }) => {
  const map = useMap();
  useEffect(() => {
    if (bounds && bounds.length > 0) {
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
    }
  }, [map, bounds]);
  return null;
};

export const OngoingJourneyMap = ({
  trip,
  onComplete,
  onPanic,
  onCancelPanic,
  panicLoading,
}) => {
  const { user } = useContext(AuthContext);
  const [currentPos, setCurrentPos] = useState(null);
  const [pingSending, setPingSending] = useState(false);
  const [roadRoutePoints, setRoadRoutePoints] = useState([]);
  const panicTriggeredRef = React.useRef(false);

  // Voice-Activated Hands-Free Hook
  const {
    isListening,
    transcript,
    keywordMatched,
    setKeywordMatched,
    startListening,
    stopListening,
    handsFreeActive,
  } = useVoice();
  
  // Emergency Modal Popup & Duress PIN State
  const isEmergencyActive = trip.status === 'EMERGENCY' || trip.status === 'DURESS';
  const [showPanicModal, setShowPanicModal] = useState(isEmergencyActive);
  const [showDuressModal, setShowDuressModal] = useState(false);
  const [isEndingJourneyWithPin, setIsEndingJourneyWithPin] = useState(false);

  // 10-Second Grace Period Countdown State
  const [showGraceModal, setShowGraceModal] = useState(false);
  const [graceCountdown, setGraceCountdown] = useState(10);
  const graceTimerRef = React.useRef(null);

  // HTML5 Battery Status API Helper
  const getBatteryLevel = async () => {
    if ('getBattery' in navigator) {
      try {
        const battery = await navigator.getBattery();
        return Math.round(battery.level * 100);
      } catch (e) {}
    }
    return 100;
  };

  // Auto-start hands-free listening on mount when trip is active
  useEffect(() => {
    if (trip && trip.status === 'ACTIVE' && !isListening) {
      startListening();
    }
  }, [trip]);

  // Sync state if trip status turns EMERGENCY externally
  useEffect(() => {
    if (isEmergencyActive) {
      setShowPanicModal(true);
      playEmergencySirenSound();
    }
  }, [isEmergencyActive]);

  // Trigger Panic automatically when hands-free voice keyword matches!
  useEffect(() => {
    if (keywordMatched && !panicTriggeredRef.current && !isEmergencyActive) {
      panicTriggeredRef.current = true;
      console.warn('🎙️ HANDS-FREE VOICE PHRASE DETECTED! INITIATING GRACE COUNTDOWN!');
      handleInitiatePanic(false);
      setKeywordMatched(false);
    }
  }, [keywordMatched, isEmergencyActive, setKeywordMatched]);

  // Fail-Safe Default Coordinates (Dhaka Mohakhali & Gulshan fallback if coordinates are missing/invalid)
  const defaultStart =
    trip?.startCoords &&
    typeof trip.startCoords.lat === 'number' &&
    typeof trip.startCoords.lng === 'number' &&
    !isNaN(trip.startCoords.lat)
      ? trip.startCoords
      : { lat: 23.7808875, lng: 90.4068305 };

  const defaultDest =
    trip?.destinationCoords &&
    typeof trip.destinationCoords.lat === 'number' &&
    typeof trip.destinationCoords.lng === 'number' &&
    !isNaN(trip.destinationCoords.lat)
      ? trip.destinationCoords
      : { lat: 23.7925, lng: 90.4167 };

  // Fetch Actual Road-Following Route Coordinates via OSRM API (Google Maps style)
  useEffect(() => {
    const fetchRoadRoute = async () => {
      try {
        const start = defaultStart;
        const dest = defaultDest;
        if (typeof start.lng !== 'number' || typeof start.lat !== 'number' || typeof dest.lng !== 'number' || typeof dest.lat !== 'number') {
          return;
        }
        const url = `https://router.project-osrm.org/route/v1/driving/${start.lng},${start.lat};${dest.lng},${dest.lat}?overview=full&geometries=geojson`;
        const res = await fetch(url);
        const data = await res.json();
        if (data && data.routes && data.routes[0]) {
          const coords = data.routes[0].geometry.coordinates.map((c) => [c[1], c[0]]);
          setRoadRoutePoints(coords);
        }
      } catch (err) {
        console.error('Failed to fetch OSRM road route:', err);
      }
    };

    fetchRoadRoute();
  }, [defaultStart.lat, defaultStart.lng, defaultDest.lat, defaultDest.lng]);

  // Watch Live GPS Location
  useEffect(() => {
    if (!navigator.geolocation) return;

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const coords = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        };
        setCurrentPos(coords);
      },
      (err) => console.error('Live GPS tracking error:', err),
      { enableHighAccuracy: true, maximumAge: 5000 }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  // Send Manual Heartbeat Ping with Battery Status Telemetry
  const handleSendPing = async () => {
    setPingSending(true);
    try {
      const batteryLevel = await getBatteryLevel();
      const payload = {
        latitude: currentPos?.lat,
        longitude: currentPos?.lng,
        batteryLevel,
      };
      await tripApi.sendHeartbeat(trip._id, payload);
    } catch (err) {
      console.error('Failed to send heartbeat ping:', err);
    } finally {
      setPingSending(false);
    }
  };

  // Trigger Panic Handler with 10-Second Grace Period (Prevents Accidental Triggers)
  const handleInitiatePanic = (isDuress = false) => {
    if (isDuress) {
      executePanicTrigger(true);
      return;
    }
    setGraceCountdown(10);
    setShowGraceModal(true);
  };

  // 10-Second Grace Countdown Effect
  useEffect(() => {
    if (!showGraceModal) return;

    if (graceCountdown <= 0) {
      setShowGraceModal(false);
      executePanicTrigger(false);
      return;
    }

    graceTimerRef.current = setTimeout(() => {
      setGraceCountdown((prev) => prev - 1);
    }, 1000);

    return () => {
      if (graceTimerRef.current) clearTimeout(graceTimerRef.current);
    };
  }, [showGraceModal, graceCountdown]);

  // Cancel False Alarm during 10s Grace Period
  const handleCancelGracePeriod = () => {
    if (graceTimerRef.current) clearTimeout(graceTimerRef.current);
    setShowGraceModal(false);
    setGraceCountdown(10);
    panicTriggeredRef.current = false;
    console.log('🛡️ Accidental Panic Trigger Cancelled during 10s Grace Period.');
  };

  // Execute Backend Panic Broadcast
  const executePanicTrigger = async (isDuress = false) => {
    playEmergencySirenSound();
    if (!isDuress) {
      setShowPanicModal(true);
    }
    try {
      if (typeof onPanic === 'function') {
        await onPanic(isDuress);
      }
    } catch (err) {
      console.error('Panic trigger error:', err);
    }
  };

  // Handle Dual-PIN Deactivation / False Alarm Cancellation
  const handleDuressDeactivate = async (isSilentDuress) => {
    if (isSilentDuress) {
      // Visually close screen to deceive attacker, but secretly send high-priority DURESS trigger!
      setShowPanicModal(false);
      setIsEndingJourneyWithPin(false);
      await executePanicTrigger(true);
    } else {
      // Standard PIN entry: Cancel False Alarm on Backend & Resume Active Journey
      try {
        if (typeof onCancelPanic === 'function') {
          await onCancelPanic(user?.duressPin ? '0000' : '9999');
        }
      } catch (e) {
        console.error('Cancel false alarm error:', e);
      }
      setShowPanicModal(false);
      panicTriggeredRef.current = false;

      // If user requested to end trip while in panic mode, complete journey safely after PIN verification!
      if (isEndingJourneyWithPin) {
        setIsEndingJourneyWithPin(false);
        if (typeof onComplete === 'function') {
          onComplete();
        }
      }
    }
  };

  // Toggle Hands-Free Mic Listening
  const handleToggleVoiceMic = () => {
    if (isListening || handsFreeActive) {
      stopListening();
    } else {
      startListening();
    }
  };

  // AUTOMATIC Heartbeat Ping Interval (Every 30 Seconds with Battery Status)
  useEffect(() => {
    if (!trip || !trip._id) return;

    const interval = setInterval(async () => {
      const batteryLevel = await getBatteryLevel();
      const payload = {
        latitude: currentPos?.lat,
        longitude: currentPos?.lng,
        batteryLevel,
      };
      tripApi.sendHeartbeat(trip._id, payload).catch((err) => {
        console.error('Auto heartbeat ping error:', err);
      });
    }, 30000);

    return () => clearInterval(interval);
  }, [trip, currentPos]);

  // Build Map Route Points & Bounds with safe LatLng validation
  const startLatLng =
    typeof defaultStart?.lat === 'number' && typeof defaultStart?.lng === 'number' && !isNaN(defaultStart.lat)
      ? [defaultStart.lat, defaultStart.lng]
      : [23.7808875, 90.4068305];

  const destLatLng =
    typeof defaultDest?.lat === 'number' && typeof defaultDest?.lng === 'number' && !isNaN(defaultDest.lat)
      ? [defaultDest.lat, defaultDest.lng]
      : [23.7925, 90.4167];

  const currentLatLng =
    currentPos && typeof currentPos.lat === 'number' && typeof currentPos.lng === 'number' && !isNaN(currentPos.lat)
      ? [currentPos.lat, currentPos.lng]
      : startLatLng;

  // Polyline Points
  const activeRoutePolyline =
    roadRoutePoints.length > 0 ? roadRoutePoints : [startLatLng, currentLatLng, destLatLng];

  const mapBounds = [startLatLng, destLatLng, currentLatLng];
  const userAvatarIcon = createUserAvatarIcon(user, isEmergencyActive);

  // Extract primary guardian phone
  const primaryGuardian = user?.guardians && user.guardians.length > 0 ? user.guardians[0] : null;
  const guardianPhone = primaryGuardian?.phone || primaryGuardian?.user?.phone;
  const secretPhrase = user?.emergencyPhrase || 'Lavender Moonlight';

  return (
    <div className="space-y-6">
      {/* Live Monitoring Top Bar Card - Flashes Red when Emergency */}
      <Card className={`border-rose-200 transition-all duration-300 ${
        isEmergencyActive
          ? 'bg-gradient-to-r from-rose-950 via-rose-900 to-rose-950 text-white shadow-2xl ring-4 ring-rose-500/50 animate-pulse'
          : 'bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white shadow-xl'
      } p-5`}>
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-5">
          {/* Header Info */}
          <div className="flex items-center gap-3.5 min-w-0">
            <div className={`w-12 h-12 rounded-2xl ${isEmergencyActive ? 'bg-rose-500 text-white animate-bounce' : 'bg-rose-600 text-white animate-pulse'} flex items-center justify-center shrink-0 shadow-md`}>
              {isEmergencyActive ? <Siren className="w-7 h-7" /> : <Activity className="w-6 h-6" />}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg font-black font-display tracking-wide truncate">
                  {isEmergencyActive ? '🚨 EMERGENCY DISTRESS ALARM ACTIVE' : 'Live Guardian Tracking Progress'}
                </h2>
                <Badge variant="highAlert" className={`${isEmergencyActive ? 'bg-rose-600 animate-pulse' : 'bg-rose-500'} text-white border-0 text-[10px] uppercase font-extrabold px-2.5`}>
                  {trip.status}
                </Badge>
              </div>
              <p className="text-xs text-slate-300 font-medium mt-0.5 truncate">
                {isEmergencyActive
                  ? 'Emergency Guardians & Safety Operators notified live. Call emergency hotline immediately.'
                  : 'Heartbeat ping monitor active • Auto 30s connection sync enabled'}
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 w-full xl:w-auto shrink-0">
            <button
              onClick={handleSendPing}
              disabled={pingSending}
              className="px-4 py-2.5 bg-white/10 hover:bg-white/20 border border-white/20 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs active:scale-95 whitespace-nowrap"
            >
              <Radio className={`w-4 h-4 ${pingSending ? 'animate-spin text-cyan-400' : 'text-cyan-400'}`} />
              <span>{pingSending ? 'Pinging...' : 'Send Heartbeat Ping'}</span>
            </button>

            <button
              onClick={isEmergencyActive ? () => setShowPanicModal(true) : () => handleInitiatePanic(false)}
              disabled={panicLoading}
              className={`px-4 py-2.5 ${isEmergencyActive ? 'bg-rose-600 hover:bg-rose-500 ring-2 ring-rose-400 animate-bounce' : 'bg-rose-600 hover:bg-rose-700'} text-white rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-md shadow-rose-950/40 active:scale-95 whitespace-nowrap`}
            >
              {isEmergencyActive ? <Siren className="w-4 h-4 text-white" /> : <AlertTriangle className="w-4 h-4" />}
              <span>{isEmergencyActive ? '🚨 REOPEN SOS ALARM WINDOW' : '1-TAP PANIC'}</span>
            </button>

            <button
              onClick={onComplete}
              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-extrabold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-md shadow-emerald-950/20 active:scale-95 whitespace-nowrap"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Finish Journey Safely</span>
            </button>
          </div>
        </div>

        {/* HANDS-FREE VOICE TRIGGER BAR */}
        <div className="mt-4 pt-3.5 border-t border-white/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5 min-w-0">
            <button
              onClick={handleToggleVoiceMic}
              className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all flex items-center gap-1.5 cursor-pointer border ${
                isListening
                  ? 'bg-rose-500/20 text-rose-300 border-rose-500/50 ring-2 ring-rose-500/30'
                  : 'bg-white/5 text-slate-300 border-white/10 hover:bg-white/15'
              }`}
            >
              {isListening ? (
                <>
                  <Mic className="w-3.5 h-3.5 text-rose-400 animate-pulse" />
                  <span>Hands-Free Mic Active</span>
                </>
              ) : (
                <>
                  <MicOff className="w-3.5 h-3.5 text-slate-400" />
                  <span>Enable Hands-Free Mic</span>
                </>
              )}
            </button>

            <div className="min-w-0 flex items-center gap-1.5 text-slate-300">
              <span className="text-[11px] font-semibold text-slate-400 hidden sm:inline">Secret Phrase:</span>
              <span className="font-extrabold text-cyan-300 bg-slate-950/60 px-2.5 py-1 rounded-lg border border-white/10 truncate font-mono text-[11px]">
                "{secretPhrase}"
              </span>
            </div>
          </div>

          {/* Live Voice Audio Transcript Feedback */}
          {isListening && (
            <div className="flex items-center gap-2 text-[11px] text-slate-300 font-mono bg-slate-950/80 px-3 py-1 rounded-xl border border-white/10 truncate max-w-full sm:max-w-xs">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping shrink-0" />
              <span className="truncate italic text-slate-300">{transcript || 'Listening...'}</span>
            </div>
          )}
        </div>
      </Card>

      {/* Main Grid: Interactive Map (8 Cols) & Trip Details (4 Cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Interactive Map View */}
        <div className="lg:col-span-8 bg-white border border-slate-200 rounded-3xl p-3 shadow-card space-y-3">
          <div className="flex items-center justify-between px-2 pt-1">
            <div className="flex items-center gap-2 text-xs font-extrabold text-slate-900 font-display">
              <Navigation className="w-4 h-4 text-rose-600" />
              <span>Live Road Route Map (Google Maps Style)</span>
            </div>
            <div className="flex items-center gap-2 text-[11px] text-slate-500 font-medium">
              <span className={`w-2.5 h-2.5 rounded-full ${isEmergencyActive ? 'bg-rose-600 animate-ping' : 'bg-cyan-500 animate-ping'}`} />
              <span className="font-semibold text-slate-700">OSRM Road Routing Active</span>
            </div>
          </div>

          <div className="h-[440px] rounded-2xl overflow-hidden border border-slate-200 relative">
            <MapContainer
              center={startLatLng}
              zoom={13}
              scrollWheelZoom={false}
              className="w-full h-full"
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />

              <MapBoundsAdjuster bounds={mapBounds} />

              {/* Road Route Polyline Outer Glow Halo */}
              <Polyline
                positions={activeRoutePolyline}
                pathOptions={{ color: isEmergencyActive ? '#E11D48' : '#F43F5E', weight: 8, opacity: 0.35 }}
              />

              {/* Road Route Polyline Inner Navigation Line */}
              <Polyline
                positions={activeRoutePolyline}
                pathOptions={{ color: '#E11D48', weight: 5, opacity: 0.9, dashArray: '10, 6' }}
              />

              {/* Start Marker */}
              <Marker position={startLatLng} icon={startIcon}>
                <Popup>
                  <div className="p-1 space-y-1">
                    <span className="text-[10px] font-extrabold uppercase text-emerald-600 block">Start Point</span>
                    <p className="text-xs font-extrabold text-slate-900">{trip.startingLocation || 'Start Location'}</p>
                  </div>
                </Popup>
              </Marker>

              {/* Destination Marker */}
              <Marker position={destLatLng} icon={destIcon}>
                <Popup>
                  <div className="p-1 space-y-1">
                    <span className="text-[10px] font-extrabold uppercase text-rose-600 block">Destination</span>
                    <p className="text-xs font-extrabold text-slate-900">{trip.destination}</p>
                  </div>
                </Popup>
              </Marker>

              {/* Commuter Live Position Profile Avatar Marker with zIndexOffset={1000} to render on TOP */}
              <Marker position={currentLatLng} icon={userAvatarIcon} zIndexOffset={1000}>
                <Popup>
                  <div className="p-1 space-y-1">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-cyan-500 animate-ping" />
                      <span className="text-[10px] font-extrabold uppercase text-cyan-700 block font-display">Live Commuter Position</span>
                    </div>
                    <p className="text-xs font-extrabold text-slate-900 font-display">
                      {user?.name || 'Commuter User'}
                    </p>
                    <p className="text-[10px] text-slate-500 font-mono">
                      {currentLatLng[0].toFixed(4)}, {currentLatLng[1].toFixed(4)}
                    </p>
                  </div>
                </Popup>
              </Marker>
            </MapContainer>

            {/* Map Legend Overlay Badge */}
            <div className="absolute bottom-3 left-3 z-[400] bg-white/95 backdrop-blur-md p-2.5 rounded-2xl border border-slate-200 shadow-md flex items-center gap-3 text-[11px] font-extrabold text-slate-800">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-emerald-500 border border-white" />
                <span>Start</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-cyan-600 border border-white ring-2 ring-cyan-300" />
                <span>You ({user?.name ? user.name.split(' ')[0] : 'Commuter'})</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-rose-600 border border-white" />
                <span>Destination</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Journey Log Card Details */}
        <div className="lg:col-span-4 space-y-4">
          <Card className="border-slate-200/80 space-y-4 shadow-card">
            <h3 className="text-sm font-extrabold text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2 font-display">
              <Car className="w-4 h-4 text-rose-600" />
              Journey Safety Telemetry
            </h3>

            <div className="space-y-3 text-xs">
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
                <span className="text-slate-500 block text-[10px] font-extrabold uppercase tracking-wider font-display">Vehicle Info</span>
                <p className="font-extrabold text-slate-900 font-display text-sm">{trip.vehicleType}</p>
                {trip.numberPlate && (
                  <p className="text-slate-600 font-semibold">Plate: <span className="font-mono text-slate-900 font-bold">{trip.numberPlate}</span></p>
                )}
                {trip.vehicleColor && (
                  <p className="text-slate-500 font-medium">Color: {trip.vehicleColor}</p>
                )}
              </div>

              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
                <span className="text-slate-500 block text-[10px] font-extrabold uppercase tracking-wider font-display">Est. Travel Duration</span>
                <p className="font-extrabold text-slate-900 font-display text-sm flex items-center gap-1">
                  <Clock className="w-4 h-4 text-amber-500" /> {trip.estimatedTimeMinutes} Minutes
                </p>
              </div>

              {trip.driverDescription && (
                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
                  <span className="text-slate-500 block text-[10px] uppercase tracking-wider font-display">Driver / Journey Notes</span>
                  <p className="text-slate-700 font-medium leading-relaxed">{trip.driverDescription}</p>
                </div>
              )}

              {trip.photoUrl && (
                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 space-y-2">
                  <span className="text-slate-500 block text-[10px] font-extrabold uppercase tracking-wider font-display flex items-center gap-1">
                    <Camera className="w-3.5 h-3.5 text-rose-600" /> Vehicle Check-in Photo
                  </span>
                  <img
                    src={trip.photoUrl}
                    alt="Vehicle check-in photo"
                    className="w-full h-36 object-cover rounded-xl border border-slate-200 shadow-2xs"
                  />
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>

      {/* FULL SCREEN EMERGENCY PANIC SOS RESPONSE MODAL */}
      {showPanicModal && createPortal(
        <div className="fixed inset-0 z-[9999] bg-slate-950/85 backdrop-blur-xl flex items-center justify-center p-4">
          <div className="max-w-xl w-full bg-gradient-to-b from-slate-900 via-rose-950/90 to-slate-950 border border-rose-500/50 rounded-3xl p-7 text-white space-y-6 shadow-[0_0_80px_rgba(225,29,72,0.35)] animate-in zoom-in-95 duration-300 relative overflow-hidden">
            {/* Ambient Top Crimson Glow Halo */}
            <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-80 h-80 bg-rose-500/20 rounded-full blur-3xl pointer-events-none" />

            {/* Header / Alarm Status */}
            <div className="flex items-center gap-4 p-4 rounded-2xl bg-slate-900/90 border border-rose-500/40 shadow-inner">
              <div className="w-14 h-14 rounded-2xl bg-rose-600 text-white flex items-center justify-center border-2 border-rose-400 shadow-lg animate-bounce shrink-0">
                <Siren className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <div className="inline-flex items-center gap-1.5 px-3 py-0.5 bg-rose-500/20 text-rose-300 rounded-full text-[10px] font-black uppercase tracking-widest border border-rose-500/30 font-display">
                  <span className="w-2 h-2 rounded-full bg-rose-400 animate-ping" />
                  <span>Critical Emergency Mode Active</span>
                </div>
                <h3 className="text-xl font-black text-rose-400 font-display tracking-tight leading-none">
                  GUARDIAN SOS ALERT BROADCASTING
                </h3>
                <p className="text-xs text-slate-300 font-medium leading-tight">
                  Live location, vehicle description & battery level are being monitored live.
                </p>
              </div>
            </div>

            {/* Emergency Action Buttons */}
            <div className="space-y-3">
              <a
                href="tel:999"
                className="w-full py-4 bg-gradient-to-r from-rose-600 to-red-700 hover:from-rose-500 hover:to-red-600 text-white font-black rounded-2xl text-xs transition-all shadow-lg shadow-rose-950/60 active:scale-95 cursor-pointer font-display uppercase tracking-wider flex items-center justify-center gap-2 text-sm"
              >
                <PhoneCall className="w-5 h-5 animate-pulse text-white" />
                <span>CALL 999 NATIONAL EMERGENCY</span>
              </a>

              {guardianPhone ? (
                <a
                  href={`tel:${guardianPhone}`}
                  className="w-full py-3.5 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 text-white font-black rounded-2xl text-xs transition-all shadow-md active:scale-95 cursor-pointer font-display uppercase tracking-wider flex items-center justify-center gap-2"
                >
                  <PhoneCall className="w-4 h-4 text-emerald-200" />
                  <span>CALL GUARDIAN ({primaryGuardian?.name || 'Emergency Contact'})</span>
                </a>
              ) : null}
            </div>

            {/* Disarm / Deactivate with Dual-PIN */}
            <div className="flex items-center justify-between pt-4 border-t border-rose-900/60 gap-3 flex-wrap">
              <button
                onClick={() => setShowPanicModal(false)}
                className="text-xs text-slate-400 hover:text-white transition-all cursor-pointer font-extrabold font-display uppercase tracking-wider"
              >
                Minimize Window
              </button>

              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={() => setShowDuressModal(true)}
                  className="text-xs font-extrabold text-amber-300 hover:text-amber-200 transition-all cursor-pointer flex items-center gap-1.5 font-display bg-amber-950/70 hover:bg-amber-900/80 px-3.5 py-2.5 rounded-xl border border-amber-500/40 shadow-xs"
                >
                  <X className="w-4 h-4 text-amber-400" />
                  <span>Disarm Alarm (Enter PIN)</span>
                </button>

                <button
                  onClick={() => {
                    setShowPanicModal(false);
                    setIsEndingJourneyWithPin(true);
                    setShowDuressModal(true);
                  }}
                  className="text-xs font-extrabold text-emerald-300 hover:text-emerald-200 transition-all cursor-pointer flex items-center gap-1.5 font-display bg-emerald-950/70 hover:bg-emerald-900/80 px-3.5 py-2.5 rounded-xl border border-emerald-500/40 shadow-xs"
                >
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>End Journey Safely (PIN Required)</span>
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* HIGH-TECH 10-SECOND ACCIDENTAL PANIC GRACE PERIOD COUNTDOWN MODAL */}
      {showGraceModal && createPortal(
        <div className="fixed inset-0 z-[10000] bg-slate-950/85 backdrop-blur-xl flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-gradient-to-b from-slate-900 via-slate-900/95 to-slate-950 border border-amber-500/40 rounded-3xl p-7 text-center space-y-6 shadow-[0_0_60px_rgba(245,158,11,0.2)] text-white animate-in zoom-in-95 duration-300 relative overflow-hidden">
            {/* Ambient Top Glow Halo */}
            <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-64 h-64 bg-amber-500/15 rounded-full blur-3xl pointer-events-none" />

            {/* Top Status Pill */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1 bg-amber-500/15 border border-amber-500/30 rounded-full text-[11px] font-black text-amber-300 uppercase tracking-widest font-display shadow-xs">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
              <span>Safety Grace Period Active</span>
            </div>

            {/* Circular SVG Progress Ring with Sonar Pulse Effect */}
            <div className="relative w-36 h-36 mx-auto flex items-center justify-center my-2">
              {/* Outer Pulsing Sonar Ring */}
              <div className="absolute inset-0 rounded-full bg-amber-500/10 animate-ping opacity-60 pointer-events-none" />
              <div className="absolute inset-2 rounded-full border border-amber-500/20 pointer-events-none" />

              {/* SVG Ring */}
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                {/* Background Ring Track */}
                <circle
                  cx="50"
                  cy="50"
                  r="42"
                  className="text-slate-800"
                  strokeWidth="7"
                  stroke="currentColor"
                  fill="transparent"
                />
                {/* Progress Ring Stroke */}
                <circle
                  cx="50"
                  cy="50"
                  r="42"
                  stroke="url(#amber-gradient)"
                  strokeWidth="7"
                  strokeLinecap="round"
                  fill="transparent"
                  strokeDasharray={263.89}
                  strokeDashoffset={263.89 * (1 - graceCountdown / 10)}
                  style={{ transition: 'stroke-dashoffset 1s linear' }}
                />
                <defs>
                  <linearGradient id="amber-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#F59E0B" />
                    <stop offset="100%" stopColor="#EF4444" />
                  </linearGradient>
                </defs>
              </svg>

              {/* Center Countdown Number Display */}
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-4xl font-black font-display tracking-tight text-transparent bg-clip-text bg-gradient-to-b from-amber-200 via-amber-400 to-rose-500 leading-none">
                  {graceCountdown}
                </span>
                <span className="text-[10px] font-extrabold text-amber-300/80 uppercase tracking-widest mt-0.5 font-display">
                  Seconds
                </span>
              </div>
            </div>

            {/* Header Text */}
            <div className="space-y-1">
              <h3 className="text-xl font-black text-white font-display tracking-tight">
                Emergency SOS Dispatching
              </h3>
              <p className="text-xs text-slate-300 font-medium leading-relaxed max-w-xs mx-auto">
                Live GPS coordinates, vehicle details, and SMS notifications will broadcast to your guardians when the timer hits zero.
              </p>
            </div>

            {/* Callout Notice Card */}
            <div className="p-3 bg-amber-500/10 border border-amber-500/25 rounded-2xl text-[11px] text-amber-200 font-semibold leading-snug flex items-center justify-center gap-2">
              <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0" />
              <span>Triggered by mistake? Tap below to abort immediately.</span>
            </div>

            {/* Action Buttons */}
            <div className="space-y-2.5 pt-1">
              <button
                onClick={handleCancelGracePeriod}
                className="w-full py-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black rounded-2xl text-xs transition-all shadow-lg shadow-emerald-950/50 active:scale-95 cursor-pointer font-display uppercase tracking-wider flex items-center justify-center gap-2 text-sm"
              >
                <CheckCircle2 className="w-5 h-5 text-emerald-200" />
                <span>Cancel False Alarm (I'm Safe)</span>
              </button>

              <button
                onClick={() => {
                  setShowGraceModal(false);
                  executePanicTrigger(false);
                }}
                className="w-full py-2.5 bg-slate-800/80 hover:bg-rose-950/60 text-slate-400 hover:text-rose-300 font-extrabold rounded-xl text-[11px] transition-all cursor-pointer font-display border border-slate-700/50 flex items-center justify-center gap-1.5"
              >
                <Siren className="w-3.5 h-3.5" />
                <span>Skip Timer & Trigger Alarm Now ({graceCountdown}s)</span>
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* DUAL-PIN SILENT DURESS DEACTIVATION MODAL */}
      <DuressPinModal
        isOpen={showDuressModal}
        onClose={() => setShowDuressModal(false)}
        onDeactivate={handleDuressDeactivate}
        correctPin={user?.duressPin || '9999'}
      />
    </div>
  );
};

export default OngoingJourneyMap;
