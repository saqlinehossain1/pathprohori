import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTrip } from '../hooks/useTrip';
import JourneyForm from '../components/journey/JourneyForm';
import Card from '../components/common/Card';
import { ShieldCheck, Lightbulb, Camera, CheckCircle } from 'lucide-react';

export const LogJourney = () => {
  const navigate = useNavigate();
  const { startTrip } = useTrip();

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
      await startTrip(formData);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to start journey tracking');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div>
        <h1 className="text-3xl font-extrabold text-[#6B4355] tracking-tight">
          Log New Journey
        </h1>
        <p className="text-xs text-[#8C7A87] font-medium mt-1">
          Keep your commute secure. Log your transport details before starting your trip.
        </p>
      </div>

      {error && (
        <div className="p-3 bg-red-50 text-red-600 text-xs font-semibold rounded-2xl border border-red-200">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Columns: Main Form */}
        <Card className="lg:col-span-2">
          <JourneyForm
            formData={formData}
            onChange={handleChange}
            onSubmit={handleSubmit}
            loading={loading}
          />
        </Card>

        {/* Right Column: Safety Guidelines & Photo Attachments */}
        <div className="space-y-6">
          <Card className="bg-gradient-to-br from-[#FDF7F9] to-white border-[#E0D5DC] space-y-4">
            <div className="flex items-center gap-2 text-[#6B4355] font-extrabold text-sm">
              <ShieldCheck className="w-5 h-5 text-emerald-600" />
              <span>Real-Time Protection Features</span>
            </div>

            <ul className="space-y-3 text-xs text-[#4A3D46] font-medium">
              <li className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                <span>Automated 15-second heartbeat ping monitor active once trip begins.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                <span>Instant emergency alert triggers if signal is lost for over 3 minutes.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                <span>Automatic 48-hour privacy purge after safe arrival.</span>
              </li>
            </ul>
          </Card>

          <Card className="space-y-3">
            <div className="flex items-center gap-2 text-[#6B4355] font-extrabold text-sm">
              <Lightbulb className="w-5 h-5 text-amber-500" />
              <span>Commuter Safety Tip</span>
            </div>
            <p className="text-xs text-[#8C7A87] font-medium leading-relaxed">
              Always verify vehicle number plates match before boarding CNGs, buses, or ride-share cars.
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default LogJourney;
