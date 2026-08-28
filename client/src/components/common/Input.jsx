import React from 'react';

export const Input = ({ label, error, className = '', labelClassName = '', ...props }) => {
  return (
    <div className="space-y-1.5 w-full">
      {label && (
        <label className={`block text-xs font-bold text-slate-700 uppercase tracking-wider font-display ${labelClassName}`}>
          {label}
        </label>
      )}
      <input
        className={`w-full px-4 py-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 focus:bg-white transition-all duration-200 placeholder:text-slate-400 font-medium ${
          error ? 'border-rose-500 ring-2 ring-rose-500/20' : ''
        } ${className}`}
        {...props}
      />
      {error && <p className="text-xs text-rose-600 font-semibold mt-1">{error}</p>}
    </div>
  );
};

export default Input;

