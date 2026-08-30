import React from 'react';

export const Input = ({ label, error, className = '', labelClassName = '', ...props }) => {
  return (
    <div className="space-y-1 w-full">
      {label && (
        <label className={`block text-xs font-extrabold text-slate-800 uppercase tracking-wider font-display mb-1 ${labelClassName}`}>
          {label}
        </label>
      )}
      <input
        className={`w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-300 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-600 transition-all placeholder:text-slate-400 shadow-2xs ${
          error ? 'border-red-500 focus:border-red-500 focus:ring-red-500/10' : ''
        } ${className}`}
        {...props}
      />
      {error && <p className="text-xs text-red-600 font-medium mt-1">{error}</p>}
    </div>
  );
};

export default Input;

