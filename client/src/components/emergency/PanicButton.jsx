import React, { useState, useContext } from 'react';
import { AlertTriangle, Loader2, ShieldAlert, CheckCircle2, StopCircle, Radio, Compass, Lock, Camera, Mic } from 'lucide-react';
import { triggerEmergency, resolveEmergency } from '../../services/emergencyService';
import { captureEvidenceBurst } from '../../services/evidenceLockerService';
import { AuthContext } from '../../context/AuthContext';


export const PanicButton = () => {
  const { user } = useContext(AuthContext);
  const [loading, setLoading] = useState(false);
  const [stopping, setStopping] = useState(false);
  const [emergencyActive, setEmergencyActive] = useState(false);
  const [activeEmergencyId, setActiveEmergencyId] = useState(null);
  const [evidenceStatus, setEvidenceStatus] = useState(null); // 'CAPTURING' | 'COMPLETED' | 'PARTIAL' | null
  const [error, setError] = useState('');

  // Admins and Operators only monitor emergency notifications and do not trigger panic alerts
  if (user?.role === 'admin' || user?.role === 'operator') {
    return null;
  }

  const handleEmergency = () => {
    if (loading || emergencyActive) return;

    if (!navigator.geolocation) {
      setError('GPS location service is not supported by your browser.');
      return;
    }

    setLoading(true);
    setError('');

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords;
          const res = await triggerEmergency(latitude, longitude);

          const emergencyId = res?.emergency?.id || res?.emergency?._id;
          if (emergencyId) {
            setActiveEmergencyId(emergencyId);
            // Initiate silent low-bandwidth background photo burst & audio capture
            setEvidenceStatus('CAPTURING');
            captureEvidenceBurst(emergencyId, {
              onProgress: (p) => {
                console.log('[PanicButton Evidence Progress]', p);
              },
              onComplete: (res) => {
                setEvidenceStatus(res.status);
              },
            }).catch((evErr) => console.warn('[Evidence Locker Error]', evErr));
          }

          setEmergencyActive(true);
          console.log('[PanicButton] Emergency signal dispatched successfully:', {
            latitude,
            longitude,
          });
        } catch (err) {
          console.error('[PanicButton Error]', err);
          setError(
            err.response?.data?.message ||
            'Failed to activate emergency. Please try again or call emergency services.'
          );
        } finally {
          setLoading(false);
        }
      },
      (locationError) => {
        console.error('[PanicButton Location Error]', locationError);
        let errorMsg = 'Unable to retrieve location.';
        if (locationError.code === locationError.PERMISSION_DENIED) {
          errorMsg = 'Location permission denied. Please allow location access to trigger emergency alert.';
        } else if (locationError.code === locationError.POSITION_UNAVAILABLE) {
          errorMsg = 'Location position unavailable. Ensure GPS is enabled.';
        } else if (locationError.code === locationError.TIMEOUT) {
          errorMsg = 'Location request timed out. Please try again.';
        }
        setError(errorMsg);
        setLoading(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  };

  const handleStopEmergency = async () => {
    if (stopping) return;
    setStopping(true);
    setError('');
    try {
      await resolveEmergency(activeEmergencyId);
      setEmergencyActive(false);
      setActiveEmergencyId(null);
      console.log('[PanicButton] Emergency deactivated successfully.');
    } catch (err) {
      console.error('[PanicButton Stop Error]', err);
      setError(err.response?.data?.message || 'Failed to stop emergency alert.');
    } finally {
      setStopping(false);
    }
  };

  return (
    <div className="flex flex-col items-center gap-3 w-full my-1">
      <div className="relative flex items-center justify-center p-3 my-1">
        {/* Soft Background Radial Ambient Glow */}
        <div
          className={`absolute -inset-3 rounded-full blur-xl transition-all duration-500 pointer-events-none ${emergencyActive
              ? 'bg-[#6B4355]/40 animate-pulse'
              : 'bg-[#6B4355]/15 group-hover:bg-[#6B4355]/25'
            }`}
        />

        {/* Pulsing Signal Wave when Emergency Active */}
        {emergencyActive && (
          <>
            <div className="absolute -inset-2 rounded-full bg-[#6B4355]/30 animate-ping opacity-75 pointer-events-none" />
            <div className="absolute -inset-4 rounded-full border-2 border-[#6B4355]/40 animate-pulse pointer-events-none" />
          </>
        )}

        {/* Middle Frosted Glass Ring */}
        <div className="relative p-2 rounded-full bg-white/70 border border-[#E5D8DF] shadow-sm backdrop-blur-sm transition-all duration-300">
          <button
            type="button"
            onClick={handleEmergency}
            disabled={loading || emergencyActive}
            className={`
              relative
              w-32 sm:w-36
              h-32 sm:h-36
              rounded-full
              flex
              flex-col
              items-center
              justify-center
              text-white
              font-black
              transition-all
              duration-300
              transform
              overflow-hidden
              group
              cursor-pointer
              ${emergencyActive
                ? 'bg-gradient-to-br from-[#633E4E] via-[#6B4355] to-[#4C2F3C] border-4 border-[#E5D8DF] cursor-not-allowed scale-100 shadow-[0_0_30px_rgba(107,67,85,0.6)]'
                : loading
                  ? 'bg-gradient-to-br from-[#6B4355] via-[#633E4E] to-[#4C2F3C] opacity-90 cursor-wait'
                  : 'bg-gradient-to-br from-[#6B4355] via-[#633E4E] to-[#4C2F3C] border-4 border-white/30 hover:border-white/50 hover:scale-105 active:scale-95 shadow-[0_10px_25px_-5px_rgba(107,67,85,0.45)] hover:shadow-[0_16px_35px_-5px_rgba(107,67,85,0.6)]'
              }
            `}
          >
            {/* Top Specular Reflection Highlight */}
            <div className="absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/25 to-transparent rounded-t-full pointer-events-none" />

            {loading ? (
              <div className="flex flex-col items-center gap-1.5 z-10">
                <Loader2 className="w-8 h-8 animate-spin text-white drop-shadow-md" />
                <div className="flex flex-col items-center">
                  <span className="text-[10px] font-black uppercase tracking-widest text-[#FDF7F9]">
                    Locating
                  </span>
                  <span className="text-[9px] font-bold text-white/80 flex items-center gap-1">
                    <Compass className="w-3 h-3 animate-spin" /> GPS Lock...
                  </span>
                </div>
              </div>
            ) : emergencyActive ? (
              <div className="flex flex-col items-center gap-1 z-10">
                <div className="p-1.5 bg-white/10 rounded-full border border-white/20 backdrop-blur-sm animate-bounce">
                  <Radio className="w-7 h-7 text-white drop-shadow-lg" />
                </div>
                <span className="text-[11px] font-black uppercase tracking-widest text-white drop-shadow-md">
                  SOS DISPATCHED
                </span>
                <span className="text-[8px] font-extrabold uppercase tracking-wider text-[#FDF7F9] bg-black/20 px-2 py-0.5 rounded-full border border-white/10">
                  LIVE TRACKING
                </span>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-1 z-10">
                <div className="p-1.5 bg-white/10 group-hover:bg-white/20 rounded-full border border-white/20 backdrop-blur-sm transition-all duration-300 group-hover:scale-110">
                  <ShieldAlert className="w-8 h-8 text-white drop-shadow-lg" />
                </div>
                <div className="flex flex-col items-center">
                  <span className="text-xs sm:text-sm font-black uppercase tracking-widest text-white drop-shadow-md">
                    PANIC SOS
                  </span>
                  <span className="text-[9px] font-extrabold uppercase tracking-wider text-[#FDF7F9] opacity-90">
                    1-Tap Alert
                  </span>
                </div>
              </div>
            )}
          </button>
        </div>
      </div>

      {/* Active State & Stop Emergency Option */}
      {emergencyActive && (
        <div className="flex flex-col items-center gap-2 w-full max-w-xs animate-fadeIn mt-1">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#FDF7F9] text-[#633E4E] border border-[#E5D8DF] rounded-full text-xs font-black shadow-sm">
            <span className="w-2 h-2 rounded-full bg-[#6B4355] animate-ping" />
            <span>🚨 Emergency Signal Active</span>
          </div>

          {/* Evidence Locker Silent Progress Feedback */}
          {evidenceStatus && (
            <div className="w-full px-3 py-1.5 bg-slate-900 text-white rounded-xl border border-slate-700 flex items-center justify-between text-[11px] font-mono shadow-xs animate-fadeIn">
              <div className="flex items-center gap-1.5">
                <Lock className="w-3 h-3 text-amber-400" />
                <span className="font-bold text-slate-200">Evidence Locker:</span>
              </div>
              <span className="text-[10px] text-amber-300 font-bold flex items-center gap-1">
                {evidenceStatus === 'CAPTURING' ? (
                  <>
                    <Loader2 className="w-3 h-3 animate-spin text-rose-400" />
                    <span>Securing photos & audio...</span>
                  </>
                ) : evidenceStatus === 'COMPLETED' ? (
                  <>
                    <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                    <span className="text-emerald-400">Vault Uploaded (Encrypted)</span>
                  </>
                ) : (
                  <span>Partial Vault Saved</span>
                )}
              </span>
            </div>
          )}

          <button
            type="button"
            onClick={handleStopEmergency}
            disabled={stopping}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-[#4C2F3C] via-[#6B4355] to-[#4C2F3C] hover:from-[#633E4E] hover:via-[#6B4355] hover:to-[#633E4E] text-white text-xs font-black rounded-2xl shadow-md transition-all duration-200 active:scale-95 cursor-pointer border border-[#6B4355]/40"
          >
            {stopping ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
                <span>Deactivating SOS...</span>
              </>
            ) : (
              <>
                <StopCircle className="w-3.5 h-3.5 text-[#E5D8DF]" />
                <span>Stop Emergency / Cancel SOS</span>
              </>
            )}
          </button>
        </div>
      )}

      {/* Location / Geolocation Error Alert */}
      {error && (
        <div className="w-full max-w-sm bg-white/95 border border-[#E5D8DF] rounded-2xl p-4 shadow-lg backdrop-blur-md text-[#2F2930] space-y-2 text-left animate-fadeIn">
          <div className="flex items-start gap-2 text-[#633E4E] font-extrabold text-xs">
            <AlertTriangle className="w-4.5 h-4.5 shrink-0 text-[#6B4355] mt-0.5" />
            <span>{error}</span>
          </div>
          <div className="text-[11px] text-[#765C6A] font-medium bg-[#FDF7F9] p-2.5 rounded-xl border border-[#E5D8DF] space-y-1">
            <p className="font-bold text-[#2F2930]">💡 How to enable location permissions:</p>
            <p>
              1. Click the site settings icon next to <code className="bg-white px-1.5 py-0.5 rounded border border-[#E5D8DF] font-mono text-[10px] text-[#633E4E]">{typeof window !== 'undefined' ? window.location.host : 'localhost:5173'}</code> in your address bar.
            </p>
            <p>2. Set <strong>Location</strong> to <strong>Allow</strong>, then reload the page.</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default PanicButton;