import React from 'react';

export const Card = ({ children, className = '', ...props }) => {
  return (
    <div
      className={`bg-white rounded-3xl p-6 shadow-card border border-[#EFEAEF] transition-all hover:shadow-hover ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};

export default Card;
