import React from 'react';

export const LoadingSpinner = ({ label = 'Loading...' }) => {
  return (
    <div className="flex flex-col items-center justify-center p-12 space-y-3">
      <div className="w-10 h-10 border-4 border-rose-500/20 border-t-rose-600 rounded-full animate-spin"></div>
      <p className="text-xs font-semibold text-slate-500 tracking-wide font-display">{label}</p>
    </div>
  );
};

export default LoadingSpinner;
