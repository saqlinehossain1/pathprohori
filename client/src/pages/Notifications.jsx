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
  Filter
} from 'lucide-react';

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
  const [locationName, setLocationName] = useState(address || '');
  const [loading, setLoading] = useState(!address);

  useEffect(() => {
    if (address) {
      setLocationName(address);
      setLoading(false);
      return;
    }

    let isMounted = true;

    const fetchWithTimeout = async (url, timeoutMs = 2500) => {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);
      try {
        const res = await fetch(url, { signal: controller.signal });
        clearTimeout(timer);
        return res;
      } catch (err) {
        clearTimeout(timer);
        throw err;
      }
    };

    const fetchLocationName = async () => {
      try {
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
              if (fullName && fullName.length > 3 && !fullName.toLowerCase().startsWith('dhaka, dhaka')) {
                setLocationName(fullName);
                return;
              }
            }
          }
        } catch (_) {}

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

              const exactAddress = uniqueTokens.join(', ');
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
    return <span className="text-slate-400 font-medium animate-pulse">Detecting GPS location...</span>;
  }

  if (locationName) {
    return <span className="text-slate-800 font-extrabold">{locationName}</span>;
  }

  return (
    <span className="text-slate-600 font-mono font-bold">
      {typeof lat === 'number' && typeof lng === 'number'
        ? `${lat.toFixed(4)}° N, ${lng.toFixed(4)}° E`
        : 'GPS Location Telemetry'}
    </span>
  );
};

export const Notifications = () => {
  const { notifications, unreadCount, markAsRead } = useNotifications();
  const { user } = React.useContext(AuthContext);
  const [activeFilter, setActiveFilter] = useState('ALL');

  const filteredNotifications = notifications.filter((notif) => {
    if (activeFilter === 'UNREAD') return notif.status !== 'RESOLVED';
    if (activeFilter === 'RESOLVED') return notif.status === 'RESOLVED';
    return true;
  });

  const activeCount = notifications.filter((notif) => notif.status !== 'RESOLVED').length;
  const resolvedCount = notifications.filter((notif) => notif.status === 'RESOLVED').length;

  const resolveAlert = async (notification) => {
    try {
      await API.put(`/emergency/${notification.emergencyId || notification.id}/resolve`);
      markAsRead(notification.id);
    } catch (error) {
      console.error('Failed to resolve emergency alert:', error);
    }
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
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Clean Minimal Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200/80">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-rose-50 text-rose-700 rounded-full text-xs font-extrabold mb-2 border border-rose-200 shadow-2xs font-display">
            <Bell className="w-3.5 h-3.5 text-rose-600" />
            <span>Emergency Guardian Feed</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight font-display">
            Emergency SOS Notifications
          </h1>
          <p className="text-xs text-slate-500 mt-1 font-medium leading-relaxed">
            Real-time emergency distress signals, GPS location telemetry, and vehicle details from commuters
          </p>
        </div>

        {/* Mark All Read Button */}
        {notifications.length > 0 && unreadCount > 0 && (
          <div className="shrink-0">
            <button
              onClick={() => markAsRead()}
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-extrabold rounded-2xl transition-all shadow-sm flex items-center gap-2 cursor-pointer active:scale-95 font-display"
            >
              <CheckCheck className="w-4 h-4 text-emerald-400" />
              <span>Mark All as Read</span>
            </button>
          </div>
        )}
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 bg-white/70 border border-slate-200/80 rounded-2xl p-1.5 text-xs font-display overflow-x-auto shadow-xs">
          <button
            onClick={() => setActiveFilter('ALL')}
            className={`px-4 py-2 rounded-xl font-extrabold transition-all cursor-pointer ${
              activeFilter === 'ALL'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            All Alerts ({notifications.length})
          </button>

          <button
            onClick={() => setActiveFilter('UNREAD')}
            className={`px-4 py-2 rounded-xl font-extrabold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeFilter === 'UNREAD'
                ? 'bg-rose-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-rose-400 animate-ping" />
            <span>Active SOS ({activeCount})</span>
          </button>

          <button
            onClick={() => setActiveFilter('RESOLVED')}
            className={`px-4 py-2 rounded-xl font-extrabold transition-all cursor-pointer ${
              activeFilter === 'RESOLVED'
                ? 'bg-emerald-700 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Resolved ({resolvedCount})
          </button>
        </div>

      {/* Notifications List or Empty State */}
      {filteredNotifications.length === 0 ? (
        <div className="bg-white border border-slate-200/90 rounded-3xl p-10 text-center space-y-4 shadow-card">
          <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 mx-auto flex items-center justify-center border-2 border-emerald-200 shadow-2xs">
            <ShieldCheck className="w-8 h-8" />
          </div>

          <div className="space-y-1 max-w-sm mx-auto">
            <h2 className="text-lg font-black text-slate-900 font-display">
              {activeFilter === 'RESOLVED' ? 'No Resolved Alerts Yet' : activeFilter === 'UNREAD' ? 'No Active SOS Alerts' : 'All Monitored Commuters Are Safe'}
            </h2>
            <p className="text-xs text-slate-500 font-medium leading-relaxed">
              {activeFilter === 'RESOLVED'
                ? 'Resolved false alarms and completed emergency responses will be kept here for reference.'
                : activeFilter === 'UNREAD'
                  ? 'There are no active emergency signals requiring attention right now.'
                  : 'Emergency history and live SOS signals will appear here as they are received.'}
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-3.5">
          {filteredNotifications.map((notif) => {
            const isUnread = !notif.read;
            const lat = notif.location?.latitude;
            const lng = notif.location?.longitude;
            const hasCoords = typeof lat === 'number' && typeof lng === 'number';
            const mapUrl = hasCoords ? `https://www.google.com/maps?q=${lat},${lng}` : '#';

            const commuterName = notif.user?.name || 'Commuter';
            const commuterPhone = notif.user?.phone || '';

            return (
              <div
                key={notif.id}
                className={`p-5 rounded-2xl border transition-all relative overflow-hidden ${
                  notif.status !== 'RESOLVED'
                    ? notif.alertType === 'SILENT_DURESS'
                      ? 'bg-red-50 border-red-400 shadow-md shadow-red-100'
                      : 'bg-rose-50 border-rose-300 shadow-sm'
                    : 'bg-white border-slate-200/90 shadow-card hover:border-slate-300'
                }`}
              >
                {/* Visual Unread Accent Indicator */}
                {isUnread && (
                  <div className="absolute top-0 left-0 bottom-0 w-1.5 bg-rose-600 rounded-l-2xl" />
                )}

                <div className="space-y-3">
                  {/* Top Status & Date */}
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <div className="flex items-center gap-2">
                      <span
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black tracking-wide font-display ${
                          notif.status !== 'RESOLVED'
                            ? notif.alertType === 'SILENT_DURESS'
                              ? 'bg-red-700 text-white shadow-xs'
                              : 'bg-rose-600 text-white shadow-xs'
                            : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                        }`}
                      >
                        {notif.status !== 'RESOLVED' ? <Siren className="w-3.5 h-3.5" /> : <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />}
                        <span>{notif.status !== 'RESOLVED'
                          ? notif.alertType === 'SILENT_DURESS' ? 'SILENT DURESS - CONTACT POLICE' : 'ACTIVE SOS ALERT'
                          : notif.alertType === 'SILENT_DURESS' ? 'DURESS RESPONSE RESOLVED' : 'FALSE ALARM RESOLVED'}</span>
                      </span>

                      {isUnread && (
                        <span className="px-2 py-0.5 bg-rose-100 text-rose-800 text-[10px] font-black rounded-full uppercase tracking-wider font-display">
                          NEW
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      <span>{formatDate(notif.timestamp)}</span>
                    </div>
                  </div>

                  {/* Details Card Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div className="p-3 bg-white/80 rounded-xl border border-slate-200/80 space-y-0.5">
                      <span className="text-[10px] font-extrabold uppercase text-slate-400 block font-display">
                        Commuter Name
                      </span>
                      <p className="font-extrabold text-slate-900 text-sm font-display flex items-center gap-1.5">
                        {notif.user?.avatarUrl ? (
                          <img src={notif.user.avatarUrl} alt="" className="w-5 h-5 rounded-full object-cover border border-rose-200" />
                        ) : (
                          <User className="w-4 h-4 text-rose-600" />
                        )}
                        <span>{commuterName}</span>
                      </p>
                      {commuterPhone && (
                        <p className="text-slate-600 font-mono text-[11px]">Phone: {commuterPhone}</p>
                      )}
                    </div>

                    <div className="p-3 bg-white/80 rounded-xl border border-slate-200/80 space-y-0.5">
                      <span className="text-[10px] font-extrabold uppercase text-slate-400 block font-display">
                        Signal Message
                      </span>
                      <p className="text-slate-700 font-medium leading-snug">
                        {notif.message || 'Emergency trigger initiated by commuter.'}
                      </p>
                    </div>
                  </div>

                  {/* Location & Action Bar */}
                  <div className="pt-2 border-t border-slate-200/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-1.5 font-bold text-slate-700">
                      <MapPin className="w-4 h-4 text-rose-600 shrink-0" />
                      {hasCoords ? (
                        <LocationName lat={lat} lng={lng} address={notif.location?.address} />
                      ) : (
                        <span className="text-slate-400 font-normal">GPS coordinates unavailable</span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 flex-wrap shrink-0">
                      <a
                        href="tel:999"
                        className="py-2 px-3.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 shadow-2xs active:scale-95 uppercase font-display"
                      >
                        <PhoneCall className="w-3.5 h-3.5" />
                        <span>Call 999</span>
                      </a>

                      {commuterPhone && (
                        <a
                          href={`tel:${commuterPhone}`}
                          className="py-2 px-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 shadow-2xs active:scale-95 font-display"
                        >
                          <PhoneCall className="w-3.5 h-3.5" />
                          <span>Call Commuter</span>
                        </a>
                      )}

                      {hasCoords && (
                        <a
                          href={mapUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="py-2 px-3.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-extrabold transition-all flex items-center justify-center gap-1.5 shadow-2xs active:scale-95 font-display"
                        >
                          <Navigation className="w-3.5 h-3.5 text-rose-400" />
                          <span>Google Map</span>
                          <ExternalLink className="w-3 h-3 ml-0.5" />
                        </a>
                      )}

                      {notif.status !== 'RESOLVED' && ['guardian', 'operator', 'admin'].includes(user?.role) && (
                        <button
                          type="button"
                          onClick={() => resolveAlert(notif)}
                          className="py-2 px-3.5 bg-slate-700 hover:bg-slate-800 text-white rounded-xl text-xs font-extrabold transition-all flex items-center justify-center gap-1.5 shadow-2xs active:scale-95 font-display"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Mark Resolved</span>
                        </button>
                      )}
                    </div>
                  </div>
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
