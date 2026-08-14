import React from 'react';

export const LoadingSpinner = ({ label = 'Loading...' }) => {
  return (
    <div className="flex flex-col items-center justify-center p-12 space-y-3">
      <div className="w-10 h-10 border-4 border-[#6B4355]/20 border-t-[#6B4355] rounded-full animate-spin"></div>
      <p className="text-xs font-semibold text-[#8C7A87] tracking-wide">{label}</p>
    </div>
  );
};

export default LoadingSpinner;
