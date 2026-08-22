import React, { useEffect } from 'react';
import { useNotifications } from '../context/NotificationContext';
import {
  Bell,
  MapPin,
  ExternalLink,
  Clock,
  User,
  CheckCheck,
  AlertTriangle,
  ShieldCheck,
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
  const [locationName, setLocationName] = React.useState(address || '');
  const [loading, setLoading] = React.useState(!address);

  React.useEffect(() => {
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
        // Primary: BigDataCloud (fast, zero rate limits)
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

        // Secondary: Photon Komoot API with 2.5s timeout
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

              const rawParts = [
                buildingOrPlace,
                street,
                locality,
                district,
                city
              ].filter(Boolean);

              // Tokenize by comma, trim whitespace, and perform case-insensitive deduplication
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
        // Silent fallback
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchLocationName();
    return () => {
      isMounted = false;
    };
  }, [lat, lng]);

  if (loading) {
    return <span className="text-[#765C6A] font-medium animate-pulse">Detecting exact location name...</span>;
  }

  if (locationName) {
    return <span className="text-[#2F2930] font-extrabold">{locationName}</span>;
  }

  return (
    <span className="text-[#6B4355] font-bold">
      {typeof lat === 'number' && typeof lng === 'number'
        ? `${lat.toFixed(4)}° N, ${lng.toFixed(4)}° E`
        : 'Exact GPS Coordinates'}
    </span>
  );
};



export const Notifications = () => {
  const { notifications, unreadCount, markAsRead } = useNotifications();

  // Mark unread notifications as read when visiting this page
  useEffect(() => {
    if (notifications.length > 0) {
      notifications.forEach((notif) => {
        if (!notif.read) {
          markAsRead(notif.id);
        }
      });
    }
  }, [notifications, markAsRead]);

  const handleViewLocation = (e, notif) => {
    markAsRead(notif.id);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Just now';
    const date = new Date(dateString);
    return isNaN(date.getTime())
      ? dateString
      : date.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-10">
      {/* Header Banner */}
      <div className="bg-white border border-[#E5D8DF] rounded-3xl p-6 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-[#FDF7F9] flex items-center justify-center text-[#6B4355] shadow-inner shrink-0">
            <Bell className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-black text-[#2F2930] tracking-tight">
              Emergency Notifications
            </h1>
            <p className="text-xs text-[#765C6A] font-medium mt-0.5">
              Real-time emergency signals & safety alerts from commuters
            </p>
          </div>
        </div>

        {notifications.length > 0 && unreadCount > 0 && (
          <button
            onClick={() => markAsRead()}
            className="flex items-center gap-2 px-4 py-2 bg-[#FDF7F9] hover:bg-[#F3E8EE] text-[#6B4355] border border-[#E5D8DF] rounded-xl text-xs font-bold transition-all shrink-0 active:scale-95"
          >
            <CheckCheck className="w-4 h-4 text-[#6B4355]" />
            <span>Mark All as Read</span>
          </button>
        )}
      </div>

      {/* Notifications List or Empty State */}
      {notifications.length === 0 ? (
        <div className="bg-white border border-[#E5D8DF] rounded-3xl p-12 text-center shadow-sm space-y-4">
          <div className="w-16 h-16 rounded-full bg-[#FDF7F9] border border-[#E5D8DF] mx-auto flex items-center justify-center text-[#6B4355]">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <div className="space-y-1 max-w-sm mx-auto">
            <h2 className="text-base font-extrabold text-[#2F2930]">
              No Emergency Notifications
            </h2>
            <p className="text-xs text-[#765C6A]">
              You have no active emergency alerts. All monitored commuters are currently safe.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {notifications.map((notif) => {
            const isUnread = !notif.read;
            const lat = notif.location?.latitude;
            const lng = notif.location?.longitude;
            const hasCoords = typeof lat === 'number' && typeof lng === 'number';
            const mapUrl = hasCoords ? `https://www.google.com/maps?q=${lat},${lng}` : '#';

            return (
              <div
                key={notif.id}
                onClick={() => markAsRead(notif.id)}
                className={`p-6 rounded-3xl border transition-all relative overflow-hidden ${isUnread
                  ? 'bg-[#FDF7F9] border-[#6B4355] shadow-md'
                  : 'bg-white border-[#E5D8DF] shadow-sm hover:border-[#D5C8D0]'
                  }`}
              >
                {/* Visual Unread Accent Strip */}
                {isUnread && (
                  <div className="absolute top-0 left-0 bottom-0 w-1.5 bg-[#6B4355] rounded-l-3xl" />
                )}

                <div className="space-y-4">
                  {/* Top Header Row */}
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#6B4355] text-white rounded-full text-xs font-black tracking-wide shadow-sm">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        Emergency Alert
                      </span>
                      {isUnread && (
                        <span className="px-2 py-0.5 bg-[#FDF7F9] text-[#633E4E] text-[10px] font-black rounded-full uppercase tracking-wider border border-[#E5D8DF]">
                          New
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 text-xs text-[#765C6A] font-medium">
                      <Clock className="w-3.5 h-3.5" />
                      <span>{formatDate(notif.timestamp)}</span>
                    </div>
                  </div>

                  {/* Commuter Information & Message */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm font-black text-[#2F2930]">
                      <User className="w-4 h-4 text-[#6B4355]" />
                      <span>{notif.user?.name || 'Unknown Commuter'}</span>
                    </div>

                    <p className="text-xs text-[#4C3A45] font-semibold leading-relaxed bg-white/70 p-3 rounded-2xl border border-[#E5D8DF]/30">
                      {notif.message || 'Emergency trigger initiated by commuter.'}
                    </p>
                  </div>

                  {/* Location Details & Map Action */}
                  <div className="pt-2 border-t border-[#E5D8DF]/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-2 text-xs font-bold text-[#6B4355]">
                      <MapPin className="w-4 h-4 shrink-0 text-[#6B4355]" />
                      {hasCoords ? (
                        <LocationName lat={lat} lng={lng} address={notif.location?.address} />
                      ) : (
                        <span className="text-[#765C6A]">Location coordinates not available</span>
                      )}
                    </div>

                    {hasCoords && (
                      <a
                        href={mapUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => handleViewLocation(e, notif)}
                        className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-[#6B4355] hover:bg-[#633E4E] text-white rounded-xl text-xs font-bold transition-all shadow-sm active:scale-95 shrink-0"
                      >
                        <MapPin className="w-3.5 h-3.5" />
                        <span>View Location</span>
                        <ExternalLink className="w-3.5 h-3.5 ml-0.5" />
                      </a>
                    )}
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
