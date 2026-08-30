import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

const VARIANTS = {
  default: 'bg-white rounded-xl p-5 border border-slate-200/90 shadow-xs',
  elevated: 'bg-white rounded-xl p-5 border border-slate-200 shadow-soft hover-lift',
  interactive: 'bg-white rounded-xl p-5 border border-slate-200/90 shadow-xs hover-lift hover:border-slate-300/80 cursor-pointer',
  glass: 'glass-panel rounded-xl p-5 shadow-xs',
  danger: 'bg-white rounded-xl p-5 border border-red-300 shadow-xs',
  dark: 'bg-slate-950 rounded-xl p-5 border border-slate-800/80 text-white shadow-sm',
};

export const Card = ({ children, variant = 'default', className = '', ...props }) => {
  return (
    <div
      className={twMerge(
        clsx(
          VARIANTS[variant] || VARIANTS.default,
          'transition-all duration-200',
          className
        )
      )}
      {...props}
    >
      {children}
    </div>
  );
};

export default Card;


