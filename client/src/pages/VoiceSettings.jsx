import React, { useState, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import API from '../services/api';
import {
  Mic,
  Lock,
  Eye,
  EyeOff,
  ShieldCheck,
  CheckCircle,
  Radio,
  ArrowRight,
  Sparkles,
} from 'lucide-react';

export const VoiceSettings = () => {
  const { user, updateUserProfile } = useContext(AuthContext);

  const [phrase, setPhrase] = useState(
    user?.emergencyPhrase || 'Lavender Moonlight'
  );
  const [showPhrase, setShowPhrase] = useState(false);
  const [systemActive, setSystemActive] = useState(true);
  const [sensitivity, setSensitivity] = useState(85);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  const handleSavePhrase = async () => {
    setSaving(true);
    setMessage('');
    try {
      const { data } = await API.put('/auth/profile', {
        emergencyPhrase: phrase,
      });
      updateUserProfile(data);
      setMessage('Emergency voice phrase updated successfully!');
    } catch (err) {
      console.error('Failed to update voice phrase:', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Heading & System Active Toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-[#6B4355] tracking-tight">
            Voice Trigger
          </h1>
          <p className="text-xs text-[#8C8289] font-medium mt-1">
            Configure your silent guardian. Choose a phrase that only you know to activate emergency services instantly.
          </p>
        </div>

        <div className="flex items-center gap-3 bg-white px-5 py-2.5 rounded-full border border-[#EFEAEB] shadow-sm self-start sm:self-auto">
          <span className="text-xs font-bold text-[#2D2329]">
            System Active
          </span>
          <button
            onClick={() => setSystemActive(!systemActive)}
            className={`w-12 h-6 rounded-full transition-colors relative p-1 ${
              systemActive ? 'bg-[#6B4355]' : 'bg-[#EAD9E3]'
            }`}
          >
            <div
              className={`w-4 h-4 rounded-full bg-white transition-transform ${
                systemActive ? 'translate-x-6' : 'translate-x-0'
              }`}
            ></div>
          </button>
        </div>
      </div>

      {message && (
        <div className="p-3 bg-[#FDF7F9] text-[#6B4355] text-xs font-bold rounded-xl border border-[#F3E6EC]">
          {message}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Columns matching Figma Screen 4 */}
        <div className="lg:col-span-2 space-y-6">
          {/* Card 1: Secret Activation Phrase */}
          <div className="bg-white p-8 rounded-3xl border border-[#EFEAEB] shadow-card space-y-4">
            <div className="flex items-center gap-2 text-[#6B4355] font-bold text-sm">
              <Lock className="w-4 h-4" />
              <span>Secret Activation Phrase</span>
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-[#8C8289] mb-1.5">
                Your Emergency Phrase
              </label>
              <div className="relative">
                <input
                  type={showPhrase ? 'text' : 'password'}
                  value={phrase}
                  onChange={(e) => setPhrase(e.target.value)}
                  placeholder="e.g. Lavender Moonlight"
                  className="w-full bg-[#F4F1F3] text-sm font-semibold text-[#2D2329] pl-4 pr-12 py-3.5 rounded-2xl border border-transparent focus:outline-none focus:border-[#6B4355] focus:bg-white transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPhrase(!showPhrase)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-[#8C8289] hover:text-[#6B4355]"
                >
                  {showPhrase ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
              <p className="text-[11px] text-[#8C8289] italic mt-2">
                Avoid common words. Use a short sentence that you can say naturally but clearly in high-stress situations.
              </p>
            </div>

            <button
              onClick={handleSavePhrase}
              disabled={saving}
              className="px-6 py-2.5 bg-[#6B4355] hover:bg-[#5C3A48] text-white text-xs font-bold rounded-xl transition-all shadow-sm"
            >
              {saving ? 'Updating...' : 'Save Secret Phrase'}
            </button>
          </div>

          {/* Card 2: Microphone Calibration */}
          <div className="bg-white p-8 rounded-3xl border border-[#EFEAEB] shadow-card space-y-6">
            <div className="flex items-center justify-between border-b border-[#F4EFF2] pb-3">
              <div className="flex items-center gap-2 text-[#6B4355] font-bold text-sm">
                <Mic className="w-4 h-4" />
                <span>Microphone Calibration</span>
              </div>
              <span className="px-3 py-1 bg-[#FDE8EC] text-[#D93856] text-[10px] font-extrabold rounded-full uppercase flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[#D93856] animate-pulse"></span>
                Testing Live
              </span>
            </div>

            {/* Waveform Visualizer simulation */}
            <div className="bg-[#F4F1F3] p-6 rounded-2xl flex items-center justify-center gap-1.5 h-24">
              {[30, 45, 20, 65, 90, 40, 80, 100, 50, 75, 95, 30, 60, 40].map(
                (h, i) => (
                  <div
                    key={i}
                    style={{ height: `${h}%` }}
                    className="w-1.5 bg-[#6B4355] rounded-full transition-all duration-300 animate-pulse"
                  ></div>
                )
              )}
            </div>

            {/* Sensitivity Level Slider */}
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs font-extrabold text-[#2D2329]">
                <span className="uppercase text-[#8C8289] tracking-wider text-[11px]">
                  Sensitivity Level
                </span>
                <span className="text-[#6B4355]">High ({sensitivity}%)</span>
              </div>

              <input
                type="range"
                min="0"
                max="100"
                value={sensitivity}
                onChange={(e) => setSensitivity(e.target.value)}
                className="w-full accent-[#6B4355] bg-[#EAD9E3] h-2 rounded-lg cursor-pointer"
              />

              <div className="flex items-center justify-between text-[11px] font-semibold text-[#8C8289]">
                <span>Whisper</span>
                <span>Standard</span>
                <span>Loud</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right 1 Column matching Figma Screen 4 */}
        <div className="space-y-6">
          {/* Card 1: Privacy First Checklist */}
          <div className="bg-white p-6 rounded-3xl border border-[#EFEAEB] shadow-card space-y-4">
            <div className="flex items-center gap-2 text-[#6B4355] font-bold text-sm">
              <ShieldCheck className="w-4 h-4" />
              <span>Privacy First</span>
            </div>

            <ul className="space-y-3 text-xs text-[#6E656B] font-medium">
              <li className="flex items-start gap-2.5">
                <CheckCircle className="w-4 h-4 text-[#6B4355] shrink-0 mt-0.5" />
                <span>
                  Voice data is processed locally on your device. We never store recordings on our servers.
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <CheckCircle className="w-4 h-4 text-[#6B4355] shrink-0 mt-0.5" />
                <span>
                  The "Listening" mode only scans for your specific phrase and ignores other conversations.
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <CheckCircle className="w-4 h-4 text-[#6B4355] shrink-0 mt-0.5" />
                <span>
                  Encrypted connection ensures your location is only shared when the trigger is activated.
                </span>
              </li>
            </ul>
          </div>

          {/* Card 2: Always On Banner */}
          <div className="relative rounded-3xl overflow-hidden h-44 p-6 text-white flex flex-col justify-end shadow-card">
            <img
              src="https://images.unsplash.com/photo-1519501025264-65ba15a82390?auto=format&fit=crop&w=600&q=80"
              alt="City Night Security"
              className="absolute inset-0 w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#2D2329]/90 to-transparent"></div>
            <div className="relative z-10 space-y-1">
              <h4 className="text-base font-extrabold">Always On, Always Safe</h4>
              <p className="text-xs text-[#EAD9E3] font-medium">
                Your commute, protected by PathProhori Intelligence.
              </p>
            </div>
          </div>

          {/* Big CTA Button matching Figma Screen 4 */}
          <button className="w-full py-4 bg-[#6B4355] hover:bg-[#5C3A48] text-white font-extrabold text-sm rounded-full shadow-lg flex items-center justify-center gap-2 transition-all active:scale-95">
            <span>Go to Listening Screen</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
