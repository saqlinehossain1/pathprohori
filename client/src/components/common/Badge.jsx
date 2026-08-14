import React from 'react';

export const Badge = ({ children, variant = 'default', className = '' }) => {
  const variantStyles = {
    default: 'bg-[#6B4355]/10 text-[#6B4355] border-[#6B4355]/20',
    highAlert: 'bg-rose-500/10 text-rose-600 border-rose-500/20 font-bold',
    medSeverity: 'bg-amber-500/10 text-amber-600 border-amber-500/20 font-bold',
    lowSeverity: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20 font-bold',
    verified: 'bg-sky-500/10 text-sky-600 border-sky-500/20 font-bold',
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
