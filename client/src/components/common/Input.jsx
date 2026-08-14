import React from 'react';

export const Input = ({ label, error, className = '', ...props }) => {
  return (
    <div className="space-y-1.5 w-full">
      {label && (
        <label className="block text-xs font-bold text-[#6B4355] uppercase tracking-wider">
          {label}
        </label>
      )}
      <input
        className={`w-full px-4 py-3 rounded-2xl bg-[#F9F8FA] border border-[#E0D5DC] text-sm text-[#2D2329] focus:outline-none focus:ring-2 focus:ring-[#6B4355] focus:border-transparent transition-all placeholder-[#9A8B95] ${
          error ? 'border-red-500 ring-1 ring-red-500' : ''
        } ${className}`}
        {...props}
      />
      {error && <p className="text-xs text-red-500 font-medium">{error}</p>}
    </div>
  );
};

export default Input;
