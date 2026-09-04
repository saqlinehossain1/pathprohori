import React, { useState, useEffect } from 'react';
import { useNotifications } from '../context/NotificationContext';
import { AuthContext } from '../context/AuthContext';
import API from '../api/axiosConfig';
import {
  Siren,
  Bell,
  MapPin,
  ExternalLink,
  Clock,
  User,
  CheckCheck,
  AlertTriangle,
  ShieldCheck,
  PhoneCall,
  Navigation,
  CheckCircle2,
  Filter,
  Radio,
  Share2,
  HardDrive,
  Lock,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import EvidenceLockerViewer from '../components/emergency/EvidenceLockerViewer';

const translateLocation = (str) => {
  if (!str) return '';
  let result = str
    .replace(/বসুন্ধরা আবাসিক এলাকা/g, 'Bashundhara Residential Area')
    .replace(/বসুন্ধরা/g, 'Bashundhara R/A')
    .replace(/আবাসিক এলাকা/g, 'Residential Area')
    .replace(/ব্লক/g, 'Block')
    .replace(/রোড/g, 'Road')
    .replace(/সেক্টর/g, 'Sector')
    .replace(/ঢাকা/g, 'Dhaka')
    .replace(/কুড়িল/g, 'Kuril')
    .replace(/উত্তরা/g, 'Uttara')
    .replace(/ধানমন্ডি/g, 'Dhanmondi')
    .replace(/গুলশান/g, 'Gulshan')
    .replace(/বনানী/g, 'Banani')
    .replace(/মিরপুর/g, 'Mirpur')
    .replace(/মোহাম্মদপুর/g, 'Mohammadpur')
    .replace(/তেজগাঁও/g, 'Tejgaon')
    .replace(/মহাখালী/g, 'Mohakhali');

  return result.replace(/[\u0980-\u09FF]+/g, '').trim();
};

const LocationName = ({ lat, lng, address }) => {
  // If address is actually a vehicle descriptor (e.g. "Taxi -> Dest: Bashundhara"), do not treat it as physical location
  const isTransitDescriptor = address && (
    address.includes('-> Dest:') ||
    address.includes('->') ||
    address.toLowerCase().includes('metro') ||
    address.toLowerCase().includes('cng')
  );
  const initialValidAddress = isTransitDescriptor ? '' : address;

  const [locationName, setLocationName] = useState(initialValidAddress || '');
  const [loading, setLoading] = useState(!initialValidAddress);

  useEffect(() => {
    if (initialValidAddress && initialValidAddress.length > 4) {
      setLocationName(initialValidAddress);
      setLoading(false);
      return;
    }

    if (typeof lat !== 'number' || typeof lng !== 'number' || isNaN(lat) || isNaN(lng)) {
      setLoading(false);
      return;
    }

    let isMounted = true;

    const fetchWithTimeout = async (url, timeoutMs = 3000) => {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);
      try {
        const res = await fetch(url, {
          signal: controller.signal,
          headers: { 'Accept-Language': 'en' },
        });
        clearTimeout(timer);
        return res;
      } catch (err) {
        clearTimeout(timer);
        throw err;
      }
    };

    const fetchLocationName = async () => {
      try {
        // 1. Primary: Nominatim OpenStreetMap (High accuracy place & street names)
        try {
          const nomRes = await fetchWithTimeout(
            `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&zoom=18&accept-language=en`,
            3000
          );
          if (nomRes.ok) {
            const data = await nomRes.json();
            const addr = data.address || {};
            const road = translateLocation(addr.road || addr.pedestrian || data.name || '');
            const quarter = translateLocation(addr.quarter || addr.suburb || addr.neighbourhood || '');
            const area = translateLocation(addr.suburb || addr.residential || addr.district || '');
            const city = translateLocation(addr.city || addr.town || addr.county || '') || 'Dhaka';

            const rawParts = [road, quarter, area, city].filter(Boolean);
            const allTokens = rawParts
              .flatMap((part) => part.split(','))
              .map((t) => t.trim())
              .filter(Boolean);

            const uniqueTokens = [];
            const seen = new Set();
            for (const token of allTokens) {
              const normalized = token.toLowerCase();
              if (!seen.has(normalized)) {
                seen.add(normalized);
                uniqueTokens.push(token);
              }
            }

            const formattedAddress = uniqueTokens.join(', ');
            if (isMounted && formattedAddress && formattedAddress.length > 3) {
              setLocationName(formattedAddress);
              return;
            }
          }
        } catch (_) {}

        // 2. Backup: BigDataCloud Reverse Geocoding
        try {
          const bdcRes = await fetchWithTimeout(
            `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=en`,
            2500
          );
          if (bdcRes.ok) {
            const bdcData = await bdcRes.json();
            if (isMounted && bdcData) {
              const locality = bdcData.locality || bdcData.city || '';
              const country = bdcData.countryName || 'Bangladesh';
              const informative = (bdcData.localityInfo?.informative || [])
                .map((i) => i.name)
                .filter((n) => n && n !== 'Asia' && n !== 'Indian subcontinent' && !n.includes('/') && n !== country);

              const specificArea = informative.length > 0 ? informative.slice(0, 2).join(', ') : locality;
              const fullName = [specificArea, bdcData.city || country].filter(Boolean).join(', ');
              if (fullName && fullName.length > 3) {
                setLocationName(fullName);
                return;
              }
            }
          }
        } catch (_) {}

        // 3. Fallback: Photon Komoot
        try {
          const res = await fetchWithTimeout(`https://photon.komoot.io/reverse?lat=${lat}&lon=${lng}`, 2500);
          if (res.ok) {
            const data = await res.json();
            const prop = data?.features?.[0]?.properties;
            if (isMounted && prop) {
              const buildingOrPlace = prop.name || '';
              const street = prop.street ? (prop.housenumber ? `House ${prop.housenumber}, ${prop.street}` : prop.street) : '';
              const locality = translateLocation(prop.locality);
              const district = translateLocation(prop.district);
              const city = translateLocation(prop.city) || 'Dhaka';

              const rawParts = [buildingOrPlace, street, locality, district, city].filter(Boolean);
              const exactAddress = rawParts.join(', ');
              if (exactAddress) {
                setLocationName(exactAddress);
                return;
              }
            }
          }
        } catch (_) {}
      } catch (e) {
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchLocationName();
    return () => {
      isMounted = false;
    };
  }, [lat, lng, address]);

  if (loading) {
    return <span className="text-slate-400 font-medium animate-pulse">Resolving place name...</span>;
  }

  if (locationName) {
    return <span className="text-slate-900 font-extrabold text-sm">{locationName}</span>;
  }

  return (
    <span className="text-slate-700 font-bold">
      {typeof lat === 'number' && typeof lng === 'number'
        ? `Location near ${lat.toFixed(4)}° N, ${lng.toFixed(4)}° E`
        : 'GPS Location Telemetry'}
    </span>
  );
};

export const Notifications = () => {
  const { notifications, unreadCount, markAsRead, markAllAsRead, markAsResolved } = useNotifications();
  const { user } = React.useContext(AuthContext);
  const [activeFilter, setActiveFilter] = useState('ALL');
  const [resolvingId, setResolvingId] = useState(null);
  const [markingAllRead, setMarkingAllRead] = useState(false);
  const [expandedEvidenceId, setExpandedEvidenceId] = useState(null);

  const filteredNotifications = notifications.filter((notif) => {
    if (activeFilter === 'UNREAD') return notif.status !== 'RESOLVED';
    if (activeFilter === 'RESOLVED') return notif.status === 'RESOLVED';
    return true;
  });

  const activeCount = notifications.filter((notif) => notif.status !== 'RESOLVED').length;
  const resolvedCount = notifications.filter((notif) => notif.status === 'RESOLVED').length;

  const resolveAlert = async (notification) => {
    const alertId = notification.emergencyId || notification.id;
    setResolvingId(String(alertId));
    try {
      if (notification.type === 'WARNING' || notification.notificationType === 'FEELING_UNSAFE') {
        try {
          await API.put(`/notifications/${notification.id}/resolve`);
        } catch {
          await API.put(`/emergency/${alertId}/resolve`);
        }
      } else {
        try {
          await API.put(`/emergency/${alertId}/resolve`);
        } catch {
          await API.put(`/notifications/${notification.id}/resolve`);
        }
      }
      markAsResolved(notification.id);
    } catch (error) {
      console.error('Failed to resolve emergency alert:', error);
    } finally {
      setResolvingId(null);
    }
  };

  const handleMarkAllAsRead = () => {
    setMarkingAllRead(true);
    markAllAsRead();
    setMarkingAllRead(false);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Just now';
    const date = new Date(dateString);
    return isNaN(date.getTime())
      ? dateString
      : date.toLocaleString('en-US', {
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        });
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-28 md:pb-12 animate-page-enter page-bottom-clearance">
      {/* Clean Incident Operations Header */}
      <div className="mobile-page-header flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 pb-4">
        <div>
          <div className="page-header-kicker inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-red-50 text-red-700 rounded-md text-[11px] font-bold mb-1.5 border border-red-200 shadow-2xs">
            <Siren className="w-3.5 h-3.5 text-red-600 animate-pulse" />
            <span>Emergency Dispatch Feed</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight font-display">
            Incident Alerts & SOS Signals
          </h1>
          <p className="text-xs text-slate-500 mt-1 font-medium leading-relaxed max-w-2xl">
            Real-time distress events, reverse-geocoded coordinates, and continuous guardian notifications.
          </p>
        </div>

        {/* Mark All Read Button */}
        {notifications.length > 0 && unreadCount > 0 && (
          <div className="shrink-0">
            <button
              onClick={handleMarkAllAsRead}
              disabled={markingAllRead}
              className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition-all shadow-xs active:scale-[0.98] flex items-center gap-1.5 cursor-pointer"
            >
              <CheckCheck className="w-4 h-4 text-emerald-400" />
              <span>{markingAllRead ? 'Marking...' : 'Mark All Read'}</span>
            </button>
          </div>
        )}
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 bg-white border border-slate-200/90 rounded-2xl p-1.5 text-xs overflow-x-auto shadow-2xs">
        <button
          onClick={() => setActiveFilter('ALL')}
          className={`px-3.5 py-2 rounded-xl font-bold transition-all cursor-pointer active:scale-95 font-display ${
            activeFilter === 'ALL'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          All Alerts ({notifications.length})
        </button>

        <button
          onClick={() => setActiveFilter('UNREAD')}
          className={`px-3.5 py-2 rounded-xl font-bold transition-all cursor-pointer flex items-center gap-1.5 active:scale-95 font-display ${
            activeFilter === 'UNREAD'
              ? 'bg-red-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <span className="w-2 h-2 rounded-full bg-current animate-pulse" />
          <span>Active SOS ({activeCount})</span>
        </button>

        <button
          onClick={() => setActiveFilter('RESOLVED')}
          className={`px-3.5 py-2 rounded-xl font-bold transition-all cursor-pointer active:scale-95 font-display ${
            activeFilter === 'RESOLVED'
              ? 'bg-emerald-700 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          Resolved ({resolvedCount})
        </button>
      </div>

      {/* Notifications List or Empty State */}
      {filteredNotifications.length === 0 ? (
        <div className="bg-white border border-slate-200/90 rounded-2xl p-12 text-center space-y-3.5 shadow-soft">
          <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 mx-auto flex items-center justify-center border border-emerald-200/80 shadow-2xs">
            <ShieldCheck className="w-7 h-7" />
          </div>

          <div className="space-y-1.5 max-w-sm mx-auto">
            <h2 className="text-lg font-extrabold text-slate-900 font-display">
              {activeFilter === 'RESOLVED' ? 'No Resolved Alerts' : activeFilter === 'UNREAD' ? 'No Active Emergency Signals' : 'All Monitored Commuters Are Safe'}
            </h2>
            <p className="text-xs text-slate-500 font-medium leading-relaxed">
              {activeFilter === 'RESOLVED'
                ? 'Resolved false alarms and concluded emergency responses will be logged here.'
                : activeFilter === 'UNREAD'
                  ? 'There are no active emergency signals requiring intervention at this time.'
                  : 'Emergency history and live SOS signals will appear here automatically.'}
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredNotifications.map((notif) => {
            const isUnread = !notif.read;
            const lat = notif.location?.latitude ?? notif.location?.lat ?? notif.latitude;
            const lng = notif.location?.longitude ?? notif.location?.lng ?? notif.longitude;
            const hasCoords = typeof lat === 'number' && typeof lng === 'number' && !isNaN(lat) && !isNaN(lng);
            const mapUrl = hasCoords ? `https://www.google.com/maps?q=${lat},${lng}` : '#';

            const commuterName = notif.user?.name || 'Commuter';
            const commuterPhone = notif.user?.phone || '';
            const isResolved = notif.status === 'RESOLVED';

            return (
              <div
                key={notif.id}
                className={`p-5 rounded-2xl border transition-all relative overflow-hidden ${
                  !isResolved
                    ? 'bg-white border-2 border-red-300 shadow-soft hover-lift'
                    : 'bg-white/80 border border-slate-200/90 shadow-2xs'
                }`}
              >
                {/* Unread Indicator Bar */}
                {isUnread && !isResolved && (
                  <div className="absolute top-0 left-0 bottom-0 w-1.5 bg-red-600 rounded-l-2xl" />
                )}

                <div className="space-y-3">
                  {/* Top Status & Timestamp Header */}
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <div className="flex items-center gap-2">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-xs font-bold uppercase tracking-wider ${
                          !isResolved
                            ? notif.alertType === 'SILENT_DURESS'
                              ? 'bg-red-700 text-white'
                              : notif.alertType === 'FEELING_UNSAFE'
                              ? 'bg-amber-100 text-amber-900 border border-amber-300'
                              : 'bg-red-600 text-white'
                            : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                        }`}
                      >
                        {!isResolved ? (
                          notif.alertType === 'FEELING_UNSAFE' ? (
                            <AlertTriangle className="w-3.5 h-3.5 text-amber-700" />
                          ) : (
                            <Siren className="w-3.5 h-3.5 text-white" />
                          )
                        ) : (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        )}
                        <span>
                          {!isResolved
                            ? notif.alertType === 'SILENT_DURESS'
                              ? 'SILENT DURESS'
                              : notif.alertType === 'FEELING_UNSAFE'
                              ? 'FEELING UNSAFE'
                              : 'ACTIVE SOS ALERT'
                            : notif.alertType === 'FEELING_UNSAFE'
                            ? 'COMMUTER MARKED SAFE'
                            : 'FALSE ALARM RESOLVED'}
                        </span>
                      </span>

                      {isUnread && !isResolved && (
                        <span className="px-1.5 py-0.2 bg-red-100 text-red-800 text-[10px] font-bold rounded">
                          NEW
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 text-xs text-slate-500">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      <span>{formatDate(notif.timestamp)}</span>
                    </div>
                  </div>

                  {/* Official Commuter & Signal Data Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-0.5">
                      <span className="text-[10px] font-bold uppercase text-slate-400 block tracking-wider">
                        Commuter Details
                      </span>
                      <p className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                        {notif.user?.avatarUrl ? (
                          <img src={notif.user.avatarUrl} alt="" className="w-5 h-5 rounded-full object-cover" />
                        ) : (
                          <User className="w-4 h-4 text-slate-500" />
                        )}
                        <span>{commuterName}</span>
                      </p>
                      {commuterPhone && (
                        <p className="text-slate-600 font-mono text-xs mt-0.5">Contact: {commuterPhone}</p>
                      )}
                    </div>

                    <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-0.5">
                      <span className="text-[10px] font-bold uppercase text-slate-400 block tracking-wider">
                        Incident Signal
                      </span>
                      <p className="text-slate-700 font-normal leading-snug">
                        {notif.message || 'Emergency trigger initiated by commuter.'}
                      </p>
                    </div>
                  </div>

                  {/* Precise Location & Landmark Strip */}
                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-1.5 text-xs">
                    <div className="flex items-start gap-2.5 text-slate-800">
                      <div className="w-6 h-6 rounded-md bg-white border border-slate-200 flex items-center justify-center shrink-0 mt-0.5">
                        <MapPin className="w-3.5 h-3.5 text-rose-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="text-[10px] font-bold uppercase text-slate-400 block tracking-wider">
                          Incident Location & Coordinates
                        </span>
                        <div className="text-slate-900 font-bold text-xs leading-snug mt-0.5">
                          {hasCoords ? (
                            <LocationName lat={lat} lng={lng} address={notif.location?.address} />
                          ) : (
                            <span className="text-slate-400 font-normal">Coordinates unavailable</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {hasCoords && (
                      <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-200 text-[11px] text-slate-500 font-mono">
                        <div className="flex items-center gap-1.5">
                          <Navigation className="w-3 h-3 text-slate-400 shrink-0" />
                          <span>Coordinates: <strong className="text-slate-700">{lat.toFixed(5)}° N, {lng.toFixed(5)}° E</strong></span>
                        </div>
                        <span className="text-[10px] text-slate-400 font-sans">OpenStreetMap</span>
                      </div>
                    )}
                  </div>

                  {/* Action Controls Bar with Clear Visual Hierarchy */}
                  <div className="pt-2 border-t border-slate-200 grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2 text-xs">
                    {/* PRIMARY ACTION: Live Tracking Stream Link */}
                    {notif.trackingToken && !isResolved && (
                      <a
                        href={`/track/${notif.trackingToken}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="col-span-2 sm:col-span-1 py-2.5 px-3.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
                      >
                        <Radio className="w-3.5 h-3.5 text-white animate-pulse shrink-0" />
                        <span>Open Live Tracking</span>
                        <ExternalLink className="w-3 h-3 shrink-0" />
                      </a>
                    )}

                    {/* SECONDARY ACTIONS: Neutral / Outlined Styles */}
                    <button
                      type="button"
                      onClick={() => {
                        const emergencyId = String(notif.emergencyId || notif.id);
                        setExpandedEvidenceId(expandedEvidenceId === emergencyId ? null : emergencyId);
                      }}
                      className="py-2.5 px-3 bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 rounded-lg text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer"
                    >
                      <HardDrive className="w-3.5 h-3.5 text-slate-600 shrink-0" />
                      <span>Evidence Locker</span>
                      {expandedEvidenceId === String(notif.emergencyId || notif.id) ? (
                        <ChevronUp className="w-3.5 h-3.5 shrink-0" />
                      ) : (
                        <ChevronDown className="w-3.5 h-3.5 shrink-0" />
                      )}
                    </button>

                    {!isResolved && (
                      <a
                        href="tel:999"
                        className="py-2.5 px-3 bg-white hover:bg-red-50 text-red-700 border border-red-200 rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-1.5 shadow-2xs"
                      >
                        <PhoneCall className="w-3.5 h-3.5 text-red-600 shrink-0" />
                        <span>Call 999</span>
                      </a>
                    )}

                    {commuterPhone && !isResolved && (
                      <a
                        href={`tel:${commuterPhone}`}
                        className="py-2.5 px-3 bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 rounded-lg text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 shadow-2xs"
                      >
                        <PhoneCall className="w-3.5 h-3.5 text-slate-600 shrink-0" />
                        <span>Call Commuter</span>
                      </a>
                    )}

                    {hasCoords && (
                      <a
                        href={mapUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="py-2.5 px-3 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-lg text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 shadow-2xs"
                      >
                        <Navigation className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                        <span>Google Map</span>
                        <ExternalLink className="w-3 h-3 text-slate-400 shrink-0" />
                      </a>
                    )}

                    {!isResolved && user && (
                      <button
                        type="button"
                        onClick={() => resolveAlert(notif)}
                        disabled={resolvingId === String(notif.emergencyId || notif.id)}
                        className="col-span-2 sm:col-span-1 py-2.5 px-3.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 shadow-xs cursor-pointer sm:ml-auto"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        <span>{resolvingId === String(notif.emergencyId || notif.id) ? 'Resolving...' : 'Mark Resolved'}</span>
                      </button>
                    )}
                  </div>

                  {/* Expandable Evidence Locker Section */}
                  {expandedEvidenceId === String(notif.emergencyId || notif.id) && (
                    <div className="pt-3 mt-3 border-t border-slate-200">
                      <EvidenceLockerViewer
                        emergencyId={notif.emergencyId || notif.id}
                        isLive={!isResolved}
                      />
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Notifications;
