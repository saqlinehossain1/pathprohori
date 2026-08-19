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
    'relative inline-flex items-center justify-center font-bold rounded-2xl transition-all duration-300 active:scale-95 disabled:opacity-50 disabled:pointer-events-none btn-shiny-effect group cursor-pointer overflow-hidden font-display';

  const sizeStyles = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-4 py-2.5 text-sm',
    lg: 'px-6 py-3.5 text-base',
  };

  const variantStyles = {
    primary:
      'bg-gradient-to-r from-rose-600 via-rose-500 to-rose-600 hover:from-rose-500 hover:to-rose-700 text-white shadow-md shadow-rose-950/20 transition-all',
    secondary:
      'bg-slate-900 hover:bg-slate-800 text-white shadow-sm border border-slate-800 transition-all',
    danger:
      'bg-gradient-to-r from-red-600 to-rose-700 text-white shadow-lg shadow-rose-900/30 hover:from-red-700 hover:to-rose-800 animate-pulse',
    ghost: 'text-slate-700 hover:bg-rose-50 hover:text-rose-600',
  };

  return (
    <button
      className={`${baseStyles} ${sizeStyles[size]} ${variantStyles[variant]} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
      ) : null}
      <span className="relative z-10 inline-flex items-center justify-center gap-2">
        {children}
      </span>
    </button>
  );
};

export default Button;
