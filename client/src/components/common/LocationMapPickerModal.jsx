import React, { useState, useEffect, useRef, useCallback } from 'react';
import { MapContainer, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import Modal from './Modal';
import Button from './Button';
import {
  MapPin,
  Navigation,
  Locate,
  Loader2,
  CheckCircle2,
  Search,
  Crosshair,
  Sparkles,
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

const reverseGeocode = async (lat, lng) => {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&zoom=18&accept-language=en`,
      {
        headers: {
          'Accept-Language': 'en',
        },
      }
    );
    if (response.ok) {
      const data = await response.json();
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

      const formatted = uniqueTokens.join(', ');
      if (formatted && formatted.length > 3) return formatted;
    }
  } catch (err) {
    console.warn('[MapPicker Reverse Geocode Warning]', err.message);
  }

  // Backup: BigDataCloud
  try {
    const bdcRes = await fetch(
      `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=en`
    );
    if (bdcRes.ok) {
      const bdcData = await bdcRes.json();
      const locality = bdcData.locality || bdcData.city || '';
      const country = bdcData.countryName || 'Bangladesh';
      const informative = (bdcData.localityInfo?.informative || [])
        .map((i) => i.name)
        .filter((n) => n && n !== 'Asia' && n !== 'Indian subcontinent' && !n.includes('/') && n !== country);

      const specificArea = informative.length > 0 ? informative.slice(0, 2).join(', ') : locality;
      const fullName = [specificArea, bdcData.city || country].filter(Boolean).join(', ');
      if (fullName) return fullName;
    }
  } catch (_) {}

  return `${lat.toFixed(4)}° N, ${lng.toFixed(4)}° E`;
};

// Map Controller for Uber/Pathao style center tracking and clicking
const UberMapController = ({ center, onCenterChange, onDragStateChange }) => {
  const map = useMap();

  useMapEvents({
    movestart() {
      if (onDragStateChange) onDragStateChange(true);
    },
    move() {
      const c = map.getCenter();
      onCenterChange({ lat: c.lat, lng: c.lng }, false);
    },
    moveend() {
      if (onDragStateChange) onDragStateChange(false);
      const c = map.getCenter();
      onCenterChange({ lat: c.lat, lng: c.lng }, true);
    },
    click(e) {
      map.flyTo(e.latlng, map.getZoom(), { duration: 0.5 });
    },
  });

  useEffect(() => {
    if (center && typeof center.lat === 'number' && typeof center.lng === 'number') {
      const current = map.getCenter();
      const dist = Math.hypot(current.lat - center.lat, current.lng - center.lng);
      if (dist > 0.0001) {
        map.setView([center.lat, center.lng], map.getZoom() || 15);
      }
    }
  }, [center, map]);

  return null;
};

export const LocationMapPickerModal = ({
  isOpen,
  onClose,
  initialCoords,
  onConfirm,
  title = 'Select Location on Map',
  subtitle = 'Pan, zoom, or drag map to place center pin on target location.',
}) => {
  const defaultLat = initialCoords?.lat || 23.8103;
  const defaultLng = initialCoords?.lng || 90.4125;

  const [coords, setCoords] = useState({ lat: defaultLat, lng: defaultLng });
  const [placeName, setPlaceName] = useState('');
  const [isResolving, setIsResolving] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchSuggestions, setSearchSuggestions] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const [locatingGPS, setLocatingGPS] = useState(false);

  const debounceTimerRef = useRef(null);

  // Sync coords when modal opens with initialCoords
  useEffect(() => {
    if (isOpen) {
      const lat = initialCoords?.lat || 23.8103;
      const lng = initialCoords?.lng || 90.4125;
      setCoords({ lat, lng });
      setSearchQuery('');
      setSearchSuggestions([]);
      setShowSearchDropdown(false);
      fetchPlaceName(lat, lng);
    }
  }, [isOpen, initialCoords]);

  const fetchPlaceName = useCallback(async (lat, lng) => {
    setIsResolving(true);
    try {
      const name = await reverseGeocode(lat, lng);
      setPlaceName(name || `${lat.toFixed(4)}° N, ${lng.toFixed(4)}° E`);
    } catch (_) {
      setPlaceName(`${lat.toFixed(4)}° N, ${lng.toFixed(4)}° E`);
    } finally {
      setIsResolving(false);
    }
  }, []);

  const handleCenterChange = (newCoords, isFinished) => {
    setCoords(newCoords);

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    if (isFinished) {
      debounceTimerRef.current = setTimeout(() => {
        fetchPlaceName(newCoords.lat, newCoords.lng);
      }, 300);
    }
  };

  // Search autocomplete
  useEffect(() => {
    if (!searchQuery || searchQuery.length < 3) {
      setSearchSuggestions([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
            searchQuery
          )}&countrycodes=bd&limit=5&accept-language=en`
        );
        const data = await res.json();
        setSearchSuggestions(data || []);
      } catch (err) {
        console.warn('Map search error:', err);
      } finally {
        setIsSearching(false);
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleSelectSearchPlace = (item) => {
    const lat = parseFloat(item.lat);
    const lng = parseFloat(item.lon);
    setCoords({ lat, lng });
    setShowSearchDropdown(false);
    setSearchQuery('');
    fetchPlaceName(lat, lng);
  };

  // GPS Locate Current Location
  const handleGPSLocate = () => {
    if (!navigator.geolocation) {
      alert('GPS is not supported on this browser.');
      return;
    }
    setLocatingGPS(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setCoords({ lat, lng });
        setLocatingGPS(false);
        fetchPlaceName(lat, lng);
      },
      (err) => {
        console.warn('GPS location error:', err);
        setLocatingGPS(false);
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  const handleConfirm = () => {
    if (onConfirm) {
      onConfirm({
        lat: coords.lat,
        lng: coords.lng,
        address: placeName || `${coords.lat.toFixed(4)}° N, ${coords.lng.toFixed(4)}° E`,
      });
    }
    if (onClose) onClose();
  };

  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title}>
      <div className="space-y-3">
        <p className="text-xs text-slate-500 font-medium">
          {subtitle}
        </p>

        {/* Search Bar on Map */}
        <div className="relative z-50">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              placeholder="Search address or landmark (e.g. Dhanmondi 27, Banani, BRACU)..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setShowSearchDropdown(true);
              }}
              onFocus={() => setShowSearchDropdown(true)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-900 focus:outline-hidden focus:border-rose-500 focus:bg-white transition-all shadow-2xs"
            />
            {isSearching && (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-rose-500 absolute right-3.5 top-3" />
            )}
          </div>

          {showSearchDropdown && searchSuggestions.length > 0 && (
            <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-50 max-h-48 overflow-y-auto custom-scrollbar">
              {searchSuggestions.map((item, idx) => (
                <button
                  type="button"
                  key={item.place_id || idx}
                  onClick={() => handleSelectSearchPlace(item)}
                  className="w-full text-left p-2.5 hover:bg-rose-50/60 border-b border-slate-100 last:border-0 transition-all flex items-start gap-2 text-xs cursor-pointer"
                >
                  <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0 mt-0.5" />
                  <div className="min-w-0">
                    <span className="font-bold text-slate-900 block font-display truncate">
                      {item.display_name.split(',')[0]}
                    </span>
                    <span className="text-[10px] text-slate-500 truncate block">
                      {item.display_name}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Uber/Pathao Style Interactive Map Container */}
        <div className="h-80 w-full rounded-2xl overflow-hidden border border-slate-200 relative shadow-inner">
          <MapContainer
            center={[coords.lat, coords.lng]}
            zoom={16}
            zoomControl={true}
            style={{ height: '100%', width: '100%' }}
          >
            <TileLayer
              attribution='&copy; OpenStreetMap contributors &copy; CARTO'
              url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
            />
            <UberMapController
              center={coords}
              onCenterChange={handleCenterChange}
              onDragStateChange={setIsDragging}
            />
          </MapContainer>

          {/* Uber/Pathao Fixed Center Location Pin with Hover Animation */}
          <div className="absolute inset-0 pointer-events-none z-[500] flex items-center justify-center">
            <div
              className={`relative flex flex-col items-center transition-transform duration-200 ${
                isDragging ? '-translate-y-4 scale-110' : 'translate-y-0 scale-100'
              }`}
              style={{ marginTop: '-24px' }}
            >
              {/* Pin Head */}
              <div className="w-8 h-8 rounded-full bg-rose-600 text-white flex items-center justify-center border-2 border-white shadow-xl">
                <div className="w-2.5 h-2.5 bg-white rounded-full" />
              </div>
              {/* Pin Needle / Point */}
              <div className="w-1 h-3 bg-rose-600 rounded-b-full shadow-md" />
              {/* Ground Shadow Ripple */}
              <div
                className={`w-4 h-1.5 bg-black/25 rounded-full filter blur-[1px] transition-all duration-200 ${
                  isDragging ? 'scale-75 opacity-40 translate-y-3' : 'scale-100 opacity-70 translate-y-0.5'
                }`}
              />
            </div>
          </div>

          {/* Floating GPS Current Location Button */}
          <button
            type="button"
            onClick={handleGPSLocate}
            disabled={locatingGPS}
            className="absolute bottom-3 right-3 z-[600] w-10 h-10 rounded-xl bg-white hover:bg-slate-50 text-slate-800 border border-slate-200 shadow-md flex items-center justify-center active:scale-95 transition-all cursor-pointer"
            title="Locate GPS Current Position"
          >
            {locatingGPS ? (
              <Loader2 className="w-4 h-4 animate-spin text-rose-600" />
            ) : (
              <Locate className="w-4 h-4 text-rose-600" />
            )}
          </button>

          {/* Quick Helper Badge */}
          <div className="absolute top-3 left-3 z-[600] bg-slate-900/80 backdrop-blur-xs text-white text-[10px] font-bold px-2.5 py-1 rounded-lg shadow-xs flex items-center gap-1.5">
            <Crosshair className="w-3 h-3 text-rose-400" />
            <span>Drag map to adjust pointer</span>
          </div>
        </div>

        {/* Selected Location Area Name & Coordinates Box */}
        <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
          <div className="flex items-start gap-2">
            <MapPin className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <div className="min-w-0 flex-1">
              <span className="text-[10px] font-bold uppercase text-slate-400 block font-display tracking-wider">
                Selected Area Name & Landmark
              </span>
              <div className="text-xs font-extrabold text-slate-900 leading-snug">
                {isResolving ? (
                  <span className="text-slate-400 font-medium flex items-center gap-1.5">
                    <Loader2 className="w-3 h-3 animate-spin text-rose-500" /> Resolving place name...
                  </span>
                ) : (
                  placeName || 'Move map to select location'
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between pt-1 border-t border-slate-200/60 text-[10px] text-slate-500 font-mono">
            <span>Coordinates: <strong>{coords.lat.toFixed(5)}, {coords.lng.toFixed(5)}</strong></span>
            <span className="text-[9px] text-slate-400 font-sans">Uber/Pathao Style Pin</span>
          </div>
        </div>

        {/* Confirm Selection Button */}
        <Button
          type="button"
          onClick={handleConfirm}
          className="w-full py-3.5 font-extrabold shadow-md shadow-rose-950/20 active:scale-[0.99]"
        >
          <CheckCircle2 className="w-4 h-4 mr-2" />
          Use This Location
        </Button>
      </div>
    </Modal>
  );
};

export default LocationMapPickerModal;
