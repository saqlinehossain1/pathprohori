import React, { useState, useEffect, useRef, useContext, Component } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import { AuthContext } from '../context/AuthContext';
import { useIncidents } from '../hooks/useIncidents';
import IncidentCard from '../components/incidents/IncidentCard';
import IncidentFilterBar from '../components/incidents/IncidentFilterBar';
import NewIncidentModal from '../components/incidents/NewIncidentModal';
import EditIncidentModal from '../components/incidents/EditIncidentModal';
import AdminPdfExportModal from '../components/admin/AdminPdfExportModal';
import { exportLawEnforcementPDF } from '../services/lawEnforcementPdfService';
import Button from '../components/common/Button';
import LoadingSpinner from '../components/common/LoadingSpinner';
import Card from '../components/common/Card';
import { ShieldAlert, Plus, MapPin, Radio, LocateFixed, Pin, Navigation, MessageSquare, AlertTriangle, RefreshCw, FileText, Info, Lightbulb, Maximize2, Minimize2, X } from 'lucide-react';

// Error Boundary for page level safety
class FeedErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('[LiveDangerFeed ErrorBoundary]', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-8 bg-white border border-[#E0D5DC] rounded-3xl text-center space-y-4 max-w-xl mx-auto my-12 shadow-card">
          <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-black text-[#2D2329]">Live Danger Feed Encountered an Issue</h2>
          <p className="text-xs text-[#8C7A87] font-medium leading-relaxed">
            {this.state.error?.message || 'An error occurred while loading the live heatmap map interface.'}
          </p>
          <button
            onClick={() => {
              this.setState({ hasError: false, error: null });
              window.location.reload();
            }}
            className="px-5 py-2.5 bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-500 hover:to-rose-700 text-white font-extrabold text-xs rounded-2xl transition-all flex items-center justify-center gap-2 mx-auto shadow-md shadow-rose-950/20 cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Reload Danger Feed Page</span>
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

// Custom Colored Map Pin Icons for Different Hazard Types / Severities
const createCustomIcon = (severity = '', title = '') => {
  const sevStr = String(severity || '');
  const isHigh = sevStr.includes('High');
  const isMed = sevStr.includes('Med');

  const bgGradient = isHigh
    ? 'linear-gradient(135deg, #EF4444, #DC2626)'
    : isMed
    ? 'linear-gradient(135deg, #F59E0B, #D97706)'
    : 'linear-gradient(135deg, #8B5CF6, #6D28D9)';

  const ringAnimation = isHigh
    ? `<div style="position: absolute; inset: -4px; border-radius: 50%; background: rgba(239, 68, 68, 0.4); animation: ping 1.8s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>`
    : '';

  const svgIcon = isHigh
    ? `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><line x1="12" y1="8" x2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`
    : isMed
    ? `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`
    : `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5"/><path d="M9 18h6"/><path d="M10 22h4"/></svg>`;

  return L.divIcon({
    className: 'custom-hazard-pin',
    html: `<div style="position: relative; width: 32px; height: 32px;">
            ${ringAnimation}
            <div style="position: relative; width: 32px; height: 32px; background: ${bgGradient}; border-radius: 50%; border: 3px solid white; box-shadow: 0 4px 12px rgba(0,0,0,0.35); display: flex; align-items: center; justify-content: center;">
              ${svgIcon}
            </div>
          </div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  });
};

// Dynamic Gender & Profile Avatar Marker Icon for User's Live GPS Location
const createUserLocationIcon = (gender = 'female', avatarUrl = '') => {
  const g = String(gender || 'female').toLowerCase();

  // Color theme tailored by gender identification
  const borderColor = g === 'female' ? '#EC4899' : g === 'male' ? '#2563EB' : '#8B5CF6';
  const pulseColor = g === 'female' ? 'rgba(236, 72, 153, 0.45)' : g === 'male' ? 'rgba(37, 99, 235, 0.45)' : 'rgba(139, 92, 246, 0.45)';
  const bgColor = g === 'female' ? '#FDF2F8' : g === 'male' ? '#EFF6FF' : '#F5F3FF';
  const iconColor = g === 'female' ? '#DB2777' : g === 'male' ? '#1D4ED8' : '#7C3AED';

  // Vector profile icons for Female / Male / Neutral gender identification
  const femaleSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="${iconColor}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2a5 5 0 0 1 5 5c0 2.22-1.45 4.1-3.5 4.75V15h2a1 1 0 0 1 0 2h-2v4a1 1 0 0 1-2 0v-4H9.5a1 1 0 0 1 0-2h2v-3.25C9.45 11.1 8 9.22 8 7a5 5 0 0 1 5-5z"/></svg>`;
  const maleSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="${iconColor}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 3h5v5"/><path d="m21 3-6.75 6.75"/><circle cx="10" cy="14" r="6"/></svg>`;
  const defaultSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="${iconColor}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`;

  const profileContent = avatarUrl
    ? `<img src="${avatarUrl}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%;" />`
    : (g === 'female' ? femaleSvg : g === 'male' ? maleSvg : defaultSvg);

  return L.divIcon({
    className: 'user-location-pin',
    html: `<div style="position: relative; width: 36px; height: 36px;">
            <div style="position: absolute; inset: -5px; border-radius: 50%; background-color: ${pulseColor}; animation: ping 1.8s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
            <div style="position: relative; width: 36px; height: 36px; background-color: ${bgColor}; border: 3px solid ${borderColor}; border-radius: 50%; box-shadow: 0 4px 14px rgba(0,0,0,0.38); display: flex; align-items: center; justify-content: center; overflow: hidden;">
              ${profileContent}
            </div>
          </div>`,
    iconSize: [36, 36],
    iconAnchor: [18, 18],
  });
};

// Custom Orange Icon for Manually Selected Map Spot Pin
const createSelectedSpotIcon = () => {
  return L.divIcon({
    className: 'selected-spot-pin',
    html: `<div style="background-color: #F59E0B; width: 32px; height: 32px; border-radius: 50%; border: 3.5px solid white; box-shadow: 0 4px 12px rgba(245,158,11,0.6); display: flex; align-items: center; justify-content: center; animation: bounce 1s infinite;">
            <div style="width: 10px; height: 10px; background-color: white; border-radius: 50%;"></div>
          </div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  });
};

// Map click listener to drop new hazard pins
const MapClickHandler = ({ onMapClick }) => {
  useMapEvents({
    click(e) {
      if (e && e.latlng) {
        onMapClick(e.latlng);
      }
    },
  });
  return null;
};

// Helper component to smoothly re-center Leaflet map view when primitive lat/lng changes
const RecenterMap = ({ lat, lng }) => {
  const map = useMap();
  const hasCentered = useRef(false);

  useEffect(() => {
    if (map && typeof lat === 'number' && typeof lng === 'number' && !isNaN(lat) && !isNaN(lng) && !hasCentered.current) {
      try {
        map.setView([lat, lng], 14, { animate: true });
        hasCentered.current = true;
      } catch (err) {
        console.warn('[RecenterMap View Error]', err);
      }
    }
  }, [lat, lng, map]);

  return null;
};

// Helper component to recalculate Leaflet map tile dimensions when tab visibility or container size changes
const MapInvalidateSize = ({ isVisible }) => {
  const map = useMap();

  useEffect(() => {
    if (map) {
      const timer1 = setTimeout(() => {
        try {
          map.invalidateSize();
        } catch (err) {
          console.warn('[MapInvalidateSize Error]', err);
        }
      }, 100);

      const timer2 = setTimeout(() => {
        try {
          map.invalidateSize();
        } catch (err) {
          console.warn('[MapInvalidateSize Error]', err);
        }
      }, 400);

      return () => {
        clearTimeout(timer1);
        clearTimeout(timer2);
      };
    }
  }, [map, isVisible]);

  return null;
};

// Floating Leaflet control overlay (My Location & Expand Map buttons)
const MapControlsOverlay = ({ onRequestLocation, isLocating, onExpand, isExpanded, selectedCoords, onReportHere }) => {
  const map = useMap();
  const containerRef = useRef(null);

  useEffect(() => {
    if (containerRef.current && L.DomEvent) {
      L.DomEvent.disableClickPropagation(containerRef.current);
      L.DomEvent.disableScrollPropagation(containerRef.current);
    }
  }, []);

  const handleLocate = (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (onRequestLocation) {
      onRequestLocation((lat, lng) => {
        if (map && typeof lat === 'number' && typeof lng === 'number' && !isNaN(lat) && !isNaN(lng)) {
          try {
            map.setView([lat, lng], 15, { animate: true });
          } catch (err) {
            console.warn('[MapControlsOverlay Error]', err);
          }
        }
      });
    }
  };

  const handleExpandToggle = (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (onExpand) {
      onExpand();
    }
  };

  return (
    <>
      {/* Map Location Recenter & Expand Overlay Controls - Placed Top Right to avoid Leaflet zoom button collision */}
      <div ref={containerRef} className="absolute top-3 right-3 z-[400] pointer-events-auto flex items-center gap-2">
        <button
          type="button"
          onClick={handleLocate}
          disabled={isLocating}
          title="Recenter map to my live GPS location & request permission"
          className="bg-white/95 hover:bg-white text-slate-900 border border-slate-200/90 px-3.5 py-1.5 rounded-2xl shadow-lg flex items-center gap-1.5 text-xs font-bold transition-all active:scale-95 cursor-pointer backdrop-blur-md"
        >
          <LocateFixed className={`w-3.5 h-3.5 text-rose-600 ${isLocating ? 'animate-spin' : ''}`} />
          <span className="text-[11px] font-extrabold text-slate-900 font-display">My Location</span>
        </button>

        <button
          type="button"
          onClick={handleExpandToggle}
          title={isExpanded ? 'Minimize Map' : 'Expand Map Fullscreen'}
          className="bg-slate-900/90 hover:bg-slate-900 text-white border border-slate-800 px-3.5 py-1.5 rounded-2xl shadow-lg flex items-center gap-1.5 text-xs font-bold transition-all active:scale-95 cursor-pointer backdrop-blur-md font-display"
        >
          {isExpanded ? (
            <>
              <Minimize2 className="w-3.5 h-3.5 text-rose-400" />
              <span className="text-[11px] font-extrabold">Minimize</span>
            </>
          ) : (
            <>
              <Maximize2 className="w-3.5 h-3.5 text-rose-400" />
              <span className="text-[11px] font-extrabold">Fullscreen Map</span>
            </>
          )}
        </button>
      </div>

      {/* Selected Location Banner Notification - Placed Bottom Left */}
      {selectedCoords && (
        <div className="absolute bottom-4 left-4 z-[400] pointer-events-auto bg-slate-900/95 text-white p-3 rounded-2xl border border-slate-800 shadow-2xl flex items-center justify-between gap-3 text-xs max-w-sm backdrop-blur-md font-display">
          <div className="flex items-center gap-2 min-w-0">
            <MapPin className="w-4 h-4 text-rose-500 shrink-0" />
            <span className="truncate">
              Spot Selected: [{selectedCoords.lat.toFixed(4)}, {selectedCoords.lng.toFixed(4)}]
            </span>
          </div>

          <button
            onClick={() => {
              if (onReportHere) onReportHere();
            }}
            className="px-3 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-[11px] font-black shrink-0 transition-all cursor-pointer shadow-sm"
          >
            Report Here
          </button>
        </div>
      )}
    </>
  );
};

const LiveDangerFeedContent = () => {
  const { user } = useContext(AuthContext);
  const {
    incidents = [],
    loading,
    searchQuery,
    setSearchQuery,
    activeFilter,
    setActiveFilter,
    handleVote,
    createIncident,
    updateIncident,
    deleteIncident,
    userLocation,
    isLocationLoading,
    requestLocation,
  } = useIncidents();

  const [showReportModal, setShowReportModal] = useState(false);
  const [showAdminPdfModal, setShowAdminPdfModal] = useState(false);
  const [editingIncident, setEditingIncident] = useState(null);
  const [selectedCoords, setSelectedCoords] = useState(null);
  const [mobileTab, setMobileTab] = useState('feed'); // 'feed' | 'map'
  const [isExpandedMap, setIsExpandedMap] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isExpandedMap) {
        setIsExpandedMap(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isExpandedMap]);

  const defaultLat = typeof userLocation?.lat === 'number' && !isNaN(userLocation.lat) ? userLocation.lat : 23.8103;
  const defaultLng = typeof userLocation?.lng === 'number' && !isNaN(userLocation.lng) ? userLocation.lng : 90.4125;

  // Calculate live dynamic distance from user GPS to any hazard coordinates
  const calculateLiveDistanceText = (incLat, incLng) => {
    if (!userLocation?.lat || !userLocation?.lng || typeof incLat !== 'number' || typeof incLng !== 'number') return '0.8 km';
    const R = 6371; // Radius of earth in km
    const dLat = ((incLat - userLocation.lat) * Math.PI) / 180;
    const dLon = ((incLng - userLocation.lng) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((userLocation.lat * Math.PI) / 180) *
        Math.cos((incLat * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const dist = R * c;
    return dist < 1 ? `${Math.round(dist * 1000)} m` : `${(Math.round(dist * 10) / 10).toFixed(1)} km`;
  };

  const handleMapPinDrop = (latlng) => {
    if (latlng && latlng.lat && latlng.lng) {
      setSelectedCoords({ lat: latlng.lat, lng: latlng.lng });
      setShowReportModal(true);
    }
  };

  if ((loading || isLocationLoading) && incidents.length === 0) {
    return <LoadingSpinner label="Fetching your real-time GPS location & nearby danger feed..." />;
  }

  const isAdminOrOperator = ['admin', 'operator'].includes(user?.role);

  return (
    <div className="space-y-4 sm:space-y-6 h-full pb-16 lg:pb-0">
      {/* Clean Text Page Header */}
      {/* Operations Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200/80">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-rose-50 text-rose-700 rounded-md text-[11px] font-bold mb-1.5 border border-rose-200 shadow-2xs">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-600 animate-ping" />
            <span>Real-Time Danger Feed</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight font-display">
            Hazard Incident Feed & Live Map
          </h1>
          <p className="text-xs text-slate-500 mt-1 font-medium leading-relaxed max-w-2xl">
            Hyperlocal crowdsourced hazards, street reports, and verified safety telemetry.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {isAdminOrOperator && (
            <button
              onClick={() => setShowAdminPdfModal(true)}
              className="border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 font-bold flex items-center gap-1.5 shadow-2xs text-xs py-2.5 px-3.5 rounded-xl transition-all active:scale-[0.98] cursor-pointer"
            >
              <FileText className="w-4 h-4 text-slate-600" />
              <span>Law Enforcement PDF</span>
            </button>
          )}

          <button
            onClick={() => {
              setSelectedCoords(null);
              setShowReportModal(true);
            }}
            className="bg-rose-600 hover:bg-rose-700 text-white font-bold flex items-center gap-1.5 shadow-xs hover:shadow-rose-600/30 text-xs py-2.5 px-4 rounded-xl transition-all active:scale-[0.98] cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Report Hazard</span>
          </button>
        </div>
      </div>

      {/* Mobile Segmented View Switcher (Feed List vs Interactive Map) */}
      <div className="flex items-center p-1 bg-white border border-slate-200/90 rounded-xl shadow-2xs lg:hidden">
        <button
          type="button"
          onClick={() => setMobileTab('feed')}
          className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 ${
            mobileTab === 'feed'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          <Radio className="w-3.5 h-3.5" />
          <span>Feed List ({incidents.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setMobileTab('map')}
          className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 ${
            mobileTab === 'map'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          <MapPin className="w-3.5 h-3.5" />
          <span>Safety Map ({incidents.length} Pins)</span>
        </button>
      </div>

      {/* Main Grid: Feed List (Left 7 Cols) + Interactive Heatmap (Right 5 Cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-[450px] lg:h-[calc(100vh-140px)]">
        {/* Left Column: Filter & Incident Feed List */}
        <div className={`lg:col-span-7 space-y-4 overflow-y-auto pr-0 lg:pr-2 custom-scrollbar ${
          mobileTab === 'feed' ? 'block' : 'hidden lg:block'
        }`}>
          <IncidentFilterBar
            searchQuery={searchQuery || ''}
            onSearchChange={setSearchQuery}
            activeFilter={activeFilter || 'All'}
            onFilterChange={setActiveFilter}
          />

          <div className="space-y-4 pb-32 lg:pb-6">
            {isLocationLoading ? (
              <Card className="text-center py-16 space-y-3 border-[#E0D5DC] shadow-xs">
                <LoadingSpinner label="Fetching real-time GPS & calculating hazard distances..." />
                <p className="text-xs font-semibold text-[#8C7A87]">
                  Please wait while we determine your exact location to sort dangers by proximity.
                </p>
              </Card>
            ) : incidents.length === 0 ? (
              <Card className="text-center py-12 border-slate-200/80 shadow-card">
                <Radio className="w-10 h-10 text-slate-400 mx-auto mb-2 opacity-50" />
                <p className="text-sm font-bold text-slate-900 font-display">No matching incidents found.</p>
                <p className="text-xs text-slate-500 mt-1">
                  Try adjusting your search query or safety filters.
                </p>
              </Card>
            ) : (
              incidents.map((incident) => (
                <IncidentCard
                  key={incident._id}
                  incident={incident}
                  onVote={handleVote}
                  onEdit={(inc) => setEditingIncident(inc)}
                  onDelete={deleteIncident}
                />
              ))
            )}
          </div>
        </div>

        {/* Right Column: Interactive Leaflet Danger Map */}
        <div className={`lg:col-span-5 h-[calc(100vh-280px)] min-h-[420px] lg:h-full ${
          mobileTab === 'map' ? 'block' : 'hidden lg:block'
        }`}>
          <div className="bg-white border border-slate-200/90 rounded-2xl h-full flex flex-col overflow-hidden shadow-soft">
            <div className="px-4 py-3 bg-white/90 border-b border-slate-200/80 flex items-center justify-between gap-2 backdrop-blur-xs">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span className="text-xs font-bold text-slate-900 tracking-tight font-display">
                  Safety Incident Telemetry Map
                </span>
              </div>

              <span className="px-2.5 py-1 rounded-md text-[11px] font-bold bg-slate-100/90 text-slate-700 border border-slate-200 shadow-2xs font-display">
                {incidents.length} Active Pins
              </span>
            </div>

            <div className="flex-1 w-full overflow-hidden relative z-10">
              {isLocationLoading ? (
                <div className="w-full h-full flex flex-col items-center justify-center bg-[#F9F8FA] p-8 text-center space-y-3">
                  <LoadingSpinner label="Fetching your real-time GPS location..." />
                  <p className="text-xs font-semibold text-[#8C7A87]">
                    Please allow location permission in your browser to center map on your position.
                  </p>
                </div>
              ) : (
                <MapContainer
                  key={`leaflet-map-${defaultLat.toFixed(3)}-${defaultLng.toFixed(3)}`}
                  center={[defaultLat, defaultLng]}
                  zoom={14}
                  scrollWheelZoom={false}
                  style={{ height: '100%', width: '100%' }}
                >
                  <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
                    url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
                  />
                  <MapClickHandler onMapClick={handleMapPinDrop} />
                  <RecenterMap lat={defaultLat} lng={defaultLng} />
                  <MapInvalidateSize isVisible={mobileTab === 'map'} />
                  <MapControlsOverlay onRequestLocation={requestLocation} isLocating={isLocationLoading} onExpand={() => setIsExpandedMap(true)} isExpanded={false} selectedCoords={selectedCoords} onReportHere={() => setShowReportModal(true)} />

                  {/* User Live GPS Marker */}
                  <Marker position={[defaultLat, defaultLng]} icon={createUserLocationIcon(user?.gender, user?.avatarUrl)}>
                    <Popup className="custom-leaflet-popup">
                      <div className="p-3 space-y-1 text-xs font-extrabold text-[#2D2329]">
                        <div className="flex items-center gap-1.5 text-blue-700 font-extrabold border-b border-blue-100 pb-1.5">
                          <LocateFixed className="w-4 h-4 text-blue-600" />
                          <span>Your Live GPS Position</span>
                        </div>
                        <p className="text-[10px] text-gray-500 font-semibold pt-1">
                          [{defaultLat.toFixed(4)}, {defaultLng.toFixed(4)}]
                        </p>
                      </div>
                    </Popup>
                  </Marker>

                  {/* Manually Selected Spot Marker */}
                  {selectedCoords && typeof selectedCoords.lat === 'number' && typeof selectedCoords.lng === 'number' && (
                    <Marker position={[selectedCoords.lat, selectedCoords.lng]} icon={createSelectedSpotIcon()}>
                      <Popup className="custom-leaflet-popup">
                        <div className="p-3 space-y-1 text-xs font-extrabold text-[#2D2329]">
                          <div className="flex items-center gap-1.5 text-amber-700 font-extrabold border-b border-amber-100 pb-1.5">
                            <Pin className="w-4 h-4 text-amber-600" />
                            <span>Selected Area for Report</span>
                          </div>
                          <p className="text-[10px] text-gray-500 font-semibold pt-1">
                            [{selectedCoords.lat.toFixed(4)}, {selectedCoords.lng.toFixed(4)}]
                          </p>
                        </div>
                      </Popup>
                    </Marker>
                  )}

                  {/* Render active incident pins with distinct colors & glassmorphic popups */}
                  {incidents.map((inc) => {
                    if (!inc || !inc._id) return null;
                    const coords = inc.location?.coordinates;
                    if (!coords || !Array.isArray(coords) || coords.length < 2) return null;
                    const lat = coords[1];
                    const lng = coords[0];
                    if (typeof lat !== 'number' || typeof lng !== 'number' || isNaN(lat) || isNaN(lng)) return null;

                    const liveDistText = calculateLiveDistanceText(lat, lng);
                    const sevStr = String(inc.severity || 'Med Severity');
                    const isHighSev = sevStr.includes('High');
                    const isMedSev = sevStr.includes('Med');

                    return (
                      <Marker
                        key={inc._id}
                        position={[lat, lng]}
                        icon={createCustomIcon(sevStr, inc.title)}
                      >
                        <Popup className="custom-leaflet-popup">
                          <div className="p-3.5 space-y-2 text-slate-900">
                            <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${
                                isHighSev
                                  ? 'bg-rose-100 text-rose-700'
                                  : isMedSev
                                  ? 'bg-amber-100 text-amber-700'
                                  : 'bg-indigo-100 text-indigo-700'
                              }`}>
                                {sevStr}
                              </span>

                              {inc.isVerified && (
                                <span className="text-[10px] font-extrabold text-sky-600 flex items-center gap-0.5">
                                  ✓ Verified
                                </span>
                              )}
                            </div>

                            <div>
                              <h4 className="font-extrabold text-xs text-slate-900 leading-tight font-display">
                                {inc.title}
                              </h4>
                              <p className="text-[10px] text-slate-500 font-bold mt-1 flex items-center gap-1">
                                <MapPin className="w-3 h-3 text-rose-600" />
                                {inc.locationName}
                              </p>
                            </div>

                            <div className="p-2 rounded-xl bg-rose-50/80 border border-rose-100 flex items-center justify-between text-[10px] font-extrabold text-rose-700">
                              <span className="flex items-center gap-1">
                                <Navigation className="w-3 h-3 text-rose-600" />
                                {liveDistText} away from your live GPS
                              </span>
                            </div>

                            {inc.description && (
                              <p className="text-[11px] text-slate-600 font-medium line-clamp-2 leading-relaxed">
                                {inc.description}
                              </p>
                            )}

                            <Link
                              to={`/incident/${inc._id}`}
                              className="popup-btn flex items-center justify-center gap-1.5 w-full py-2 bg-slate-900 text-white rounded-xl text-[11px] font-extrabold text-center hover:bg-slate-800 transition-all shadow-sm mt-2 cursor-pointer border border-slate-800 font-display"
                            >
                              <MessageSquare className="w-3.5 h-3.5 text-rose-400" />
                              <span className="text-white font-extrabold">Open Discussion ({inc.comments?.length || 0})</span>
                            </Link>
                          </div>
                        </Popup>
                      </Marker>
                    );
                  })}
                </MapContainer>
              )}
            </div>

            {/* Map Pin Icon Legend Footer */}
            <div className="px-3.5 py-2.5 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2 text-[10px] font-extrabold text-slate-800 rounded-b-2xl">
              <span className="text-slate-500 uppercase tracking-wider text-[9px] font-black flex items-center gap-1 font-display">
                <Info className="w-3 h-3 text-rose-600" /> Pin Legend:
              </span>

              <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                <div className="flex items-center gap-1.5 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200 text-rose-700">
                  <div className="w-3.5 h-3.5 rounded-full bg-rose-600 text-white flex items-center justify-center shadow-xs">
                    <span className="text-[9px]">!</span>
                  </div>
                  <span>High Alert</span>
                </div>

                <div className="flex items-center gap-1.5 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200 text-amber-700">
                  <div className="w-3.5 h-3.5 rounded-full bg-amber-500 text-white flex items-center justify-center shadow-xs">
                    <AlertTriangle className="w-2.5 h-2.5 text-white" />
                  </div>
                  <span>Med Severity (Caution)</span>
                </div>

                <div className="flex items-center gap-1.5 bg-purple-50 px-2 py-0.5 rounded-full border border-purple-200 text-purple-700">
                  <div className="w-3.5 h-3.5 rounded-full bg-purple-600 text-white flex items-center justify-center shadow-xs">
                    <Lightbulb className="w-2.5 h-2.5 text-white" />
                  </div>
                  <span>Low Severity (Notice)</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Floating Action Button for Mobile Users */}
      <div className="fixed bottom-20 right-4 lg:hidden z-40">
        <button
          type="button"
          onClick={() => {
            setSelectedCoords(null);
            setShowReportModal(true);
          }}
          className="p-3.5 bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-500 hover:to-rose-700 text-white rounded-full shadow-2xl active:scale-95 transition-all flex items-center gap-2 font-extrabold text-xs border-2 border-white cursor-pointer font-display"
          title="Report Street Hazard"
        >
          <Plus className="w-5 h-5 text-white" />
          <span className="pr-1">Report Hazard</span>
        </button>
      </div>

      {/* New Incident Report Modal */}
      <NewIncidentModal
        isOpen={showReportModal}
        onClose={() => {
          setShowReportModal(false);
          setSelectedCoords(null);
        }}
        onSubmit={createIncident}
        selectedCoords={selectedCoords}
        userLocation={userLocation}
      />

      {/* Edit Incident Modal */}
      <EditIncidentModal
        isOpen={Boolean(editingIncident)}
        onClose={() => setEditingIncident(null)}
        onSubmit={updateIncident}
        incident={editingIncident}
      />

      {/* Admin Law Enforcement PDF Export Modal */}
      <AdminPdfExportModal
        isOpen={showAdminPdfModal}
        onClose={() => setShowAdminPdfModal(false)}
        onExport={({ incidents: filteredList, options }) => {
          exportLawEnforcementPDF({
            incidents: filteredList,
            generatedBy: user || { name: 'Platform Administrator', role: 'admin' },
            filterArea: options?.selectedArea || 'All Neighborhoods',
          });
        }}
        allIncidents={incidents}
      />
      {/* Fullscreen Map Modal via React Portal to blur complete page */}
      {isExpandedMap &&
        createPortal(
          <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-md p-2 sm:p-6 flex items-center justify-center animate-in fade-in duration-300">
            <div className="w-full h-full max-w-7xl max-h-[96vh] bg-white rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-[#E0D5DC] animate-in zoom-in-95 duration-300 relative">
              {/* Header Bar */}
              <div className="px-4 py-3 bg-white border-b border-[#EFEAEF] flex items-center justify-between gap-3 shadow-xs">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse flex-shrink-0"></span>
                  <h3 className="text-sm sm:text-base font-extrabold text-[#2D2329] tracking-tight truncate">
                    Live Safety Map (Expanded View)
                  </h3>
                  <span className="px-2.5 py-0.5 rounded-full bg-rose-50 border border-rose-200 text-[10px] sm:text-[11px] font-extrabold text-rose-700 whitespace-nowrap hidden sm:inline-block">
                    {incidents.length} Active Pins
                  </span>
                </div>

                {/* Quick Legend Pills in Header */}
                <div className="flex items-center gap-2 text-[10px] font-extrabold">
                  <span className="px-2 py-0.5 rounded-full bg-rose-50 border border-rose-200 text-rose-700 flex items-center gap-1">
                    <ShieldAlert className="w-3 h-3 text-rose-600" /> High Alert
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-amber-700 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3 text-amber-600" /> Med Severity
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-purple-50 border border-purple-200 text-purple-700 flex items-center gap-1">
                    <Lightbulb className="w-3 h-3 text-purple-600" /> Low Severity
                  </span>
                </div>
              </div>

              {/* Expanded Map Canvas */}
              <div className="flex-1 w-full relative z-10">
                <MapContainer
                  key={`leaflet-expanded-map-${defaultLat.toFixed(3)}-${defaultLng.toFixed(3)}`}
                  center={[defaultLat, defaultLng]}
                  zoom={14}
                  scrollWheelZoom={true}
                  style={{ height: '100%', width: '100%' }}
                >
                  <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
                    url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
                  />
                  <MapClickHandler onMapClick={handleMapPinDrop} />
                  <RecenterMap lat={defaultLat} lng={defaultLng} />
                  <MapInvalidateSize isVisible={isExpandedMap} />
                  <MapControlsOverlay onRequestLocation={requestLocation} isLocating={isLocationLoading} onExpand={() => setIsExpandedMap(false)} isExpanded={true} selectedCoords={selectedCoords} onReportHere={() => setShowReportModal(true)} />

                  {/* User Live GPS Marker */}
                  <Marker position={[defaultLat, defaultLng]} icon={createUserLocationIcon(user?.gender, user?.avatarUrl)}>
                    <Popup className="custom-leaflet-popup">
                      <div className="p-3 space-y-1 text-xs font-extrabold text-[#2D2329]">
                        <div className="flex items-center gap-1.5 text-blue-700 font-extrabold border-b border-blue-100 pb-1.5">
                          <LocateFixed className="w-4 h-4 text-blue-600" />
                          <span>Your Live GPS Position</span>
                        </div>
                        <p className="text-[10px] text-gray-500 font-semibold pt-1">
                          [{defaultLat.toFixed(4)}, {defaultLng.toFixed(4)}]
                        </p>
                      </div>
                    </Popup>
                  </Marker>

                  {/* Manually Selected Spot Marker */}
                  {selectedCoords && typeof selectedCoords.lat === 'number' && typeof selectedCoords.lng === 'number' && (
                    <Marker position={[selectedCoords.lat, selectedCoords.lng]} icon={createSelectedSpotIcon()}>
                      <Popup className="custom-leaflet-popup">
                        <div className="p-3 space-y-1 text-xs font-extrabold text-[#2D2329]">
                          <div className="flex items-center gap-1.5 text-amber-700 font-extrabold border-b border-amber-100 pb-1.5">
                            <Pin className="w-4 h-4 text-amber-600" />
                            <span>Selected Area for Report</span>
                          </div>
                          <p className="text-[10px] text-gray-500 font-semibold pt-1">
                            [{selectedCoords.lat.toFixed(4)}, {selectedCoords.lng.toFixed(4)}]
                          </p>
                        </div>
                      </Popup>
                    </Marker>
                  )}

                  {/* Render active incident pins */}
                  {incidents.map((inc) => {
                    if (!inc || !inc._id) return null;
                    const coords = inc.location?.coordinates;
                    if (!coords || !Array.isArray(coords) || coords.length < 2) return null;
                    const lat = coords[1];
                    const lng = coords[0];
                    if (typeof lat !== 'number' || typeof lng !== 'number' || isNaN(lat) || isNaN(lng)) return null;

                    const liveDistText = calculateLiveDistanceText(lat, lng);
                    const sevStr = String(inc.severity || 'Med Severity');
                    const isHighSev = sevStr.includes('High');
                    const isMedSev = sevStr.includes('Med');

                    return (
                      <Marker
                        key={inc._id}
                        position={[lat, lng]}
                        icon={createCustomIcon(sevStr, inc.title)}
                      >
                        <Popup className="custom-leaflet-popup">
                          <div className="p-3.5 space-y-2 text-[#2D2329]">
                            <div className="flex items-center justify-between gap-2 border-b border-[#F0EBF0] pb-2">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${
                                isHighSev
                                  ? 'bg-rose-500/15 text-rose-700 border border-rose-500/30'
                                  : isMedSev
                                  ? 'bg-amber-500/15 text-amber-700 border border-amber-500/30'
                                  : 'bg-indigo-500/15 text-indigo-700 border border-indigo-500/30'
                              }`}>
                                {sevStr}
                              </span>

                              {inc.isVerified && (
                                <span className="text-[10px] font-extrabold text-sky-600 flex items-center gap-0.5">
                                  ✓ Verified
                                </span>
                              )}
                            </div>

                            <div>
                              <h4 className="font-extrabold text-xs text-slate-900 leading-tight font-display">
                                {inc.title}
                              </h4>
                              <p className="text-[10px] text-slate-500 font-bold mt-1 flex items-center gap-1">
                                <MapPin className="w-3 h-3 text-rose-600" />
                                {inc.locationName}
                              </p>
                            </div>

                            <div className="p-2 rounded-xl bg-rose-50/80 border border-rose-100 flex items-center justify-between text-[10px] font-extrabold text-rose-700">
                              <span className="flex items-center gap-1">
                                <Navigation className="w-3 h-3 text-rose-600" />
                                {liveDistText} away from your live GPS
                              </span>
                            </div>

                            {inc.description && (
                              <p className="text-[11px] text-slate-600 font-medium line-clamp-2 leading-relaxed">
                                {inc.description}
                              </p>
                            )}

                            <Link
                              to={`/incident/${inc._id}`}
                              className="popup-btn flex items-center justify-center gap-1.5 w-full py-2 bg-slate-900 text-white rounded-xl text-[11px] font-extrabold text-center hover:bg-slate-800 transition-all shadow-sm mt-2 cursor-pointer border border-slate-800 font-display"
                            >
                              <MessageSquare className="w-3.5 h-3.5 text-rose-400" />
                              <span className="text-white font-extrabold">Open Discussion ({inc.comments?.length || 0})</span>
                            </Link>
                          </div>
                        </Popup>
                      </Marker>
                    );
                  })}
                </MapContainer>
              </div>

              {/* Map Legend Footer inside Modal */}
              <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2 text-[10px] font-extrabold text-slate-800">
                <span className="text-slate-500 uppercase tracking-wider text-[9px] font-black flex items-center gap-1 font-display">
                  <Info className="w-3 h-3 text-rose-600" /> Interactive Danger Map • Tap anywhere on map to drop hazard report pin
                </span>
                <span className="text-[10px] text-slate-400 font-bold">Press ESC to exit fullscreen</span>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
};

export const LiveDangerFeed = () => (
  <FeedErrorBoundary>
    <LiveDangerFeedContent />
  </FeedErrorBoundary>
);

export default LiveDangerFeed;
