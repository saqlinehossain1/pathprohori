import React, { useState, useContext, useEffect } from 'react';
import { AuthContext } from '../../context/AuthContext';
import { SocketContext } from '../../context/SocketContext';
import API from '../../api/axiosConfig';
import { ShieldCheck, AlertTriangle, CheckCircle2, MapPin, Loader2, Radio } from 'lucide-react';
import { GuardianShieldVector } from '../common/DashboardVectors';

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
      className={`rounded-2xl p-4 sm:p-6 transition-all border shadow-soft relative overflow-hidden ${
        isUnsafe
          ? 'bg-gradient-to-r from-red-50 via-rose-50 to-red-100/60 border-red-300 text-slate-900 shadow-red-500/10'
          : 'bg-gradient-to-r from-white via-slate-50/50 to-emerald-50/30 border-slate-200 text-slate-900'
      }`}
    >
      <div className="flex min-w-0 flex-col gap-5 relative z-10 lg:flex-row lg:items-center lg:justify-between">
        {/* Left Status Info */}
        <div className="flex min-w-0 items-start gap-3 sm:gap-4 sm:items-center lg:flex-1">
          <div
            className={`w-12 h-12 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center shrink-0 transition-all shadow-sm ${
              isUnsafe
                ? 'bg-red-600 text-white shadow-md radar-danger'
                : 'bg-emerald-600 text-white shadow-emerald-600/20'
            }`}
          >
            {isUnsafe ? (
              <AlertTriangle className="w-6 h-6 sm:w-7 sm:h-7 animate-pulse" />
            ) : (
              <ShieldCheck className="w-6 h-6 sm:w-7 sm:h-7" />
            )}
          </div>

          <div className="min-w-0 flex-1 space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase tracking-widest border shadow-2xs ${
                  isUnsafe
                    ? 'bg-red-100 text-red-900 border-red-300'
                    : 'bg-emerald-100 text-emerald-900 border-emerald-300'
                }`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${isUnsafe ? 'bg-red-600 animate-ping' : 'bg-emerald-600'}`} />
                {isUnsafe ? 'DISTRESS SIGNAL BROADCAST' : 'TELEMETRY ACTIVE · MARKED SAFE'}
              </span>

              <span className="inline-flex items-center gap-1 text-[11px] text-slate-700 font-bold px-2 py-0.5 bg-slate-100 rounded-md border border-slate-200">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                Real-time Guardian Sync
              </span>
            </div>

            <h3 className="text-base sm:text-xl font-black text-slate-950 tracking-tight font-display">
                {isUnsafe ? 'Active Alert: Emergency Contacts Notified' : 'Personal Safety Telemetry'}
            </h3>

            <p className="max-w-2xl break-words text-xs font-semibold leading-relaxed text-slate-700 sm:text-[13px]">
              {isUnsafe
                ? 'Your linked guardians have received your urgent check-in alert, live reverse-geocoded coordinates, and distress broadcast.'
                : 'Tap "I Feel Unsafe" at any moment to silently dispatch your real-time GPS location and telemetry check-in to your guardians.'}
            </p>
          </div>
        </div>

        {/* Center / Right: Pathao-style Visual Vector Art & Minimal Clean Toggle Button */}
        <div className="flex w-full items-center justify-center gap-5 shrink-0 sm:justify-center lg:w-auto lg:justify-end">
          {/* Subtle Vector Art filling the card gap */}
          <div className="hidden md:flex items-center shrink-0">
            <GuardianShieldVector className="w-20 h-20 opacity-90 hover:opacity-100 hover:scale-105 transition-all duration-300 drop-shadow-sm" />
          </div>

          {/* Minimal Clean Symmetric Dual-State Toggle Switch */}
          <div
            role="group"
            aria-label="Safety status toggle"
            className={`relative flex h-11 sm:h-12 w-full max-w-[260px] sm:w-[264px] shrink-0 items-center rounded-full p-1 border transition-all duration-300 shadow-inner select-none ${
              isUnsafe
                ? 'bg-red-100/90 border-red-300 ring-2 ring-red-400/30'
                : 'bg-slate-100 border-slate-300 ring-2 ring-emerald-500/20 hover:border-slate-400'
            }`}
          >
            {/* Sliding Active Pill Indicator */}
            <div
              aria-hidden="true"
              className={`absolute top-1 bottom-1 left-1 w-[calc(50%-4px)] rounded-full shadow-md transition-all duration-300 ease-out z-0 pointer-events-none ${
                isUnsafe
                  ? 'translate-x-full bg-red-600 shadow-red-600/40'
                  : 'translate-x-0 bg-emerald-600 shadow-emerald-600/30'
              }`}
            />

            {/* Left Option: SAFE */}
            <button
              type="button"
              disabled={loading}
              onClick={() => {
                if (isUnsafe && !loading) handleUpdateStatus('SAFE');
              }}
              title="Mark status as Safe"
              className={`relative z-10 flex h-full w-1/2 items-center justify-center gap-1.5 rounded-full text-xs font-black transition-colors duration-200 cursor-pointer disabled:opacity-75 disabled:cursor-wait ${
                !isUnsafe
                  ? 'text-white'
                  : 'text-slate-600 hover:text-emerald-700'
              }`}
            >
              {loading && !isUnsafe ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <CheckCircle2 className={`w-3.5 h-3.5 ${!isUnsafe ? 'text-white' : 'text-emerald-600'}`} />
              )}
              <span className="tracking-wider">SAFE</span>
            </button>

            {/* Right Option: UNSAFE */}
            <button
              type="button"
              disabled={loading}
              onClick={() => {
                if (!isUnsafe && !loading) handleUpdateStatus('UNSAFE');
              }}
              title="Signal distress as Unsafe"
              className={`relative z-10 flex h-full w-1/2 items-center justify-center gap-1.5 rounded-full text-xs font-black transition-colors duration-200 cursor-pointer disabled:opacity-75 disabled:cursor-wait ${
                isUnsafe
                  ? 'text-white'
                  : 'text-slate-600 hover:text-red-700'
              }`}
            >
              {loading && isUnsafe ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <AlertTriangle className={`w-3.5 h-3.5 ${isUnsafe ? 'text-white animate-pulse' : 'text-rose-500'}`} />
              )}
              <span className="tracking-wider">UNSAFE</span>
            </button>
          </div>
        </div>
      </div>

      {/* Real-time Confirmation Feedback Banner */}
      {statusMessage && (
        <div
          className={`mt-3.5 p-3 rounded-xl text-xs font-bold flex items-center gap-2 border shadow-2xs ${
            isUnsafe
              ? 'bg-red-100 border-red-300 text-red-900'
              : 'bg-emerald-100 border-emerald-300 text-emerald-900'
          }`}
        >
          <Radio className="w-4 h-4 shrink-0 animate-pulse" />
          <span className="min-w-0 break-words">{statusMessage}</span>
        </div>
      )}
    </div>
  );
};

export default PersonalSafetyStatusCard;
