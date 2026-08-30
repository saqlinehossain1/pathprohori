import React from 'react';

export const Button = ({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  className = '',
  disabled = false,
  ...props
}) => {
  const baseStyles =
    'inline-flex items-center justify-center font-semibold rounded-lg transition-all duration-150 active:scale-[0.98] focus:outline-hidden disabled:opacity-50 disabled:pointer-events-none cursor-pointer select-none text-sm';

  const sizeStyles = {
    sm: 'px-2.5 py-1.5 text-xs gap-1.5',
    md: 'px-3.5 py-2 text-sm gap-2',
    lg: 'px-5 py-2.5 text-base gap-2.5',
  };

  const variantStyles = {
    brand:
      'bg-rose-600 hover:bg-rose-700 text-white shadow-xs border border-rose-600 hover:shadow-sm focus:ring-2 focus:ring-rose-500/30',
    primary:
      'bg-slate-900 hover:bg-slate-800 text-white shadow-xs border border-slate-900 hover:shadow-sm focus:ring-2 focus:ring-slate-500/30',
    secondary:
      'bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 shadow-2xs hover:border-slate-400 focus:ring-2 focus:ring-slate-200',
    outline:
      'bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 shadow-2xs hover:border-slate-400 focus:ring-2 focus:ring-slate-200',
    danger:
      'bg-red-600 hover:bg-red-700 text-white shadow-xs border border-red-600 hover:shadow-sm focus:ring-2 focus:ring-red-500/30',
    success:
      'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs border border-emerald-600 hover:shadow-sm focus:ring-2 focus:ring-emerald-500/30',
    ghost:
      'text-slate-700 hover:text-slate-900 hover:bg-slate-100 border border-transparent hover:border-slate-200 focus:ring-2 focus:ring-slate-200',
  };

  return (
    <button
      className={`${baseStyles} ${sizeStyles[size]} ${variantStyles[variant] || variantStyles.primary} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading && (
        <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-1.5" />
      )}
      <span className="inline-flex items-center justify-center gap-2">
        {children}
      </span>
    </button>
  );
};

export default Button;
