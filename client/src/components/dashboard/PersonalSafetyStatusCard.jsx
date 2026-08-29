import React, { useState, useContext, useEffect } from 'react';
import { AuthContext } from '../../context/AuthContext';
import { SocketContext } from '../../context/SocketContext';
import API from '../../api/axiosConfig';
import { ShieldCheck, AlertTriangle, CheckCircle2, MapPin, Loader2, Radio } from 'lucide-react';

export const PersonalSafetyStatusCard = () => {
  const { user, setUser } = useContext(AuthContext);
  const { socket } = useContext(SocketContext);
  const [safetyStatus, setSafetyStatus] = useState(user?.safetyStatus || 'SAFE');
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');

  useEffect(() => {
    if (user?.safetyStatus) {
      setSafetyStatus(user.safetyStatus);
    }
  }, [user?.safetyStatus]);

  // Listen to real-time hazard proximity or status changes from server
  useEffect(() => {
    if (!socket) return;

    const handleHazardAlert = (data) => {
      if (data.userId && user?._id && String(data.userId) !== String(user._id)) return;
      if (data.safetyStatus) {
        setSafetyStatus(data.safetyStatus);
        if (setUser) {
          setUser((prev) => ({
            ...prev,
            safetyStatus: data.safetyStatus,
          }));
        }
        setStatusMessage(data.message || '⚠️ Proximity Alert: Within 100m of community verified hazard!');
      }
    };

    const handleStatusChanged = (data) => {
      if (data.userId && user?._id && String(data.userId) !== String(user._id)) return;
      if (data.safetyStatus) {
        setSafetyStatus(data.safetyStatus);
        if (setUser) {
          setUser((prev) => ({
            ...prev,
            safetyStatus: data.safetyStatus,
          }));
        }
        if (data.safetyStatus === 'UNSAFE') {
          setStatusMessage(data.message || '⚠️ Status updated to UNSAFE due to nearby high alert hazard.');
        } else {
          setStatusMessage('Status is SAFE.');
        }
      }
    };

    socket.on('HAZARD_PROXIMITY_DETECTED', handleHazardAlert);
    socket.on('USER_SAFETY_STATUS_CHANGED', handleStatusChanged);

    return () => {
      socket.off('HAZARD_PROXIMITY_DETECTED', handleHazardAlert);
      socket.off('USER_SAFETY_STATUS_CHANGED', handleStatusChanged);
    };
  }, [socket, user?._id, setUser]);

  const handleUpdateStatus = async (nextStatus) => {
    setLoading(true);
    setStatusMessage('');

    let coords = null;
    if (nextStatus === 'UNSAFE' && 'geolocation' in navigator) {
      try {
        coords = await new Promise((resolve) => {
          navigator.geolocation.getCurrentPosition(
            (pos) => resolve({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
            () => resolve(null),
            { timeout: 4000, enableHighAccuracy: true }
          );
        });
      } catch (e) { }
    }

    try {
      const payload = {
        safetyStatus: nextStatus,
        latitude: coords?.latitude,
        longitude: coords?.longitude,
      };

      const { data } = await API.post('/auth/safety-status', payload);
      setSafetyStatus(nextStatus);

      if (setUser) {
        setUser((prev) => ({
          ...prev,
          safetyStatus: nextStatus,
          safetyStatusLocation: data.safetyStatusLocation || prev?.safetyStatusLocation,
        }));
      }

      if (nextStatus === 'UNSAFE') {
        setStatusMessage(' Emergency contacts notified! Your location has been shared with your guardians.');
      } else {
        setStatusMessage(' You are marked safe. Guardians notified.');
      }
    } catch (err) {
      console.error('Failed to update safety feeling status:', err);
      setStatusMessage('Failed to update status. Please check connection.');
    } finally {
      setLoading(false);
    }
  };

  const isUnsafe = safetyStatus === 'UNSAFE';

  return (
    <div
      className={`rounded-3xl p-5 sm:p-6 transition-all duration-300 border shadow-card relative overflow-hidden ${isUnsafe
          ? 'bg-gradient-to-r from-rose-950 via-slate-900 to-amber-950 border-rose-500/50 text-white shadow-rose-950/20'
          : 'bg-white/95 backdrop-blur-xl border-slate-200/90 text-slate-900 shadow-sm'
        }`}
    >
      {/* Ambient background glow if unsafe */}
      {isUnsafe && (
        <div className="absolute top-0 right-0 w-72 h-72 bg-rose-500/10 rounded-full blur-3xl pointer-events-none" />
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Left Status Info */}
        <div className="flex items-start sm:items-center gap-3.5">
          <div
            className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-md transition-all ${isUnsafe
                ? 'bg-rose-600 text-white animate-pulse ring-4 ring-rose-500/30'
                : 'bg-emerald-500 text-white'
              }`}
          >
            {isUnsafe ? (
              <AlertTriangle className="w-6 h-6 animate-bounce" />
            ) : (
              <ShieldCheck className="w-6 h-6" />
            )}
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest font-display ${isUnsafe
                    ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 animate-pulse'
                    : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                  }`}
              >
                <span className={`w-2 h-2 rounded-full ${isUnsafe ? 'bg-rose-400 animate-ping' : 'bg-emerald-500'}`} />
                {isUnsafe ? 'Feeling Unsafe Alert Active' : 'Status: Marked Safe'}
              </span>

              <span className={`text-[10px] font-bold ${isUnsafe ? 'text-slate-300' : 'text-slate-400'}`}>
                Independent of Journeys
              </span>
            </div>

            <h3 className={`text-base sm:text-lg font-black font-display tracking-tight ${isUnsafe ? 'text-white' : 'text-slate-900'}`}>
              {isUnsafe ? 'You are marked Unsafe' : 'Feeling safe right now?'}
            </h3>

            <p className={`text-xs font-medium max-w-xl ${isUnsafe ? 'text-rose-200/90' : 'text-slate-500'}`}>
              {isUnsafe
                ? 'Your emergency guardians have received your alert and live GPS location. Keep your phone accessible.'
                : 'Tap "I Feel Unsafe" at any moment — walking, shopping, or in transit — to silently broadcast a location check-in alert to your guardians.'}
            </p>
          </div>
        </div>

        {/* Right Action Button */}
        <div className="shrink-0 flex items-center gap-2">
          {isUnsafe ? (
            <button
              onClick={() => handleUpdateStatus('SAFE')}
              disabled={loading}
              className="w-full sm:w-auto px-5 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold rounded-2xl text-xs transition-all shadow-md active:scale-95 cursor-pointer flex items-center justify-center gap-2 font-display uppercase tracking-wider"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin text-white" />
              ) : (
                <CheckCircle2 className="w-4 h-4 text-emerald-200" />
              )}
              <span>I Am Safe Now (Mark Safe)</span>
            </button>
          ) : (
            <button
              onClick={() => handleUpdateStatus('UNSAFE')}
              disabled={loading}
              className="w-full sm:w-auto px-5 py-3 bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white font-extrabold rounded-2xl text-xs transition-all shadow-md active:scale-95 cursor-pointer flex items-center justify-center gap-2 font-display uppercase tracking-wider shadow-rose-950/20"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin text-white" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-amber-200 animate-pulse" />
              )}
              <span>I Feel Unsafe · Alert Guardians</span>
            </button>
          )}
        </div>
      </div>

      {/* Real-time Confirmation Toast / Feedback Banner */}
      {statusMessage && (
        <div
          className={`mt-3.5 p-3 rounded-xl text-xs font-bold flex items-center gap-2 border transition-all animate-in fade-in duration-200 ${isUnsafe
              ? 'bg-rose-900/60 border-rose-500/50 text-rose-100'
              : 'bg-emerald-50 border-emerald-200 text-emerald-800'
            }`}
        >
          <Radio className={`w-3.5 h-3.5 shrink-0 ${isUnsafe ? 'text-rose-400 animate-spin' : 'text-emerald-600'}`} />
          <span>{statusMessage}</span>
        </div>
      )}
    </div>
  );
};

export default PersonalSafetyStatusCard;
