import React from 'react';

export const Badge = ({ children, variant = 'default', className = '' }) => {
  const variantStyles = {
    default: 'bg-slate-900 text-white border-slate-800 font-display shadow-xs',
    highAlert: 'bg-rose-500/10 text-rose-600 border-rose-500/20 font-extrabold font-display',
    medSeverity: 'bg-amber-500/10 text-amber-600 border-amber-500/20 font-extrabold font-display',
    lowSeverity: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20 font-extrabold font-display',
    verified: 'bg-sky-500/10 text-sky-600 border-sky-500/20 font-extrabold font-display',
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs border font-medium ${
        variantStyles[variant] || variantStyles.default
      } ${className}`}
    >
      {children}
    </span>
  );
};

export default Badge;
