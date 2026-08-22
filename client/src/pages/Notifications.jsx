import React, { useState, useEffect } from 'react';
import { useNotifications } from '../context/NotificationContext';
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
  Car,
  Filter,
  CheckCircle2
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
    return <span className="text-slate-400 font-medium animate-pulse">Detecting GPS location name...</span>;
  }

  if (locationName) {
    return <span className="text-white font-extrabold font-display">{locationName}</span>;
  }

  return (
    <span className="text-rose-300 font-mono font-bold">
      {typeof lat === 'number' && typeof lng === 'number'
        ? `${lat.toFixed(4)}° N, ${lng.toFixed(4)}° E`
        : 'Exact GPS Coordinates'}
    </span>
  );
};

export const Notifications = () => {
  const { notifications, unreadCount, markAsRead } = useNotifications();
  const [activeFilter, setActiveFilter] = useState('ALL');

  // Filter logic
  const filteredNotifications = notifications.filter((notif) => {
    if (activeFilter === 'UNREAD') return !notif.read;
    if (activeFilter === 'RESOLVED') return notif.read;
    return true; // 'ALL'
  });

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
      {/* Header Banner - High Tech Platform Theme */}
      <div className="bg-gradient-to-r from-slate-900 via-rose-950/90 to-slate-900 border-2 border-rose-500/40 rounded-3xl p-6 shadow-[0_0_50px_rgba(225,29,72,0.25)] text-white flex flex-col md:flex-row items-start md:items-center justify-between gap-4 relative overflow-hidden">
        {/* Ambient Top Light */}
        <div className="absolute -top-20 -right-20 w-80 h-80 bg-rose-500/20 rounded-full blur-3xl pointer-events-none" />

        <div className="flex items-center gap-4 z-10">
          <div className="w-14 h-14 rounded-2xl bg-rose-600 text-white flex items-center justify-center border-2 border-rose-400 shadow-lg animate-pulse shrink-0">
            <Siren className="w-8 h-8" />
          </div>
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-0.5 bg-rose-500/25 text-rose-200 rounded-full text-[10px] font-black uppercase tracking-widest border border-rose-400/30 font-display mb-1">
              <span className="w-2 h-2 rounded-full bg-rose-400 animate-ping" />
              <span>Real-Time Guardian Alert Feed</span>
            </div>
            <h1 className="text-2xl font-black text-white font-display tracking-tight">
              Emergency SOS Notifications
            </h1>
            <p className="text-xs text-rose-200/80 font-medium mt-0.5">
              Live distress signals, GPS coordinates, and vehicle details transmitted by commuters
            </p>
          </div>
        </div>

        {/* Filter & Action Buttons */}
        <div className="flex items-center gap-3 z-10 flex-wrap shrink-0">
          {notifications.length > 0 && unreadCount > 0 && (
            <button
              onClick={() => markAsRead()}
              className="flex items-center gap-2 px-4 py-2.5 bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 border border-rose-400/40 rounded-xl text-xs font-black transition-all shrink-0 active:scale-95 font-display cursor-pointer"
            >
              <CheckCheck className="w-4 h-4 text-rose-300" />
              <span>Mark All as Read</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter Tabs Header */}
      {notifications.length > 0 && (
        <div className="flex items-center justify-between gap-3 p-1.5 bg-slate-900/80 backdrop-blur-md rounded-2xl border border-slate-800 text-xs font-display">
          <div className="flex items-center gap-1.5 overflow-x-auto">
            <button
              onClick={() => setActiveFilter('ALL')}
              className={`px-4 py-2 rounded-xl font-black transition-all cursor-pointer ${
                activeFilter === 'ALL'
                  ? 'bg-rose-600 text-white shadow-md'
                  : 'text-slate-400 hover:bg-white/10 hover:text-white'
              }`}
            >
              All Alerts ({notifications.length})
            </button>

            <button
              onClick={() => setActiveFilter('UNREAD')}
              className={`px-4 py-2 rounded-xl font-black transition-all cursor-pointer flex items-center gap-1.5 ${
                activeFilter === 'UNREAD'
                  ? 'bg-rose-600 text-white shadow-md'
                  : 'text-slate-400 hover:bg-white/10 hover:text-white'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-rose-400 animate-ping" />
              <span>Active Distress ({unreadCount})</span>
            </button>

            <button
              onClick={() => setActiveFilter('RESOLVED')}
              className={`px-4 py-2 rounded-xl font-black transition-all cursor-pointer ${
                activeFilter === 'RESOLVED'
                  ? 'bg-rose-600 text-white shadow-md'
                  : 'text-slate-400 hover:bg-white/10 hover:text-white'
              }`}
            >
              Resolved ({notifications.length - unreadCount})
            </button>
          </div>
        </div>
      )}

      {/* Notifications List or Empty State */}
      {filteredNotifications.length === 0 ? (
        <div className="bg-gradient-to-b from-slate-900 via-slate-900/90 to-slate-950 border border-slate-800 rounded-3xl p-12 text-center text-white space-y-4 shadow-2xl relative overflow-hidden">
          <div className="w-20 h-20 rounded-full bg-emerald-500/10 border-2 border-emerald-500/30 mx-auto flex items-center justify-center text-emerald-400 shadow-[0_0_40px_rgba(16,185,129,0.2)]">
            <ShieldCheck className="w-10 h-10 animate-pulse" />
          </div>

          <div className="space-y-1.5 max-w-md mx-auto">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-500/20 text-emerald-300 rounded-full text-xs font-black uppercase tracking-wider border border-emerald-500/30 font-display mb-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <span>Commuter Network Protected</span>
            </div>

            <h2 className="text-xl font-black text-white font-display">
              All Monitored Commuters Are Safe
            </h2>

            <p className="text-xs text-slate-400 leading-relaxed font-medium">
              No active emergency SOS signals recorded. When a commuter activates 1-Tap Panic or hands-free voice SOS, real-time telemetry and GPS locations will appear here instantly.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
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
                onClick={() => markAsRead(notif.id)}
                className={`p-6 rounded-3xl border transition-all relative overflow-hidden ${
                  isUnread
                    ? 'bg-gradient-to-br from-slate-900 via-rose-950/80 to-slate-950 border-2 border-rose-500/60 shadow-[0_0_40px_rgba(225,29,72,0.25)] text-white'
                    : 'bg-slate-900/90 border border-slate-800 text-slate-300 shadow-md'
                }`}
              >
                {/* Visual Unread Accent Bar */}
                {isUnread && (
                  <div className="absolute top-0 left-0 bottom-0 w-2 bg-gradient-to-b from-rose-500 to-rose-700 rounded-l-3xl animate-pulse" />
                )}

                <div className="space-y-4">
                  {/* Top Header Row */}
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <div className="flex items-center gap-2.5">
                      <span
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black tracking-wide font-display ${
                          isUnread
                            ? 'bg-rose-600 text-white shadow-md border border-rose-400/40 animate-pulse'
                            : 'bg-emerald-950 text-emerald-300 border border-emerald-500/40'
                        }`}
                      >
                        {isUnread ? <Siren className="w-3.5 h-3.5" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                        <span>{isUnread ? '🚨 CRITICAL DISTRESS' : '🟢 RESOLVED / SAFE'}</span>
                      </span>

                      {isUnread && (
                        <span className="px-2.5 py-0.5 bg-rose-500/20 text-rose-300 text-[10px] font-black rounded-full uppercase tracking-wider border border-rose-500/40 font-display">
                          LIVE UNREAD
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 text-xs text-slate-400 font-mono font-medium">
                      <Clock className="w-3.5 h-3.5 text-rose-400" />
                      <span>{formatDate(notif.timestamp)}</span>
                    </div>
                  </div>

                  {/* Commuter Information & Message */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                    <div className="p-3.5 bg-slate-950/80 rounded-2xl border border-rose-500/30 space-y-1">
                      <span className="text-[10px] font-extrabold uppercase text-slate-400 font-display">
                        Commuter Contact
                      </span>
                      <p className="font-extrabold text-white text-sm font-display flex items-center gap-2">
                        <User className="w-4 h-4 text-rose-400" />
                        <span>{commuterName}</span>
                      </p>
                      {commuterPhone && (
                        <p className="text-slate-300 font-mono font-medium">Phone: {commuterPhone}</p>
                      )}
                    </div>

                    <div className="p-3.5 bg-slate-950/80 rounded-2xl border border-rose-500/30 space-y-1">
                      <span className="text-[10px] font-extrabold uppercase text-slate-400 font-display">
                        SOS Signal Message
                      </span>
                      <p className="text-rose-200 font-semibold leading-relaxed">
                        {notif.message || '1-Tap Panic activated by commuter.'}
                      </p>
                    </div>
                  </div>

                  {/* Location Details & Interactive Actions */}
                  <div className="pt-3 border-t border-rose-500/20 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-200">
                      <MapPin className="w-4 h-4 text-rose-400 shrink-0" />
                      {hasCoords ? (
                        <LocationName lat={lat} lng={lng} address={notif.location?.address} />
                      ) : (
                        <span className="text-slate-400">GPS location telemetry not available</span>
                      )}
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-2.5 flex-wrap shrink-0">
                      <a
                        href="tel:999"
                        className="py-2.5 px-4 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 shadow-md active:scale-95 uppercase font-display tracking-wide"
                      >
                        <PhoneCall className="w-3.5 h-3.5 animate-pulse" />
                        <span>Call 999</span>
                      </a>

                      {commuterPhone && (
                        <a
                          href={`tel:${commuterPhone}`}
                          className="py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 shadow-md active:scale-95 font-display tracking-wide"
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
                          className="py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 shadow-md active:scale-95 font-display"
                        >
                          <Navigation className="w-3.5 h-3.5 text-blue-200" />
                          <span>View Google Map</span>
                          <ExternalLink className="w-3 h-3 ml-0.5" />
                        </a>
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
