import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import Input from '../common/Input';
import Button from '../common/Button';
import Modal from '../common/Modal';
import LocationMapPickerModal from '../common/LocationMapPickerModal';
import uploadApi from '../../api/uploadApi';
import {
  Bus,
  Car,
  Bike,
  ShieldAlert,
  Camera,
  MapPin,
  Locate,
  Loader2,
  X,
  UploadCloud,
  CheckCircle2
} from 'lucide-react';

const createPickerSpotIcon = () => L.divIcon({
  className: 'journey-picker-pin',
  html: '<div style="background-color:#e11d48;width:30px;height:30px;border-radius:50%;border:3px solid white;box-shadow:0 4px 12px rgba(225,29,72,.5);display:flex;align-items:center;justify-content:center"><div style="width:9px;height:9px;background-color:white;border-radius:50%"></div></div>',
  iconSize: [30, 30],
  iconAnchor: [15, 15],
});

const MapPickerClickHandler = ({ onSelect }) => {
  useMapEvents({
    click(event) {
      onSelect({ lat: event.latlng.lat, lng: event.latlng.lng });
    },
  });
  return null;
};

const reverseGeocode = async (lat, lng) => {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&accept-language=en&zoom=16&addressdetails=1`
    );
    const data = await response.json();
    const address = data?.address;
    const street = [address?.house_number, address?.road].filter(Boolean).join(' ');
    const area = address?.suburb || address?.quarter || address?.neighbourhood || address?.village || address?.town || address?.city_district || address?.road;
    const city = address?.city || address?.town || address?.county || address?.state;
    const locationParts = [street, area !== street ? area : null, city !== area ? city : null].filter(Boolean);
    if (locationParts.length) return locationParts.join(', ');
    return data?.display_name?.split(',').slice(0, 2).join(',').trim();
  } catch (error) {
    console.error('Reverse geocode failed:', error);
    return null;
  }
};

export const JourneyForm = ({
  formData,
  setFormData,
  onSubmit,
  loading,
}) => {
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [photoError, setPhotoError] = useState('');

  // Start Location Search State
  const [startQuery, setStartQuery] = useState(formData.startingLocation || '');
  const [startSuggestions, setStartSuggestions] = useState([]);
  const [searchingStart, setSearchingStart] = useState(false);
  const [showStartDropdown, setShowStartDropdown] = useState(false);

  // Destination Location Search State
  const [destQuery, setDestQuery] = useState(formData.destination || '');
  const [destSuggestions, setDestSuggestions] = useState([]);
  const [searchingDest, setSearchingDest] = useState(false);
  const [showDestDropdown, setShowDestDropdown] = useState(false);

  // GPS Locating State
  const [locatingGPS, setLocatingGPS] = useState(false);
  const [mapPicker, setMapPicker] = useState(null);
  const [pickerCoords, setPickerCoords] = useState(null);

  const startRef = useRef(null);
  const destRef = useRef(null);

  const openMapPicker = (target) => {
    const existingCoords = target === 'start' ? formData.startCoords : formData.destinationCoords;
    setPickerCoords(existingCoords || { lat: 23.8103, lng: 90.4125 });
    setMapPicker(target);
  };

  const handleConfirmMapPicker = ({ lat, lng, address }) => {
    if (!mapPicker) return;
    const isStart = mapPicker === 'start';
    const fieldName = isStart ? 'startingLocation' : 'destination';
    const coordsName = isStart ? 'startCoords' : 'destinationCoords';
    setFormData((prev) => ({
      ...prev,
      [fieldName]: address,
      [coordsName]: { lat, lng },
    }));
    if (isStart) setStartQuery(address);
    else setDestQuery(address);
    setMapPicker(null);
  };

  // Vehicle Options
  const vehicleOptions = [
    { label: 'CNG Auto', value: 'CNG Auto', icon: Bus },
    { label: 'Rickshaw', value: 'Rickshaw', icon: Bike },
    { label: 'Bus / Shuttle', value: 'Bus / Local Shuttle', icon: Bus },
    { label: 'Uber / Pathao', value: 'Uber / Pathao Car', icon: Car },
    { label: 'Taxi / Car', value: 'Taxi / Private Car', icon: Car },
  ];

  // Debounced search for Start location
  useEffect(() => {
    if (!startQuery || startQuery.length < 3) {
      setStartSuggestions([]);
      return;
    }
    const timer = setTimeout(async () => {
      setSearchingStart(true);
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(startQuery)}&countrycodes=bd&limit=5`
        );
        const data = await res.json();
        setStartSuggestions(data || []);
      } catch (err) {
        console.error('Start location search failed:', err);
      } finally {
        setSearchingStart(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [startQuery]);

  // Debounced search for Destination location
  useEffect(() => {
    if (!destQuery || destQuery.length < 3) {
      setDestSuggestions([]);
      return;
    }
    const timer = setTimeout(async () => {
      setSearchingDest(true);
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(destQuery)}&countrycodes=bd&limit=5`
        );
        const data = await res.json();
        setDestSuggestions(data || []);
      } catch (err) {
        console.error('Destination location search failed:', err);
      } finally {
        setSearchingDest(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [destQuery]);

  // Click outside to close dropdowns
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (startRef.current && !startRef.current.contains(e.target)) {
        setShowStartDropdown(false);
      }
      if (destRef.current && !destRef.current.contains(e.target)) {
        setShowDestDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handle Photo Upload (Optional)
  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingPhoto(true);
    setPhotoError('');
    try {
      const url = await uploadApi.uploadImage(file);
      setFormData((prev) => ({ ...prev, photoUrl: url }));
    } catch (err) {
      console.error('Photo upload error:', err);
      setPhotoError(err.message || 'Image upload failed. Please try again.');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleRemovePhoto = () => {
    setFormData((prev) => ({ ...prev, photoUrl: '' }));
  };

  // Get Current GPS Location for Start Point
  const handleUseGPSLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser.');
      return;
    }

    setLocatingGPS(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;

        setFormData((prev) => ({
          ...prev,
          startingLocation: `Current Location (${lat.toFixed(4)}, ${lng.toFixed(4)})`,
          startCoords: { lat, lng },
        }));
        setStartQuery(`Current Location (${lat.toFixed(4)}, ${lng.toFixed(4)})`);
        setLocatingGPS(false);

        // Reverse geocode to get human readable address
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`
          );
          const data = await res.json();
          if (data && data.display_name) {
            const shortName = data.display_name.split(',').slice(0, 3).join(',');
            setFormData((prev) => ({
              ...prev,
              startingLocation: shortName,
            }));
            setStartQuery(shortName);
          }
        } catch (err) {
          console.error('Reverse geocode failed:', err);
        }
      },
      (err) => {
        console.error('GPS error:', err);
        alert('Could not acquire GPS position. Please type your starting location.');
        setLocatingGPS(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const selectStartPlace = (item) => {
    const shortName = item.display_name.split(',').slice(0, 3).join(',');
    const lat = parseFloat(item.lat);
    const lng = parseFloat(item.lon);

    setFormData((prev) => ({
      ...prev,
      startingLocation: shortName,
      startCoords: { lat, lng },
    }));
    setStartQuery(shortName);
    setShowStartDropdown(false);
  };

  const selectDestPlace = (item) => {
    const shortName = item.display_name.split(',').slice(0, 3).join(',');
    const lat = parseFloat(item.lat);
    const lng = parseFloat(item.lon);

    setFormData((prev) => ({
      ...prev,
      destination: shortName,
      destinationCoords: { lat, lng },
    }));
    setDestQuery(shortName);
    setShowDestDropdown(false);
  };

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      {/* Vehicle Type Selection */}
      <div className="space-y-2">
        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider font-display">
          Select Vehicle / Transport Type
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
          {vehicleOptions.map((v) => {
            const Icon = v.icon;
            const isSelected = formData.vehicleType === v.value;
            return (
              <button
                type="button"
                key={v.value}
                onClick={() => setFormData((prev) => ({ ...prev, vehicleType: v.value }))}
                className={`p-3 rounded-2xl border text-xs font-bold flex flex-col items-center gap-1.5 transition-all duration-200 cursor-pointer ${
                  isSelected
                    ? 'bg-slate-900 text-white border-slate-900 shadow-md shadow-slate-950/20 ring-2 ring-rose-500/40'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <Icon className={`w-4 h-4 ${isSelected ? 'text-rose-400' : 'text-slate-500'}`} />
                <span className="text-[11px] truncate">{v.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Starting Location with Interactive Map Search & GPS Button */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="relative space-y-1" ref={startRef}>
          <div className="flex flex-col items-start gap-1">
            <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider font-display">
              Starting Location *
            </label>
            <div className="flex min-h-[36px] flex-col items-start gap-1">
              <button
                type="button"
                onClick={handleUseGPSLocation}
                disabled={locatingGPS}
                className="text-[11px] font-bold text-rose-600 hover:text-rose-700 flex items-center gap-1 cursor-pointer"
                title="Use GPS current location"
              >
                {locatingGPS ? (
                  <Loader2 className="w-3 h-3 animate-spin text-rose-600" />
                ) : (
                  <Locate className="w-3 h-3" />
                )}
                <span className="hidden lg:inline whitespace-nowrap">GPS Current Location</span>
              </button>
              <button
                type="button"
                onClick={() => openMapPicker('start')}
                className="text-[11px] font-bold text-rose-600 hover:text-rose-700 flex items-center gap-1 cursor-pointer"
                title="Select starting location on map"
                aria-label="Select starting location on map"
              >
                <MapPin className="w-3 h-3" />
                <span className="hidden lg:inline whitespace-nowrap">Select from map</span>
              </button>
            </div>
          </div>

          <div className="relative">
            <MapPin className="w-4 h-4 text-emerald-600 absolute left-3.5 top-3 z-10" />
            <input
              type="text"
              placeholder="Search place name e.g. BRAC University, Farmgate..."
              value={startQuery}
              onChange={(e) => {
                setStartQuery(e.target.value);
                setFormData((prev) => ({ ...prev, startingLocation: e.target.value }));
                setShowStartDropdown(true);
              }}
              onFocus={() => setShowStartDropdown(true)}
              required
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-900 focus:outline-none focus:border-rose-500 focus:bg-white"
            />
          </div>

          {/* Start Search Suggestions Dropdown */}
          {showStartDropdown && (startSuggestions.length > 0 || searchingStart) && (
            <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 overflow-hidden max-h-56 overflow-y-auto custom-scrollbar">
              {searchingStart && (
                <div className="p-3 text-xs text-slate-500 font-semibold flex items-center gap-2">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-rose-500" />
                  Searching map places...
                </div>
              )}
              {startSuggestions.map((item, idx) => (
                <button
                  type="button"
                  key={item.place_id || idx}
                  onClick={() => selectStartPlace(item)}
                  className="w-full text-left p-3 hover:bg-rose-50/60 border-b border-slate-100 last:border-0 transition-all flex items-start gap-2 text-xs"
                >
                  <MapPin className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-extrabold text-slate-900 block font-display">
                      {item.display_name.split(',')[0]}
                    </span>
                    <span className="text-[10px] text-slate-500 line-clamp-1">
                      {item.display_name}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Destination Location with Interactive Map Search */}
        <div className="relative space-y-1" ref={destRef}>
          <div className="flex flex-col items-start gap-1">
            <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider font-display">
              Ending Location *
            </label>
            <div className="flex min-h-[36px] items-start">
              <button
                type="button"
                onClick={() => openMapPicker('destination')}
                className="text-[11px] font-bold text-rose-600 hover:text-rose-700 flex items-center gap-1 cursor-pointer"
              >
                <MapPin className="w-3 h-3" />
                <span className="whitespace-nowrap">Select from map</span>
              </button>
            </div>
          </div>

          <div className="relative">
            <MapPin className="w-4 h-4 text-rose-600 absolute left-3.5 top-3 z-10" />
            <input
              type="text"
              placeholder="Search place name e.g. Gulshan 2 Circle, Dhanmondi..."
              value={destQuery}
              onChange={(e) => {
                setDestQuery(e.target.value);
                setFormData((prev) => ({ ...prev, destination: e.target.value }));
                setShowDestDropdown(true);
              }}
              onFocus={() => setShowDestDropdown(true)}
              required
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-900 focus:outline-none focus:border-rose-500 focus:bg-white"
            />
          </div>

          {/* Destination Search Suggestions Dropdown */}
          {showDestDropdown && (destSuggestions.length > 0 || searchingDest) && (
            <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 overflow-hidden max-h-56 overflow-y-auto custom-scrollbar">
              {searchingDest && (
                <div className="p-3 text-xs text-slate-500 font-semibold flex items-center gap-2">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-rose-500" />
                  Searching map places...
                </div>
              )}
              {destSuggestions.map((item, idx) => (
                <button
                  type="button"
                  key={item.place_id || idx}
                  onClick={() => selectDestPlace(item)}
                  className="w-full text-left p-3 hover:bg-rose-50/60 border-b border-slate-100 last:border-0 transition-all flex items-start gap-2 text-xs"
                >
                  <MapPin className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-extrabold text-slate-900 block font-display">
                      {item.display_name.split(',')[0]}
                    </span>
                    <span className="text-[10px] text-slate-500 line-clamp-1">
                      {item.display_name}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Uber/Pathao Style Location Map Picker Modal */}
      <LocationMapPickerModal
        isOpen={Boolean(mapPicker)}
        onClose={() => setMapPicker(null)}
        initialCoords={pickerCoords}
        onConfirm={handleConfirmMapPicker}
        title={mapPicker === 'start' ? 'Select Starting Location' : 'Select Destination Location'}
        subtitle={
          mapPicker === 'start'
            ? 'Pan or drag map to place center pin at your starting origin point.'
            : 'Pan or drag map to place center pin at your destination arrival point.'
        }
      />

      {/* Number Plate & Color */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input
          label="Vehicle Number Plate (Optional)"
          labelClassName="min-h-[32px]"
          name="numberPlate"
          placeholder="e.g. Dhaka Metro-GA-11-2233"
          value={formData.numberPlate || ''}
          onChange={(e) => setFormData((prev) => ({ ...prev, numberPlate: e.target.value }))}
        />
        <Input
          label="Vehicle Color (Optional)"
          labelClassName="min-h-[32px]"
          name="vehicleColor"
          placeholder="e.g. Green / Yellow / Black"
          value={formData.vehicleColor || ''}
          onChange={(e) => setFormData((prev) => ({ ...prev, vehicleColor: e.target.value }))}
        />
      </div>

      {/* Est Duration & Driver Description */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input
          label="Est. Travel Time (Minutes) *"
          labelClassName="min-h-[32px]"
          type="number"
          name="estimatedTimeMinutes"
          value={formData.estimatedTimeMinutes || 30}
          onChange={(e) => setFormData((prev) => ({ ...prev, estimatedTimeMinutes: parseInt(e.target.value) || 30 }))}
          min="5"
          max="300"
          required
        />
        <Input
          label="Driver Description / Notes (Optional)"
          labelClassName="min-h-[32px]"
          name="driverDescription"
          placeholder="e.g. Driver wearing blue shirt & helmet"
          value={formData.driverDescription || ''}
          onChange={(e) => setFormData((prev) => ({ ...prev, driverDescription: e.target.value }))}
        />
      </div>

      {/* Optional Vehicle / Journey Photo Upload Button */}
      <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <label className="text-xs font-extrabold text-slate-900 block font-display">
              Upload Vehicle or Check-in Photo (Optional)
            </label>
            <p className="text-[11px] text-slate-500">
              Attach a photo of the vehicle, number plate, or driver for emergency verification.
            </p>
          </div>
          <span className="text-[10px] font-extrabold text-slate-400 bg-slate-200/60 px-2 py-0.5 rounded-md uppercase">
            Optional
          </span>
        </div>

        {formData.photoUrl ? (
          <div className="relative inline-block rounded-2xl overflow-hidden border-2 border-slate-900 shadow-md">
            <img
              src={formData.photoUrl}
              alt="Uploaded Vehicle Preview"
              className="w-36 h-24 object-cover"
            />
            <button
              type="button"
              onClick={handleRemovePhoto}
              className="absolute top-1 right-1 p-1 bg-rose-600 text-white rounded-full hover:bg-rose-700 transition-all cursor-pointer shadow-md"
              title="Remove Photo"
            >
              <X className="w-3.5 h-3.5" />
            </button>
            <div className="absolute bottom-0 left-0 right-0 bg-slate-900/80 text-white text-[10px] font-extrabold px-1.5 py-0.5 text-center flex items-center justify-center gap-1 font-display">
              <CheckCircle2 className="w-3 h-3 text-emerald-400" /> Photo Attached
            </div>
          </div>
        ) : (
          <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2.5 bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 rounded-xl text-xs font-extrabold transition-all shadow-2xs active:scale-95">
            {uploadingPhoto ? (
              <Loader2 className="w-4 h-4 animate-spin text-rose-600" />
            ) : (
              <Camera className="w-4 h-4 text-rose-600" />
            )}
            <span>{uploadingPhoto ? 'Uploading Photo to Cloudinary...' : 'Attach Vehicle / Check-in Photo'}</span>
            <input
              type="file"
              accept="image/*"
              onChange={handlePhotoUpload}
              disabled={uploadingPhoto}
              className="hidden"
            />
          </label>
        )}

        {photoError && (
          <p className="text-xs text-rose-600 font-semibold">{photoError}</p>
        )}
      </div>

      {/* Start Live Monitoring Action Button */}
      <Button
        type="submit"
        loading={loading}
        className="w-full py-4 text-sm font-extrabold shadow-md hover:shadow-lg transition-all active:scale-[0.99]"
      >
        <ShieldAlert className="w-5 h-5 mr-2 animate-pulse" />
        START LIVE GUARDIAN MONITORING
      </Button>
    </form>
  );
};

export default JourneyForm;
