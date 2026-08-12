import React, { useContext } from 'react';
import { Navigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

export const ProtectedRoute = ({ children }) => {
  const { user, loading } = useContext(AuthContext);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F9F8FA]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-[#6B4355] border-t-transparent rounded-full animate-spin"></div>
          <p className="text-xs font-semibold text-[#6B4355]">Loading PATHPROHORI Security...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return children;
};
