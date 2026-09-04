import React, { useContext, useState } from 'react';
import { createPortal } from 'react-dom';
import { VoiceContext } from '../../context/VoiceContext';
import { ShieldAlert, CheckCircle2, Siren, Mic, KeyRound, Loader2, Lock, Radio, AlertTriangle } from 'lucide-react';

export const GlobalVoiceAlarmModal = () => {
  const {
    alarmTimerActive,
    graceCountdown,
    cancelAlarmTimer,
    triggerAlarmNow,
    emergencyActive,
    deactivateAlarm,
    deactivatingAlarm,
  } = useContext(VoiceContext);

  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState('');

  const handleDeactivate = async (e) => {
    e.preventDefault();
    if (!/^\d{4}$/.test(pinInput)) {
      setPinError('Enter your 4-digit PIN.');
      return;
    }
    try {
      setPinError('');
      await deactivateAlarm(pinInput);
      setPinInput('');
    } catch (err) {
      setPinError(err?.response?.data?.message || 'Incorrect PIN. Try again.');
      setPinInput('');
    }
  };

  // Only render if portal document body exists
  if (typeof document === 'undefined') return null;

  // 1. 10-Second Grace Period Countdown Modal
  if (alarmTimerActive) {
    return createPortal(
      <div className="fixed inset-0 z-[10000] bg-slate-950/85 backdrop-blur-xl flex items-center justify-center p-4 animate-in fade-in duration-200">
        <div className="max-w-md w-full bg-gradient-to-b from-slate-900 via-slate-900/95 to-slate-950 border-2 border-amber-500/50 rounded-3xl p-7 text-center space-y-6 shadow-[0_0_80px_rgba(245,158,11,0.25)] text-white animate-in zoom-in-95 duration-300 relative overflow-hidden">
          {/* Ambient Top Glow Halo */}
          <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-72 h-72 bg-amber-500/20 rounded-full blur-3xl pointer-events-none" />

          {/* Top Status Pill */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-amber-500/20 border border-amber-500/40 rounded-full text-[11px] font-black text-amber-300 uppercase tracking-widest font-display shadow-sm">
            <Mic className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
            <span>Voice Emergency Phrase Heard!</span>
          </div>

          {/* Circular SVG Progress Ring with Sonar Pulse Effect */}
          <div className="relative w-36 h-36 mx-auto flex items-center justify-center my-2">
            {/* Outer Pulsing Sonar Ring */}
            <div className="absolute inset-0 rounded-full bg-amber-500/15 animate-ping opacity-60 pointer-events-none" />
            <div className="absolute inset-2 rounded-full border border-amber-500/30 pointer-events-none" />

            {/* SVG Ring */}
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
              {/* Background Ring Track */}
              <circle
                cx="50"
                cy="50"
                r="42"
                className="text-slate-800"
                strokeWidth="7"
                stroke="currentColor"
                fill="transparent"
              />
              {/* Progress Ring Stroke */}
              <circle
                cx="50"
                cy="50"
                r="42"
                stroke="url(#amber-rose-gradient)"
                strokeWidth="7"
                strokeLinecap="round"
                fill="transparent"
                strokeDasharray={263.89}
                strokeDashoffset={263.89 * (1 - graceCountdown / 10)}
                style={{ transition: 'stroke-dashoffset 1s linear' }}
              />
              <defs>
                <linearGradient id="amber-rose-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#F59E0B" />
                  <stop offset="100%" stopColor="#EF4444" />
                </linearGradient>
              </defs>
            </svg>

            {/* Center Countdown Number Display */}
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-4xl font-black font-display tracking-tight text-transparent bg-clip-text bg-gradient-to-b from-amber-200 via-amber-400 to-rose-500 leading-none">
                {graceCountdown}
              </span>
              <span className="text-[10px] font-extrabold text-amber-300/80 uppercase tracking-widest mt-0.5 font-display">
                Seconds
              </span>
            </div>
          </div>

          {/* Header Text */}
          <div className="space-y-1.5">
            <h3 className="text-xl font-black text-white font-display tracking-tight">
              Emergency Alarm Dispatching
            </h3>
            <p className="text-xs text-slate-300 font-medium leading-relaxed max-w-xs mx-auto">
              Live GPS telemetry, emergency siren, and SMS alerts will broadcast to your guardians when the timer hits zero.
            </p>
          </div>

          {/* Callout Notice Card */}
          <div className="p-3 bg-amber-500/10 border border-amber-500/25 rounded-2xl text-[11px] text-amber-200 font-semibold leading-snug flex items-center justify-center gap-2">
            <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0" />
            <span>Spoke phrase accidentally? Tap below to abort immediately.</span>
          </div>

          {/* Action Buttons */}
          <div className="space-y-2.5 pt-1">
            <button
              onClick={cancelAlarmTimer}
              className="w-full py-3.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black rounded-2xl text-xs transition-all shadow-lg shadow-emerald-950/50 active:scale-95 cursor-pointer font-display uppercase tracking-wider flex items-center justify-center gap-2 text-sm"
            >
              <CheckCircle2 className="w-5 h-5 text-emerald-200" />
              <span>Cancel False Alarm (I'm Safe)</span>
            </button>

            <button
              onClick={triggerAlarmNow}
              className="w-full py-2.5 bg-slate-800/90 hover:bg-rose-950/80 text-slate-400 hover:text-rose-300 font-extrabold rounded-xl text-[11px] transition-all cursor-pointer font-display border border-slate-700/60 flex items-center justify-center gap-1.5"
            >
              <Siren className="w-3.5 h-3.5" />
              <span>Skip Timer & Trigger Alarm Now ({graceCountdown}s)</span>
            </button>
          </div>
        </div>
      </div>,
      document.body
    );
  }

  // 2. Emergency Active Standalone Deactivation Modal
  if (emergencyActive) {
    return createPortal(
      <div className="fixed inset-0 z-[10000] bg-slate-950/90 backdrop-blur-xl flex items-center justify-center p-4 animate-in fade-in duration-200">
        <div className="max-w-md w-full bg-slate-900 border-2 border-rose-600/60 rounded-3xl p-6 sm:p-7 text-center space-y-5 shadow-[0_0_80px_rgba(225,29,72,0.35)] text-white animate-in zoom-in-95 duration-300 relative overflow-hidden">
          {/* Pulsing red halo */}
          <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-72 h-72 bg-rose-600/20 rounded-full blur-3xl pointer-events-none" />

          {/* Top Status Header */}
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-rose-500/20 border border-rose-500/40 rounded-full text-xs font-black text-rose-300 uppercase tracking-widest font-display shadow-xs animate-pulse">
            <Radio className="w-4 h-4 text-rose-400 animate-spin" />
            <span>🚨 Emergency SOS Broadcast Active</span>
          </div>

          <div className="space-y-1">
            <h3 className="text-xl font-black text-white font-display">
              Live Distress Signal Dispatched
            </h3>
            <p className="text-xs text-slate-300 font-medium leading-relaxed max-w-xs mx-auto">
              Your guardians have been notified with your GPS coordinates. Enter your 4-digit PIN to disarm.
            </p>
          </div>

          {/* PIN Input Form */}
          <form onSubmit={handleDeactivate} className="space-y-4">
            <div className="space-y-1 text-left">
              <label className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-300 font-display">
                Enter PIN to Deactivate Alarm
              </label>
              <input
                type="password"
                inputMode="numeric"
                maxLength="4"
                autoComplete="off"
                placeholder="••••"
                value={pinInput}
                disabled={deactivatingAlarm}
                onChange={(e) => {
                  setPinInput(e.target.value.replace(/\D/g, ''));
                  if (pinError) setPinError('');
                }}
                className="w-full px-4 py-3.5 rounded-2xl text-center text-xl tracking-[0.6em] font-black focus:outline-none focus:ring-2 focus:ring-rose-500 bg-slate-950/80 border border-white/20 text-white placeholder:text-white/25 transition-all"
              />
            </div>

            {pinError && (
              <div className="p-2.5 bg-rose-500/20 border border-rose-500/40 rounded-xl text-xs text-rose-200 font-bold flex items-center justify-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                <span>{pinError}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={deactivatingAlarm || pinInput.length < 4}
              className="w-full py-3.5 bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white font-black rounded-2xl text-xs transition-all shadow-lg shadow-rose-950/50 active:scale-95 cursor-pointer font-display uppercase tracking-wider flex items-center justify-center gap-2"
            >
              {deactivatingAlarm ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                  <span>Verifying PIN...</span>
                </>
              ) : (
                <>
                  <KeyRound className="w-4 h-4 text-white" />
                  <span>Deactivate Alarm</span>
                </>
              )}
            </button>
          </form>

          <p className="text-[10px] text-slate-400 font-medium">
            (Entering your silent duress PIN disarms the local screen while secretly notifying emergency operators of coercion).
          </p>
        </div>
      </div>,
      document.body
    );
  }

  return null;
};

export default GlobalVoiceAlarmModal;
