import React from 'react';

export const Badge = ({ children, variant = 'default', className = '' }) => {
  const variantStyles = {
    default: 'bg-slate-100 text-slate-800 border-slate-200',
    highAlert: 'bg-red-50 text-red-700 border-red-200 font-semibold',
    medSeverity: 'bg-amber-50 text-amber-700 border-amber-200 font-semibold',
    lowSeverity: 'bg-emerald-50 text-emerald-700 border-emerald-200 font-semibold',
    verified: 'bg-sky-50 text-sky-700 border-sky-200 font-semibold',
    emergency: 'bg-red-600 text-white border-red-600 font-bold',
    safe: 'bg-emerald-600 text-white border-emerald-600 font-bold',
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs border font-medium tracking-normal ${
        variantStyles[variant] || variantStyles.default
      } ${className}`}
    >
      {children}
    </span>
  );
};

export default Badge;
