import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import Modal from '../common/Modal';
import Input from '../common/Input';
import Button from '../common/Button';
import uploadApi from '../../api/uploadApi';
import { AlertCircle, MapPin, Upload, Image, CheckCircle, Crosshair } from 'lucide-react';

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

  useEffect(() => {
    if (selectedCoords && typeof selectedCoords.lat === 'number' && typeof selectedCoords.lng === 'number') {
      setFormData((prev) => ({
        ...prev,
        latitude: selectedCoords.lat,
        longitude: selectedCoords.lng,
        locationName: prev.locationName || `Map Pin [${selectedCoords.lat.toFixed(4)}, ${selectedCoords.lng.toFixed(4)}]`,
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
        latitude: typeof formData.latitude === 'number' ? formData.latitude : defaultLat,
        longitude: typeof formData.longitude === 'number' ? formData.longitude : defaultLng,
      };
      await onSubmit(finalPayload);
      setFormData({
        title: '',
        description: '',
        locationName: '',
        severity: 'High Alert',
        imageUrl: '',
        latitude: defaultLat,
        longitude: defaultLng,
      });
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
                  Selected Location Pin: [{formData.latitude.toFixed(4)}, {formData.longitude.toFixed(4)}]
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
                  {userLocation?.lat
                    ? `Live GPS Center: [${userLocation.lat.toFixed(4)}, ${userLocation.lng.toFixed(4)}]`
                    : 'Default GPS Area Selected'}
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
            className="w-full py-3 bg-gradient-to-r from-[#6B4355] to-[#543343] hover:from-[#583645] hover:to-[#442735] text-white rounded-2xl text-xs font-extrabold flex items-center justify-center gap-2 shadow-sm transition-all active:scale-95"
          >
            <Crosshair className="w-4 h-4 text-amber-400" />
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
            onChange={(e) => setFormData({ ...formData, locationName: e.target.value })}
            required
          />

          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-[#6B4355] uppercase tracking-wider">
              Severity Level
            </label>
            <select
              value={formData.severity}
              onChange={(e) => setFormData({ ...formData, severity: e.target.value })}
              className="w-full px-4 py-3 rounded-2xl bg-[#F9F8FA] border border-[#E0D5DC] text-xs font-semibold text-[#2D2329] focus:outline-none focus:ring-2 focus:ring-[#6B4355]"
            >
              <option value="High Alert">High Alert (Immediate Danger)</option>
              <option value="Med Severity">Medium Severity (Caution Needed)</option>
              <option value="Low Severity">Low Severity (Minor Obstacle)</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-[#6B4355] uppercase tracking-wider">
              Detailed Description <span className="text-[10px] font-normal text-[#8C7A87]">(Optional)</span>
            </label>
            <textarea
              rows="3"
              placeholder="Describe what you observed..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-4 py-3 rounded-2xl bg-[#F9F8FA] border border-[#E0D5DC] text-xs text-[#2D2329] focus:outline-none focus:ring-2 focus:ring-[#6B4355]"
            ></textarea>
          </div>

          {/* Cloudinary Image Upload Section */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-[#6B4355] uppercase tracking-wider">
              Incident Photo (Cloudinary Direct Upload)
            </label>
            
            <div className="flex items-center gap-3">
              <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2.5 bg-[#F9F8FA] hover:bg-[#6B4355] hover:text-white border border-[#E0D5DC] text-[#6B4355] rounded-2xl text-xs font-bold transition-all shadow-sm">
                <Upload className="w-4 h-4" />
                <span>{uploadingImage ? 'Uploading to Cloudinary...' : 'Upload Image File'}</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  disabled={uploadingImage}
                  className="hidden"
                />
              </label>

              {uploadSuccess && (
                <span className="text-xs font-extrabold text-emerald-600 flex items-center gap-1">
                  <CheckCircle className="w-4 h-4" /> Cloudinary Uploaded!
                </span>
              )}
            </div>

            <Input
              placeholder="Or paste image URL (https://...)"
              value={formData.imageUrl}
              onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
            />

            {formData.imageUrl && (
              <div className="rounded-2xl overflow-hidden max-h-32 border border-[#E0D5DC] mt-2">
                <img src={formData.imageUrl} alt="Incident Upload Preview" className="w-full h-full object-cover" />
              </div>
            )}
          </div>

          <Button type="submit" loading={loading} className="w-full py-3 mt-2 font-bold">
            <AlertCircle className="w-4 h-4 mr-2" />
            Broadcast Hazard to Danger Feed
          </Button>
        </form>
      </Modal>

      {/* Interactive Map Picker Modal Centered at User's Real GPS Position */}
      <Modal isOpen={showMapPicker} onClose={() => setShowMapPicker(false)} title="Select Particular Hazard Location on Map">
        <div className="space-y-3">
          <p className="text-xs text-[#8C7A87] font-semibold">
            Click anywhere on the interactive map below to select the exact spot near your location for this hazard report:
          </p>

          <div className="h-72 w-full rounded-2xl overflow-hidden border border-[#E0D5DC] relative">
            <MapContainer
              key={`${tempPickerCoords.lat}-${tempPickerCoords.lng}`}
              center={[tempPickerCoords.lat, tempPickerCoords.lng]}
              zoom={15}
              style={{ height: '100%', width: '100%' }}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <MapPickerClickHandler onSelect={(coords) => setTempPickerCoords(coords)} />
              <Marker position={[tempPickerCoords.lat, tempPickerCoords.lng]} icon={createPickerSpotIcon()} />
            </MapContainer>
          </div>

          <div className="p-3 bg-[#F9F8FA] border border-[#E0D5DC] rounded-xl text-xs font-bold text-[#6B4355] text-center">
            Selected Pin Coordinates: [{tempPickerCoords.lat.toFixed(5)}, {tempPickerCoords.lng.toFixed(5)}]
          </div>

          <Button
            type="button"
            onClick={() => {
              setFormData((prev) => ({
                ...prev,
                latitude: tempPickerCoords.lat,
                longitude: tempPickerCoords.lng,
                locationName: prev.locationName || `Selected Area [${tempPickerCoords.lat.toFixed(4)}, ${tempPickerCoords.lng.toFixed(4)}]`,
              }));
              if (onSelectLocation) {
                onSelectLocation(tempPickerCoords);
              }
              setShowMapPicker(false);
            }}
            className="w-full py-3 font-extrabold"
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
