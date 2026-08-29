import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export const Card = ({ children, className = '', ...props }) => {
  return (
    <div
      className={twMerge(
        clsx(
          'bg-white/95 backdrop-blur-xl rounded-3xl p-6 shadow-card hover:shadow-glass border border-[#EFEAEF] transition-all duration-300',
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

