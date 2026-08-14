import React from 'react';
import Input from '../common/Input';
import Button from '../common/Button';
import { Bus, Car, Bike, ShieldAlert } from 'lucide-react';

export const JourneyForm = ({
  formData,
  onChange,
  onSubmit,
  loading,
}) => {
  const vehicleOptions = [
    { label: 'CNG Auto', value: 'CNG Auto', icon: Bus },
    { label: 'Rickshaw', value: 'Rickshaw', icon: Bike },
    { label: 'Bus / Shuttle', value: 'Bus / Local Shuttle', icon: Bus },
    { label: 'Uber / Ride', value: 'Uber / Pathao Car', icon: Car },
  ];

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      {/* Vehicle Type Selection with Hover Animations */}
      <div className="space-y-2">
        <label className="block text-xs font-bold text-[#6B4355] uppercase tracking-wider">
          Vehicle Type
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {vehicleOptions.map((v) => {
            const Icon = v.icon;
            const isSelected = formData.vehicleType === v.value;
            return (
              <button
                type="button"
                key={v.value}
                onClick={() => onChange({ target: { name: 'vehicleType', value: v.value } })}
                className={`p-3.5 rounded-2xl border text-xs font-bold flex flex-col items-center gap-2 transition-all duration-200 transform hover:scale-105 active:scale-95 cursor-pointer ${
                  isSelected
                    ? 'bg-[#6B4355] text-white border-[#6B4355] shadow-card scale-105 ring-2 ring-[#6B4355]/30'
                    : 'bg-[#F9F8FA] text-[#6B4355] border-[#E0D5DC] hover:bg-[#FDF7F9]'
                }`}
              >
                <Icon className={`w-5 h-5 transition-transform duration-200 ${isSelected ? 'scale-110' : ''}`} />
                <span>{v.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Number Plate & Color */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input
          label="Vehicle Number Plate"
          name="numberPlate"
          placeholder="e.g. Dhaka Metro-HA-1234"
          value={formData.numberPlate}
          onChange={onChange}
          required
        />
        <Input
          label="Vehicle Color"
          name="vehicleColor"
          placeholder="e.g. Green / Yellow"
          value={formData.vehicleColor}
          onChange={onChange}
        />
      </div>

      {/* Starting Location & Destination */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input
          label="Starting Point"
          name="startingLocation"
          placeholder="Current GPS Location"
          value={formData.startingLocation}
          onChange={onChange}
        />
        <Input
          label="Destination"
          name="destination"
          placeholder="e.g. BRAC University New Campus"
          value={formData.destination}
          onChange={onChange}
          required
        />
      </div>

      {/* Est Duration & Driver Notes */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input
          label="Est. Travel Time (Minutes)"
          type="number"
          name="estimatedTimeMinutes"
          value={formData.estimatedTimeMinutes}
          onChange={onChange}
          min="5"
          max="300"
          required
        />
        <Input
          label="Driver Description / Notes"
          name="driverDescription"
          placeholder="e.g. Driver with blue shirt, tall"
          value={formData.driverDescription}
          onChange={onChange}
        />
      </div>

      {/* Submit Action Button with Pulse Glow Effect */}
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
