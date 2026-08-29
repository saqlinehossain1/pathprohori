import React, { useState, useEffect, useContext } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import API from '../api/axiosConfig';
import { SocketContext } from '../context/SocketContext';
import { AuthContext } from '../context/AuthContext';
import {
    ShieldAlert,
    Bell,
    MapPin,
    Navigation,
    Car,
    User,
    Clock,
    ArrowRight,
    ExternalLink,
    Filter,
    CheckCircle2,
    Radio,
    Compass,
    AlertTriangle,
    RefreshCw,
    Shield,
    FileText,
    Loader2,
} from 'lucide-react';

// Helper to format raw OSM Nominatim geocoding into a clean single location string
const formatCleanAddress = (data) => {
    if (!data) return '';
    const addr = data.address || {};
    const parts = [];

    const poi = addr.amenity || addr.building || addr.university || addr.office || addr.shop || addr.historic;
    if (poi) parts.push(poi);

    const road = addr.road || addr.street;
    if (road && !parts.includes(road)) parts.push(road);

    const area = addr.suburb || addr.neighbourhood || addr.quarter || addr.residential;
    if (area && !parts.includes(area)) parts.push(area);

    const city = addr.city || addr.town || addr.city_district;
    if (city && !parts.includes(city)) parts.push(city);

    if (parts.length >= 2) return parts.join(', ');

    if (data.display_name) {
        const segments = data.display_name.split(',').map((s) => s.trim());
        const cleaned = segments.filter(
            (s) =>
                !/^\d{4,5}$/.test(s) &&
                s !== 'Bangladesh' &&
                !s.includes('District') &&
                !s.includes('Division') &&
                !s.includes('Metropolitan')
        );
        return cleaned.slice(0, 4).join(', ');
    }

    return '';
};

// Create custom emergency Leaflet marker icon
const createEmergencyMarkerIcon = () => {
    return L.divIcon({
        className: 'custom-emergency-leaflet-marker',
        html: `
            <div style="position: relative; width: 40px; height: 40px;">
                <div style="position: absolute; inset: -10px; border-radius: 50%; background: rgba(225, 29, 72, 0.55); animation: ping 1.2s infinite;"></div>
                <div style="position: relative; width: 40px; height: 40px; background: linear-gradient(135deg, #f43f5e, #e11d48); border-radius: 50%; border: 3px solid white; display: flex; align-items: center; justify-content: center; color: white; box-shadow: 0 6px 16px rgba(225, 29, 72, 0.6);">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
                </div>
            </div>
        `,
        iconSize: [40, 40],
        iconAnchor: [20, 40],
    });
};

const LocationDisplay = ({ location, commuterName }) => {
    const lat = location?.latitude ?? location?.lat ?? 23.773315;
    const lng = location?.longitude ?? location?.lng ?? 90.424371;
    const resolvedAddress = location?.address || 'Live GPS Coordinates Attached';
    const [showMap, setShowMap] = useState(true);

    const emergencyIcon = createEmergencyMarkerIcon();
    const googleMapsUrl = `https://www.google.com/maps?q=${lat},${lng}`;

    return (
        <div className="space-y-3 mt-4">
            {/* Location Telemetry Card */}
            <div className="bg-slate-950/80 p-4 rounded-2xl border border-slate-800/90 shadow-inner flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-1.5 text-slate-400 uppercase font-black text-[10px] tracking-wider">
                        <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                        <span>Emergency Telemetry Location</span>
                    </div>
                    <p className="text-xs font-extrabold text-rose-300 font-display leading-snug truncate">
                        {resolvedAddress}
                    </p>
                </div>
                <div className="flex items-center gap-2 shrink-0 bg-slate-900/90 px-3 py-1.5 rounded-xl border border-slate-800 self-start sm:self-auto">
                    <Compass className="w-3.5 h-3.5 text-amber-400 animate-spin" style={{ animationDuration: '6s' }} />
                    <span className="text-[11px] font-mono font-bold text-amber-400">
                        {lat.toFixed(5)}, {lng.toFixed(5)}
                    </span>
                </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center gap-2.5 pt-1">
                <button
                    onClick={() => setShowMap(!showMap)}
                    className="bg-gradient-to-r from-rose-600 via-red-600 to-rose-700 hover:from-rose-500 hover:to-red-500 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition-all duration-200 flex items-center gap-2 shadow-lg shadow-rose-950/50 active:scale-95 cursor-pointer font-display"
                >
                    <Navigation className="w-3.5 h-3.5" />
                    <span>{showMap ? 'Hide Leaflet OSM Map' : 'View Live Location Map (Leaflet OSM)'}</span>
                </button>

                <a
                    href={googleMapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-slate-800/90 hover:bg-slate-700 text-slate-200 font-bold text-xs px-3.5 py-2.5 rounded-xl transition-all duration-200 flex items-center gap-1.5 border border-slate-700/80 active:scale-95"
                >
                    <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                    <span>Google Maps Pin</span>
                </a>
            </div>

            {/* Interactive Leaflet.js & OpenStreetMap (OSM) Map Container */}
            {showMap && (
                <div className="h-64 sm:h-72 w-full rounded-2xl overflow-hidden border border-rose-500/40 shadow-2xl mt-3 relative z-10">
                    <MapContainer center={[lat, lng]} zoom={16} scrollWheelZoom={false} className="w-full h-full">
                        <TileLayer
                            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        />
                        <Marker position={[lat, lng]} icon={emergencyIcon}>
                            <Popup>
                                <div className="p-1 space-y-1">
                                    <span className="text-[10px] font-black uppercase text-rose-600 block">🚨 Emergency Distress Location</span>
                                    <p className="text-xs font-bold text-slate-900">{commuterName || 'Commuter'}</p>
                                    <p className="text-[10px] text-slate-600 font-semibold">{resolvedAddress}</p>
                                    <p className="text-[10px] font-mono text-slate-500">
                                        Lat: {lat.toFixed(5)}, Long: {lng.toFixed(5)}
                                    </p>
                                </div>
                            </Popup>
                        </Marker>
                    </MapContainer>
                </div>
            )}
        </div>
    );
};

export const NotificationPage = () => {
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('ALL'); // 'ALL' | 'CRITICAL'
    const { socket, resetUnreadCount, realTimeNotifications } = useContext(SocketContext);
    const { user } = useContext(AuthContext);

    // Fetch persisted notifications on mount & reset unread badge
    useEffect(() => {
        const fetchNotifications = async () => {
            try {
                const response = await API.get('/emergency/notifications');
                if (response.data?.success) {
                    setNotifications(response.data.data);
                }
                if (resetUnreadCount) {
                    await resetUnreadCount();
                }
            } catch (error) {
                console.error('Failed to load notifications:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchNotifications();
    }, []);

    // Real-time Socket.io listener
    // Real-time emergency alerts are now handled via SocketContext's realTimeNotifications.

    // Combine real-time notifications from context with persisted notifications
    const combinedNotifications = [...realTimeNotifications, ...notifications];
    // Optional deduplication by _id (if needed)
    const deduped = combinedNotifications.filter((v, i, a) => a.findIndex(t => t._id === v._id) === i);
    const filteredNotifications = deduped.filter((item) => {
        if (filter === 'CRITICAL') return item.type === 'CRITICAL_EMERGENCY';
        return true;
    });

    const criticalCount = deduped.filter((item) => item.type === 'CRITICAL_EMERGENCY').length;

    return (
        <div className="space-y-6 relative pb-8">
            {/* Header Card matching PATHPROHORI Glassmorphic Style */}
            <div className="bg-white/90 backdrop-blur-md border border-[#E0D5DC] rounded-3xl p-5 sm:p-7 shadow-card relative overflow-hidden">
                <div className="absolute top-0 right-0 w-96 h-96 bg-rose-400/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>

                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5">
                    <div className="space-y-1.5">
                        <div className="inline-flex items-center gap-2 px-3 py-1 bg-rose-50 text-rose-700 rounded-full text-xs font-extrabold mb-1 border border-rose-200 shadow-2xs">
                            <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                            <span className="font-display">Emergency Dispatch Engine Active</span>
                            <ShieldAlert className="w-3.5 h-3.5 text-rose-600 ml-1" />
                        </div>

                        <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-[#2D2329] font-display">
                            Emergency & Safety Alerts
                        </h1>
                        <p className="text-xs sm:text-sm text-[#8C7A87] max-w-2xl font-medium leading-relaxed">
                            Real-time distress telemetry dispatch for Emergency Guardians and Operations Command Center.
                        </p>
                    </div>

                    {/* Filter Tabs */}
                    <div className="flex items-center gap-2 bg-[#F7F3F5] p-1.5 rounded-2xl border border-[#E0D5DC] self-start md:self-auto shrink-0">
                        <button
                            onClick={() => setFilter('ALL')}
                            className={`px-4 py-2 text-xs font-extrabold rounded-xl transition-all duration-200 flex items-center gap-2 cursor-pointer ${filter === 'ALL'
                                ? 'bg-white text-[#2D2329] shadow-sm border border-[#E0D5DC]'
                                : 'text-[#8C7A87] hover:text-[#2D2329]'
                                }`}
                        >
                            <FileText className="w-3.5 h-3.5 text-[#8C7A87]" />
                            <span>All Logs ({deduped.length})</span>
                        </button>

                        <button
                            onClick={() => setFilter('CRITICAL')}
                            className={`px-4 py-2 text-xs font-extrabold rounded-xl transition-all duration-200 flex items-center gap-2 cursor-pointer ${filter === 'CRITICAL'
                                ? 'bg-gradient-to-r from-rose-600 to-red-600 text-white shadow-sm shadow-rose-950/20'
                                : 'text-[#8C7A87] hover:text-[#2D2329]'
                                }`}
                        >
                            <ShieldAlert className="w-3.5 h-3.5 text-rose-300" />
                            <span>Critical Only ({criticalCount})</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Main Content Area */}
            {loading ? (
                <div className="flex flex-col justify-center items-center py-20 bg-white/70 backdrop-blur-md border border-[#E0D5DC] rounded-3xl gap-3 shadow-card">
                    <Loader2 className="w-8 h-8 text-rose-600 animate-spin" />
                    <span className="text-xs font-extrabold text-[#8C7A87] uppercase tracking-widest font-display">
                        Synchronizing Emergency Logs...
                    </span>
                </div>
            ) : filteredNotifications.length === 0 ? (
                /* Empty State */
                <div className="text-center py-16 bg-white/80 backdrop-blur-md border border-[#E0D5DC] rounded-3xl p-6 shadow-card">
                    <div className="w-16 h-16 bg-emerald-50 border border-emerald-200 rounded-3xl flex items-center justify-center mx-auto mb-4 text-emerald-600 shadow-2xs">
                        <Shield className="w-8 h-8" />
                    </div>
                    <h3 className="text-lg font-black text-[#2D2329] font-display">No Emergency Alerts Logged</h3>
                    <p className="text-xs sm:text-sm text-[#8C7A87] max-w-md mx-auto mt-1 leading-relaxed font-medium">
                        All tracked commuter journeys are proceeding safely. New emergency panic triggers will appear here live in real-time.
                    </p>
                </div>
            ) : (
                /* Notification Card List */
                <div className="space-y-4">
                    {filteredNotifications.map((item) => (
                        <div
                            key={item._id || Math.random()}
                            className="bg-white/95 hover:bg-white backdrop-blur-md border border-[#E0D5DC] hover:border-rose-300 transition-all duration-300 rounded-3xl p-5 sm:p-6 shadow-card relative overflow-hidden group"
                        >
                            {/* Left Glow Bar Accent */}
                            <div className="absolute top-0 left-0 bottom-0 w-1.5 bg-gradient-to-b from-rose-500 via-red-600 to-amber-500"></div>

                            <div className="pl-2 sm:pl-3 space-y-4">
                                {/* Card Header Tag Row */}
                                <div className="flex flex-wrap justify-between items-center gap-2 pb-3 border-b border-[#E0D5DC]/80">
                                    <div className="flex items-center gap-2">
                                        <span className="bg-rose-50 text-rose-700 border border-rose-200 text-[10px] font-black uppercase px-3 py-1 rounded-full tracking-wider flex items-center gap-1.5 shadow-2xs font-display">
                                            <ShieldAlert className="w-3 h-3 text-rose-600" />
                                            {item.type || 'CRITICAL EMERGENCY'}
                                        </span>
                                        <span className="text-xs text-[#8C7A87] font-mono font-extrabold bg-[#F7F3F5] px-2.5 py-1 rounded-xl border border-[#E0D5DC]">
                                            Trip ID: {item.tripId ? item.tripId.toString().slice(-6) : 'N/A'}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-1.5 text-xs text-[#8C7A87] font-semibold">
                                        <Clock className="w-3.5 h-3.5 text-[#8C7A87]" />
                                        <span>
                                            {new Date(item.createdAt).toLocaleTimeString([], {
                                                hour: '2-digit',
                                                minute: '2-digit',
                                                second: '2-digit',
                                            })}
                                        </span>
                                    </div>
                                </div>

                                {/* Main Alert Info Title */}
                                <h2 className="text-base sm:text-lg font-black text-[#2D2329] flex items-start gap-2.5 leading-snug font-display">
                                    <span className="text-lg shrink-0 mt-0.5">🚨</span>
                                    <span>
                                        {item.senderName && item.senderName !== item.commuterName && item.senderId !== (user?._id || user?.id)
                                            ? `Guardian (${item.senderName}) triggered 1-Tap Panic Alert for ${item.commuterName || 'Commuter'}!`
                                            : `${item.commuterName || 'Commuter'} triggered 1-Tap Panic Alert!`}
                                    </span>
                                </h2>

                                {/* Vehicle & Telemetry Details Grid */}
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-[#FAF7F9] p-4 rounded-2xl border border-[#E0D5DC]/80 text-xs text-[#2D2329]">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-xl bg-rose-100/70 border border-rose-200 flex items-center justify-center text-rose-700 shrink-0">
                                            <Car className="w-4 h-4" />
                                        </div>
                                        <div>
                                            <span className="text-[#8C7A87] block uppercase font-black text-[9px] tracking-wider">Vehicle Type</span>
                                            <span className="font-extrabold text-[#2D2329]">
                                                {item.vehicleInfo?.vehicleType || 'Not Provided'}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-xl bg-emerald-100/70 border border-emerald-200 flex items-center justify-center text-emerald-700 shrink-0">
                                            <Shield className="w-4 h-4" />
                                        </div>
                                        <div>
                                            <span className="text-[#8C7A87] block uppercase font-black text-[9px] tracking-wider">License Plate</span>
                                            <span className="font-mono text-emerald-700 font-extrabold">
                                                {item.vehicleInfo?.licensePlate || 'N/A'}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-xl bg-purple-100/70 border border-purple-200 flex items-center justify-center text-purple-700 shrink-0">
                                            <User className="w-4 h-4" />
                                        </div>
                                        <div>
                                            <span className="text-[#8C7A87] block uppercase font-black text-[9px] tracking-wider">Driver Info</span>
                                            <span className="font-extrabold text-[#2D2329]">{item.vehicleInfo?.driverDetails || 'N/A'}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Route: Starting Location → Destination */}
                                <div className="bg-[#FAF7F9] border border-[#E0D5DC]/80 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                                    <div className="flex items-center gap-3 min-w-0">
                                        <span className="flex h-3 w-3 relative shrink-0">
                                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                            <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                                        </span>
                                        <div className="min-w-0">
                                            <span className="text-[#8C7A87] block uppercase font-black text-[9px] tracking-wider">Starting Location</span>
                                            <span className="text-[#2D2329] font-extrabold truncate block">{item.startingLocation || 'N/A'}</span>
                                        </div>
                                    </div>

                                    <ArrowRight className="w-4 h-4 text-[#8C7A87] shrink-0 hidden sm:block" />

                                    <div className="flex items-center gap-3 min-w-0">
                                        <span className="flex h-3 w-3 relative shrink-0">
                                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                                            <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500"></span>
                                        </span>
                                        <div className="min-w-0">
                                            <span className="text-[#8C7A87] block uppercase font-black text-[9px] tracking-wider">Destination</span>
                                            <span className="text-[#2D2329] font-extrabold truncate block">{item.destination || 'N/A'}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Location Telemetry Component */}
                                <LocationDisplay location={item.location} commuterName={item.commuterName} />
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default NotificationPage;