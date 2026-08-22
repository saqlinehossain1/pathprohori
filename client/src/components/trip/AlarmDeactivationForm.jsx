import React, { useState } from 'react';
import { KeyRound } from 'lucide-react';

// Dual-PIN Silent Duress Deactivation entry UI.
// Intentionally shows nothing beyond a plain PIN field - no "Fake PIN" / "Duress PIN"
// hint is ever rendered here, since this is the screen a criminal may be watching.
export const AlarmDeactivationForm = ({ onDeactivate, loading, variant = 'light' }) => {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');

  const isDark = variant === 'dark';

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!/^\d{4}$/.test(pin)) {
      setError('Enter your 4-digit PIN.');
      return;
    }
    try {
      setError('');
      await onDeactivate(pin);
      setPin('');
    } catch (err) {
      setError('Incorrect PIN. Please try again.');
      setPin('');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="space-y-1.5">
        <label
          className={`block text-xs font-bold uppercase tracking-wider font-display ${
            isDark ? 'text-rose-200' : 'text-slate-700'
          }`}
        >
          Enter PIN to deactivate
        </label>
        <input
          type="password"
          inputMode="numeric"
          maxLength="4"
          autoComplete="off"
          placeholder="••••"
          value={pin}
          onChange={(e) => {
            setPin(e.target.value.replace(/\D/g, ''));
            if (error) setError('');
          }}
          className={`w-full px-4 py-3.5 rounded-2xl text-center text-lg tracking-[0.6em] font-black focus:outline-none focus:ring-2 transition-all duration-200 ${
            isDark
              ? 'bg-slate-950/60 border border-white/20 text-white placeholder:text-white/30 focus:ring-rose-400/40 focus:border-rose-400'
              : 'bg-slate-50 border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:ring-rose-500/20 focus:border-rose-500 focus:bg-white'
          } ${error ? (isDark ? 'border-rose-400' : 'border-rose-500 ring-2 ring-rose-500/20') : ''}`}
          required
        />
        {error && (
          <p className={`text-xs font-semibold mt-1 ${isDark ? 'text-rose-300' : 'text-rose-600'}`}>
            {error}
          </p>
        )}
      </div>

      <button
        type="submit"
        disabled={loading || pin.length !== 4}
        className={`w-full py-3.5 rounded-2xl text-sm font-black transition-all duration-200 flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50 disabled:pointer-events-none cursor-pointer font-display ${
          isDark
            ? 'bg-white text-rose-700 hover:bg-rose-50 shadow-lg'
            : 'bg-gradient-to-r from-rose-600 via-rose-500 to-rose-600 hover:from-rose-500 hover:to-rose-700 text-white shadow-md shadow-rose-950/20'
        }`}
      >
        {loading ? (
          <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
        ) : (
          <KeyRound className="w-4 h-4" />
        )}
        <span>Deactivate</span>
      </button>
    </form>
  );
};

export default AlarmDeactivationForm;
