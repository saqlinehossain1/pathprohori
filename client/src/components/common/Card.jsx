import React from 'react';

export const Card = ({ children, className = '', ...props }) => {
  return (
    <div
      className={`bg-white/95 backdrop-blur-xl rounded-3xl p-6 shadow-card hover:shadow-glass border border-[#EFEAEF] transition-all duration-300 ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};

export default Card;

