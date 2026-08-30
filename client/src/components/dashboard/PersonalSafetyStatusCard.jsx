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
      className={`rounded-2xl p-5 sm:p-6 transition-all border shadow-soft relative overflow-hidden ${
        isUnsafe
          ? 'bg-gradient-to-r from-red-50 via-rose-50 to-red-100/60 border-red-300 text-slate-900 shadow-red-500/10'
          : 'bg-gradient-to-r from-white via-slate-50/50 to-emerald-50/30 border-slate-200 text-slate-900'
      }`}
    >
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5 relative z-10">
        {/* Left Status Info */}
        <div className="flex items-start sm:items-center gap-4 flex-1">
          <div
            className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 transition-all shadow-sm ${
              isUnsafe
                ? 'bg-red-600 text-white shadow-md radar-danger'
                : 'bg-emerald-600 text-white shadow-emerald-600/20'
            }`}
          >
            {isUnsafe ? (
              <AlertTriangle className="w-7 h-7 animate-pulse" />
            ) : (
              <ShieldCheck className="w-7 h-7" />
            )}
          </div>

          <div className="space-y-1.5 flex-1">
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

            <h3 className="text-lg sm:text-xl font-black text-slate-950 tracking-tight font-display">
              {isUnsafe ? 'Active Alert: Emergency Contacts Notified' : 'Personal Safety Telemetry'}
            </h3>

            <p className="text-xs sm:text-[13px] text-slate-700 font-semibold max-w-2xl leading-relaxed">
              {isUnsafe
                ? 'Your linked guardians have received your urgent check-in alert, live reverse-geocoded coordinates, and distress broadcast.'
                : 'Tap "I Feel Unsafe" at any moment to silently dispatch your real-time GPS location and telemetry check-in to your guardians.'}
            </p>
          </div>
        </div>

        {/* Center / Right: Pathao-style Visual Vector Art & Minimal Clean Toggle Button */}
        <div className="flex items-center justify-between sm:justify-end gap-5 shrink-0">
          {/* Subtle Vector Art filling the card gap */}
          <div className="hidden md:flex items-center shrink-0">
            <GuardianShieldVector className="w-20 h-20 opacity-90 hover:opacity-100 hover:scale-105 transition-all duration-300 drop-shadow-sm" />
          </div>

          {/* Minimal Clean Symmetric Dual-State Toggle Switch */}
          <div
            role="switch"
            aria-checked={isUnsafe}
            tabIndex={0}
            onClick={() => {
              if (!loading) {
                handleUpdateStatus(isUnsafe ? 'SAFE' : 'UNSAFE');
              }
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                if (!loading) handleUpdateStatus(isUnsafe ? 'SAFE' : 'UNSAFE');
              }
            }}
            title={isUnsafe ? 'Click to toggle Safe' : 'Click to toggle Unsafe'}
            className={`relative h-11 w-52 sm:w-56 rounded-full p-1 transition-all duration-300 cursor-pointer select-none border flex items-center shadow-inner ${
              isUnsafe
                ? 'bg-red-100 border-red-300 ring-2 ring-red-400/30'
                : 'bg-slate-100 border-slate-300 ring-2 ring-emerald-400/20 hover:border-slate-400'
            }`}
          >
            {/* Sliding Active Pill Indicator */}
            <div
              className={`absolute h-9 w-[100px] sm:w-[108px] rounded-full shadow-md transition-all duration-300 ease-out flex items-center justify-center gap-1.5 font-black text-xs text-white z-20 ${
                isUnsafe
                  ? 'left-[102px] sm:left-[110px] bg-red-600 shadow-red-600/40'
                  : 'left-1 bg-emerald-600 shadow-emerald-600/30'
              }`}
            >
              {loading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
              ) : isUnsafe ? (
                <>
                  <AlertTriangle className="w-3.5 h-3.5 text-white animate-pulse" />
                  <span>UNSAFE</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                  <span>SAFE</span>
                </>
              )}
            </div>

            {/* Left Option: Safe */}
            <div
              className={`w-1/2 text-center text-xs font-black transition-colors duration-200 z-10 select-none flex items-center justify-center gap-1 ${
                !isUnsafe ? 'text-transparent' : 'text-slate-600 hover:text-emerald-700'
              }`}
            >
              {isUnsafe && <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />}
              <span>Safe</span>
            </div>

            {/* Right Option: Unsafe */}
            <div
              className={`w-1/2 text-center text-xs font-black transition-colors duration-200 z-10 select-none flex items-center justify-center gap-1 ${
                isUnsafe ? 'text-transparent' : 'text-slate-600 hover:text-red-700'
              }`}
            >
              {!isUnsafe && <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />}
              <span>Unsafe</span>
            </div>
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
          <span>{statusMessage}</span>
        </div>
      )}
    </div>
  );
};

export default PersonalSafetyStatusCard;
