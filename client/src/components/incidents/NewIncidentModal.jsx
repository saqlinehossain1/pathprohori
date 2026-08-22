import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import Modal from '../common/Modal';
import Input from '../common/Input';
import Button from '../common/Button';
import uploadApi from '../../api/uploadApi';
import { AlertCircle, MapPin, Upload, Image, CheckCircle, Crosshair, Clock } from 'lucide-react';

const createPickerSpotIcon = () => {
  return L.divIcon({
    className: 'picker-spot-pin',
    html: `<div style="background-color: #F59E0B; width: 32px; height: 32px; border-radius: 50%; border: 3.5px solid white; box-shadow: 0 4px 12px rgba(245,158,11,0.6); display: flex; align-items: center; justify-content: center; animation: bounce 1s infinite;">
            <div style="width: 10px; height: 10px; background-color: white; border-radius: 50%;"></div>
          </div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  });
};

const FINDING_LOCATION_TEXT = 'Finding location...';
const FALLBACK_LOCATION_TEXT = 'Selected location';

// Reverse geocode lat/lng into a short human-readable place name (e.g. "Farmgate, Dhaka")
// via Nominatim - the same provider already used for GPS lookups in JourneyForm.jsx,
// with English labels + structured address fields for a clean "Area, City" result.
const reverseGeocode = async (lat, lng) => {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&accept-language=en&zoom=16&addressdetails=1`
    );
    const data = await res.json();
    const addr = data?.address;
    const street = [addr?.house_number, addr?.road].filter(Boolean).join(' ');

    if (addr) {
      const area =
        addr.suburb || addr.quarter || addr.neighbourhood || addr.village ||
        addr.town || addr.city_district || addr.road;
      const city = addr.city || addr.town || addr.county || addr.state;

      const locationParts = [street, area !== street ? area : null, city !== area ? city : null].filter(Boolean);
      if (locationParts.length) return locationParts.join(', ');
    }

    if (data?.display_name) {
      return data.display_name.split(',').slice(0, 2).join(',').trim();
    }
  } catch (err) {
    console.error('Reverse geocode failed:', err);
  }
  return null;
};

const MapPickerClickHandler = ({ onSelect }) => {
  useMapEvents({
    click(e) {
      if (e && e.latlng) {
        onSelect({ lat: e.latlng.lat, lng: e.latlng.lng });
      }
    },
  });
  return null;
};

export const NewIncidentModal = ({ isOpen, onClose, onSubmit, selectedCoords, userLocation, onSelectLocation }) => {
  const defaultLat = selectedCoords?.lat || userLocation?.lat || 23.8103;
  const defaultLng = selectedCoords?.lng || userLocation?.lng || 90.4125;

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    locationName: '',
    severity: 'High Alert',
    durationHours: 24,
    durationSelected: "Don't Know / Unsure (Default: 24 Hours)",
    imageUrl: '',
    latitude: defaultLat,
    longitude: defaultLng,
  });

  const [showMapPicker, setShowMapPicker] = useState(false);
  const [tempPickerCoords, setTempPickerCoords] = useState({
    lat: defaultLat,
    lng: defaultLng,
  });

  const [loading, setLoading] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);

  // Reverse geocoding display state - lat/lng stay in formData for map/DB use,
  // this is purely for showing a human-readable name to the user.
  const [resolvedLocationName, setResolvedLocationName] = useState('');
  const [resolvingLocation, setResolvingLocation] = useState(true);
  const [pickerLocationName, setPickerLocationName] = useState('');
  const [resolvingPickerLocation, setResolvingPickerLocation] = useState(true);
  const userEditedLocationNameRef = useRef(false);
  const lastResolvedCoordsRef = useRef(null);

  useEffect(() => {
    if (selectedCoords && typeof selectedCoords.lat === 'number' && typeof selectedCoords.lng === 'number') {
      setFormData((prev) => ({
        ...prev,
        latitude: selectedCoords.lat,
        longitude: selectedCoords.lng,
      }));
      setTempPickerCoords({ lat: selectedCoords.lat, lng: selectedCoords.lng });
    } else if (userLocation && typeof userLocation.lat === 'number' && typeof userLocation.lng === 'number') {
      setFormData((prev) => ({
        ...prev,
        latitude: userLocation.lat,
        longitude: userLocation.lng,
      }));
      setTempPickerCoords({ lat: userLocation.lat, lng: userLocation.lng });
    }
  }, [selectedCoords, userLocation]);

  // Whenever the selected pin's coordinates change (initial selection or a new
  // spot confirmed via "Change Spot"), resolve them into a human-readable name.
  useEffect(() => {
    const lat = formData.latitude;
    const lng = formData.longitude;
    if (typeof lat !== 'number' || typeof lng !== 'number') return;

    const coordKey = `${lat.toFixed(5)},${lng.toFixed(5)}`;
    if (lastResolvedCoordsRef.current === coordKey) return;
    lastResolvedCoordsRef.current = coordKey;

    let cancelled = false;
    setResolvingLocation(true);
    setResolvedLocationName('');
    if (!userEditedLocationNameRef.current) {
      setFormData((prev) => ({ ...prev, locationName: FINDING_LOCATION_TEXT }));
    }

    reverseGeocode(lat, lng).then((name) => {
      if (cancelled) return;
      setResolvingLocation(false);
      const finalName = name || FALLBACK_LOCATION_TEXT;
      setResolvedLocationName(finalName);
      if (!userEditedLocationNameRef.current) {
        setFormData((prev) => ({ ...prev, locationName: finalName }));
      }
    });

    return () => {
      cancelled = true;
    };
  }, [formData.latitude, formData.longitude]);

  useEffect(() => {
    if (!tempPickerCoords) return;

    let cancelled = false;
    setResolvingPickerLocation(true);
    setPickerLocationName('');

    reverseGeocode(tempPickerCoords.lat, tempPickerCoords.lng).then((name) => {
      if (cancelled) return;
      setPickerLocationName(name || FALLBACK_LOCATION_TEXT);
      setResolvingPickerLocation(false);
    });

    return () => {
      cancelled = true;
    };
  }, [tempPickerCoords]);

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setUploadingImage(true);
      setUploadSuccess(false);
      const url = await uploadApi.uploadImage(file);
      setFormData((prev) => ({ ...prev, imageUrl: url }));
      setUploadSuccess(true);
    } catch (err) {
      console.error('Image upload failed:', err);
      alert('Cloudinary upload failed: ' + err);
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      const finalPayload = {
        ...formData,
        // Safety net: never submit the transient "Finding location..." placeholder
        // if the user manages to submit before reverse geocoding resolves.
        locationName:
          formData.locationName === FINDING_LOCATION_TEXT
            ? FALLBACK_LOCATION_TEXT
            : formData.locationName,
        latitude: typeof formData.latitude === 'number' ? formData.latitude : defaultLat,
        longitude: typeof formData.longitude === 'number' ? formData.longitude : defaultLng,
      };
      await onSubmit(finalPayload);
      setFormData({
        title: '',
        description: '',
        locationName: '',
        severity: 'High Alert',
        durationHours: 24,
        durationSelected: "Don't Know / Unsure (Default: 24 Hours)",
        imageUrl: '',
        latitude: defaultLat,
        longitude: defaultLng,
      });
      userEditedLocationNameRef.current = false;
      setUploadSuccess(false);
      onClose();
    } catch (err) {
      console.error('Failed to create incident:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose} title="Report Street Safety Hazard">
        <form onSubmit={handleSubmit} className="space-y-4">
          {selectedCoords ? (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl flex items-center justify-between text-amber-900 text-xs font-bold">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-amber-600 flex-shrink-0" />
                <span>
                  Selected Location: {resolvingLocation ? FINDING_LOCATION_TEXT : (resolvedLocationName || FALLBACK_LOCATION_TEXT)}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setShowMapPicker(true)}
                className="text-[11px] underline text-amber-800 font-extrabold"
              >
                Change Spot
              </button>
            </div>
          ) : (
            <div className="p-3 bg-sky-50 border border-sky-200 rounded-2xl flex items-center justify-between text-sky-800 text-xs font-medium">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-sky-600 flex-shrink-0" />
                <span>
                  {resolvingLocation ? FINDING_LOCATION_TEXT : (resolvedLocationName || FALLBACK_LOCATION_TEXT)}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setShowMapPicker(true)}
                className="text-[11px] font-extrabold text-sky-700 underline"
              >
                Pick Area on Map
              </button>
            </div>
          )}

          {/* Interactive Map Location Picker Button */}
          <button
            type="button"
            onClick={() => setShowMapPicker(true)}
            className="w-full py-3.5 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl text-xs font-extrabold flex items-center justify-center gap-2 shadow-md shadow-slate-950/10 transition-all active:scale-95 cursor-pointer font-display"
          >
            <Crosshair className="w-4 h-4 text-rose-400" />
            <span>Select Particular Area Directly from Map</span>
          </button>

          <Input
            label="Hazard Title"
            placeholder="e.g. Broken Streetlight & Dark Alley"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            required
          />

          <Input
            label="Location Name"
            placeholder="e.g. Green Valley Park East Gate"
            value={formData.locationName}
            onChange={(e) => {
              userEditedLocationNameRef.current = true;
              setFormData({ ...formData, locationName: e.target.value });
            }}
            required
          />

          <div className="space-y-1.5">
            <label className="block text-xs font-extrabold text-slate-800 uppercase tracking-wider font-display">
              Severity Level
            </label>
            <select
              value={formData.severity}
              onChange={(e) => setFormData({ ...formData, severity: e.target.value })}
              className="w-full px-4 py-3 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
            >
              <option value="High Alert">High Alert (Immediate Danger)</option>
              <option value="Med Severity">Medium Severity (Caution Needed)</option>
              <option value="Low Severity">Low Severity (Minor Obstacle)</option>
            </select>
          </div>

          {/* Report Duration / Auto-Expiration Time Select */}
          <div className="space-y-1.5">
            <label className="block text-xs font-extrabold text-slate-800 uppercase tracking-wider font-display flex items-center justify-between">
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-rose-600" />
                Active Duration (Auto-Expiration)
              </span>
            </label>
            <select
              value={formData.durationHours}
              onChange={(e) => {
                const val = parseInt(e.target.value, 10);
                const selectedText = e.target.options[e.target.selectedIndex].text;
                setFormData({ ...formData, durationHours: val, durationSelected: selectedText });
              }}
              className="w-full px-4 py-3 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
            >
              <option value={24}>Don't Know / Unsure (Default: 24 Hours / 1 Day)</option>
              <option value={1}>1 Hour (Temporary Obstacle)</option>
              <option value={6}>6 Hours (Short Duration)</option>
              <option value={12}>12 Hours (Half Day)</option>
              <option value={24}>24 Hours (1 Day)</option>
              <option value={48}>2 Days (48 Hours)</option>
              <option value={72}>3 Days (72 Hours)</option>
              <option value={168}>7 Days (1 Week Max)</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-extrabold text-slate-800 uppercase tracking-wider font-display">
              Detailed Description <span className="text-[10px] font-normal text-slate-500">(Optional)</span>
            </label>
            <textarea
              rows="3"
              placeholder="Describe what you observed..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-4 py-3 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 font-medium"
            ></textarea>
          </div>

          {/* Cloudinary Image Upload Section — Direct File Upload Only */}
          <div className="space-y-2">
            <label className="block text-xs font-extrabold text-slate-800 uppercase tracking-wider font-display">
              Incident Photo <span className="text-[10px] font-normal text-slate-500">(Optional)</span>
            </label>

            {!formData.imageUrl ? (
              <label
                className={`flex flex-col items-center justify-center gap-2.5 w-full py-6 px-4 rounded-2xl border-2 border-dashed transition-all cursor-pointer ${
                  uploadingImage
                    ? 'border-rose-400 bg-rose-50/60 animate-pulse cursor-wait'
                    : 'border-slate-300 bg-slate-50 hover:border-rose-400 hover:bg-rose-50/40'
                }`}
              >
                <div className="w-10 h-10 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center">
                  {uploadingImage
                    ? <span className="w-5 h-5 border-2 border-rose-500 border-t-transparent rounded-full animate-spin" />
                    : <Upload className="w-5 h-5 text-slate-500" />
                  }
                </div>
                <div className="text-center">
                  <p className="text-xs font-extrabold text-slate-700 font-display">
                    {uploadingImage ? 'Uploading to Cloudinary…' : 'Click to upload photo'}
                  </p>
                  <p className="text-[10px] text-slate-400 font-medium mt-0.5">JPG, PNG, WEBP — max 10 MB</p>
                </div>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  disabled={uploadingImage}
                  className="hidden"
                />
              </label>
            ) : (
              <div className="relative rounded-2xl overflow-hidden border border-slate-200 bg-slate-50">
                <img src={formData.imageUrl} alt="Incident Upload Preview" className="w-full max-h-40 object-cover" />
                <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                  <button
                    type="button"
                    onClick={() => { setFormData((prev) => ({ ...prev, imageUrl: '' })); setUploadSuccess(false); }}
                    className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-extrabold rounded-xl flex items-center gap-1.5 shadow-md cursor-pointer active:scale-95 font-display"
                  >
                    <Image className="w-4 h-4" /> Remove Photo
                  </button>
                </div>
                <div className="absolute bottom-2 right-2">
                  <span className="px-2.5 py-1 bg-emerald-600 text-white text-[10px] font-extrabold rounded-full flex items-center gap-1 shadow-sm font-display">
                    <CheckCircle className="w-3.5 h-3.5" /> Uploaded
                  </span>
                </div>
              </div>
            )}
          </div>

          <Button type="submit" loading={loading} className="w-full py-3.5 mt-2 font-extrabold shadow-md shadow-rose-950/20">
            <AlertCircle className="w-4 h-4 mr-2" />
            Broadcast Hazard to Danger Feed
          </Button>
        </form>
      </Modal>

      {/* Interactive Map Picker Modal Centered at User's Real GPS Position */}
      <Modal isOpen={showMapPicker} onClose={() => setShowMapPicker(false)} title="Select Particular Hazard Location on Map">
        <div className="space-y-3">
          <p className="text-xs text-slate-500 font-semibold">
            Click anywhere on the interactive map below to select the exact spot near your location for this hazard report:
          </p>

          <div className="h-72 w-full rounded-2xl overflow-hidden border border-slate-200 relative">
            <MapContainer
              key={`${tempPickerCoords.lat}-${tempPickerCoords.lng}`}
              center={[tempPickerCoords.lat, tempPickerCoords.lng]}
              zoom={15}
              style={{ height: '100%', width: '100%' }}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
                url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
              />
              <MapPickerClickHandler onSelect={(coords) => setTempPickerCoords(coords)} />
              <Marker position={[tempPickerCoords.lat, tempPickerCoords.lng]} icon={createPickerSpotIcon()} />
            </MapContainer>
          </div>

          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 text-center font-display">
            {resolvingPickerLocation ? FINDING_LOCATION_TEXT : pickerLocationName}
          </div>

          <Button
            type="button"
            onClick={() => {
              // Picking a new spot always refreshes the human-readable name -
              // see the reverse-geocoding effect keyed on latitude/longitude above.
              userEditedLocationNameRef.current = false;
              setFormData((prev) => ({
                ...prev,
                latitude: tempPickerCoords.lat,
                longitude: tempPickerCoords.lng,
              }));
              if (onSelectLocation) {
                onSelectLocation(tempPickerCoords);
              }
              setShowMapPicker(false);
            }}
            className="w-full py-3.5 font-extrabold shadow-md shadow-rose-950/20"
          >
            <CheckCircle className="w-4 h-4 mr-2" />
            Confirm Selected Location Pin
          </Button>
        </div>
      </Modal>
    </>
  );
};

export default NewIncidentModal;
