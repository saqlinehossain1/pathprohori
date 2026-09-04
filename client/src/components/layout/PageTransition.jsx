import React from 'react';
import { useLocation } from 'react-router-dom';

export const PageTransition = ({ children }) => {
  const location = useLocation();

  return (
    <div
      key={location.pathname}
      className="animate-page-enter w-full min-h-full flex flex-col"
    >
      {children}
    </div>
  );
};

export default PageTransition;
