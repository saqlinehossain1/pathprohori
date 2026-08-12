import React, { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { SocketContext } from '../context/SocketContext';
import API from '../services/api';
import {
  Car,
  MapPin,
  FileText,
  Camera,
  ShieldCheck,
  CheckCircle,
  Lightbulb,
} from 'lucide-react';

export const LogJourney = () => {
  const navigate = useNavigate();
  const { setActiveTrip } = useContext(SocketContext);

  const [formData, setFormData] = useState({
    numberPlate: 'DHAKA METRO-G-11-2233',
    vehicleType: 'Rickshaw',
    vehicleColor: 'Yellow and Green',
    estimatedTimeMinutes: 25,
    startingLocation: 'BRAC University Mohakhali Campus',
    destination: 'Gulshan 2 Circle',
    driverDescription: 'Age around 30, wearing blue jacket and black cap.',
    journeyNotes: 'Traveling via 11th floor exit road.',
    photoUrl: 'https://images.unsplash.com/photo-1558981806-ec527fa84c39?auto=format&fit=crop&w=600&q=80',
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const { data } = await API.post('/trips', formData);
      setActiveTrip(data);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save journey');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header Title */}
      <div>
        <h1 className="text-3xl font-extrabold text-[#6B4355] tracking-tight">
          Log New Journey
        </h1>
        <p className="text-xs text-[#8C8289] font-medium mt-1">
          Keep your commute secure. Log your transport details before starting your trip.
        </p>
      </div>

      {error && (
        <div className="p-3 bg-[#FDE8EC] text-[#E05370] text-xs font-semibold rounded-xl border border-[#F9C5D1]">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Columns: Main Form Input Cards */}
        <div className="lg:col-span-2 space-y-6 bg-white p-8 rounded-3xl border border-[#EFEAEB] shadow-card">
          {/* Section 1: Vehicle Details */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-[#6B4355] font-bold text-sm border-b border-[#F4EFF2] pb-3">
              <Car className="w-4 h-4" />
              <span>Vehicle Details</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-[#8C8289] mb-1">
                  Number Plate
                </label>
                <input
                  type="text"
                  name="numberPlate"
                  value={formData.numberPlate}
                  onChange={handleChange}
                  placeholder="e.g. DHAKA METRO-G-11-2233"
                  className="w-full bg-[#F4F1F3] text-sm text-[#2D2329] px-4 py-3 rounded-xl border border-transparent focus:outline-none focus:border-[#6B4355] focus:bg-white font-medium transition-all"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-[#8C8289] mb-1">
                  Vehicle Type
                </label>
                <select
                  name="vehicleType"
                  value={formData.vehicleType}
                  onChange={handleChange}
                  className="w-full bg-[#F4F1F3] text-sm text-[#2D2329] px-4 py-3 rounded-xl border border-transparent focus:outline-none focus:border-[#6B4355] focus:bg-white font-medium transition-all"
                >
                  <option value="Rickshaw">Rickshaw</option>
                  <option value="CNG">CNG Auto Rickshaw</option>
                  <option value="Bus">Public Bus</option>
                  <option value="Taxi">Uber / Taxi</option>
                  <option value="Private Car">Private Car</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-[#8C8289] mb-1">
                  Vehicle Color
                </label>
                <input
                  type="text"
                  name="vehicleColor"
                  value={formData.vehicleColor}
                  onChange={handleChange}
                  placeholder="e.g. Yellow and Green"
                  className="w-full bg-[#F4F1F3] text-sm text-[#2D2329] px-4 py-3 rounded-xl border border-transparent focus:outline-none focus:border-[#6B4355] focus:bg-white font-medium transition-all"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-[#8C8289] mb-1">
                  Est. Time (Minutes)
                </label>
                <input
                  type="number"
                  name="estimatedTimeMinutes"
                  value={formData.estimatedTimeMinutes}
                  onChange={handleChange}
                  placeholder="e.g. 25"
                  className="w-full bg-[#F4F1F3] text-sm text-[#2D2329] px-4 py-3 rounded-xl border border-transparent focus:outline-none focus:border-[#6B4355] focus:bg-white font-medium transition-all"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Journey Route */}
          <div className="space-y-4 pt-4">
            <div className="flex items-center gap-2 text-[#6B4355] font-bold text-sm border-b border-[#F4EFF2] pb-3">
              <MapPin className="w-4 h-4" />
              <span>Journey Route</span>
            </div>

            <div className="space-y-3">
              <div>
                <input
                  type="text"
                  name="startingLocation"
                  value={formData.startingLocation}
                  onChange={handleChange}
                  placeholder="Starting Location"
                  className="w-full bg-[#F4F1F3] text-sm text-[#2D2329] px-4 py-3 rounded-xl border border-transparent focus:outline-none focus:border-[#6B4355] focus:bg-white font-medium transition-all"
                />
              </div>

              <div>
                <input
                  type="text"
                  name="destination"
                  required
                  value={formData.destination}
                  onChange={handleChange}
                  placeholder="Destination"
                  className="w-full bg-[#F4F1F3] text-sm text-[#2D2329] px-4 py-3 rounded-xl border border-transparent focus:outline-none focus:border-[#6B4355] focus:bg-white font-medium transition-all"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Additional Details */}
          <div className="space-y-4 pt-4">
            <div className="flex items-center gap-2 text-[#6B4355] font-bold text-sm border-b border-[#F4EFF2] pb-3">
              <FileText className="w-4 h-4" />
              <span>Additional Details</span>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-[#8C8289] mb-1">
                  Driver Description
                </label>
                <textarea
                  rows={2}
                  name="driverDescription"
                  value={formData.driverDescription}
                  onChange={handleChange}
                  placeholder="Describe clothing, age, or physical features..."
                  className="w-full bg-[#F4F1F3] text-sm text-[#2D2329] px-4 py-3 rounded-xl border border-transparent focus:outline-none focus:border-[#6B4355] focus:bg-white font-medium transition-all resize-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-[#8C8289] mb-1">
                  Journey Notes
                </label>
                <textarea
                  rows={2}
                  name="journeyNotes"
                  value={formData.journeyNotes}
                  onChange={handleChange}
                  placeholder="Any special instructions or observations..."
                  className="w-full bg-[#F4F1F3] text-sm text-[#2D2329] px-4 py-3 rounded-xl border border-transparent focus:outline-none focus:border-[#6B4355] focus:bg-white font-medium transition-all resize-none"
                />
              </div>
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-end gap-4 pt-6 border-t border-[#F4EFF2]">
            <button
              type="button"
              onClick={() => navigate('/')}
              className="px-6 py-3 rounded-full border border-[#EFEAEB] text-xs font-bold text-[#6E656B] hover:bg-[#F9F6F7] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-8 py-3 bg-[#6B4355] hover:bg-[#5C3A48] text-white font-bold text-xs rounded-full shadow-md transition-all active:scale-95 disabled:opacity-50 flex items-center gap-2"
            >
              <ShieldCheck className="w-4 h-4" />
              {loading ? 'Saving...' : 'Save Journey'}
            </button>
          </div>
        </div>

        {/* Right 1 Column: Cards matching Figma Screen 2 */}
        <div className="space-y-6">
          {/* Card 1: Upload Photo */}
          <div className="bg-white p-6 rounded-3xl border border-[#EFEAEB] shadow-card text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-[#FDE8EC] text-[#6B4355] flex items-center justify-center mx-auto">
              <Camera className="w-6 h-6 text-[#6B4355]" />
            </div>
            <h4 className="font-bold text-sm text-[#2D2329]">Upload Photo</h4>
            <p className="text-xs text-[#8C8289] font-medium leading-relaxed">
              Capture vehicle plate or driver for added safety verification.
            </p>
            <button
              type="button"
              className="w-full py-2.5 bg-[#FDF7F9] hover:bg-[#F4ECEF] text-[#6B4355] text-xs font-bold rounded-xl border border-[#F3E6EC] transition-colors"
            >
              Choose Image File
            </button>
          </div>

          {/* Card 2: Route Safety Map Preview */}
          <div className="bg-white p-4 rounded-3xl border border-[#EFEAEB] shadow-card space-y-3">
            <div className="relative h-44 rounded-2xl overflow-hidden bg-[#F4F1F3] border border-[#EFEAEB] flex items-center justify-center">
              <img
                src="https://images.unsplash.com/photo-1524661135-423995f22d0b?auto=format&fit=crop&w=600&q=80"
                alt="Route Safety Map"
                className="w-full h-full object-cover opacity-80"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#2D2329]/80 to-transparent"></div>
              <div className="absolute bottom-3 left-3 right-3 text-white flex items-center justify-between">
                <div>
                  <span className="text-[10px] uppercase font-bold tracking-wider text-rose-200">
                    Route Safety
                  </span>
                  <h5 className="text-xs font-extrabold flex items-center gap-1">
                    Clear & Monitored
                  </h5>
                </div>
                <CheckCircle className="w-5 h-5 text-emerald-400" />
              </div>
            </div>
          </div>

          {/* Card 3: Safety Pro-tip */}
          <div className="bg-[#F4EEF7] p-6 rounded-3xl border border-[#EBE3F2] space-y-2">
            <div className="flex items-center gap-2 text-[#6B4355] font-bold text-xs">
              <Lightbulb className="w-4 h-4 text-[#6B4355]" />
              <span>Safety Pro-tip</span>
            </div>
            <p className="text-xs text-[#6E656B] font-medium leading-relaxed">
              Always share your live location with at least one trusted contact when using unregistered transport.
            </p>
          </div>
        </div>
      </form>
    </div>
  );
};
