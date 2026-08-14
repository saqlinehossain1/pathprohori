import React, { useContext } from 'react';
import { AuthContext } from '../../context/AuthContext';
import { SocketContext } from '../../context/SocketContext';
import { Shield, User, LogOut, Activity } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const Header = () => {
  const { user, logout } = useContext(AuthContext);
  const { isConnected, activeTrip } = useContext(SocketContext);
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="bg-white border-b border-[#EFEAEF] sticky top-0 z-30 shadow-sm transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand Identity with Logo */}
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate('/')}>
          <img
            src="/logo.png"
            alt="PATHPROHORI Logo"
            className="w-9 h-9 object-contain drop-shadow-sm hover:scale-105 transition-transform"
            onError={(e) => {
              e.target.onerror = null;
              e.target.style.display = 'none';
              if (e.target.nextSibling) {
                e.target.nextSibling.style.display = 'flex';
              }
            }}
          />
          <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-[#6B4355] to-[#8C5B72] hidden items-center justify-center text-white shadow-md">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <span className="text-lg font-black tracking-tight text-[#2D2329] block leading-none">
              PATHPROHORI
            </span>
            <span className="text-[10px] font-bold text-[#6B4355] uppercase tracking-wider block mt-0.5">
              Hyperlocal Safety
            </span>
          </div>
        </div>

        {/* Live Network & User Profile Bar */}
        <div className="flex items-center gap-4">
          {/* Socket Connection Live Indicator */}
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#F9F8FA] border border-[#E0D5DC] text-xs font-semibold">
            <span
              className={`w-2 h-2 rounded-full ${
                isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
              }`}
            ></span>
            <span className="text-[#6B4355]">
              {isConnected ? 'Heartbeat Active' : 'Connecting Network'}
            </span>
          </div>

          {/* Active Trip Quick Pill */}
          {activeTrip && (
            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-rose-50 border border-rose-200 text-xs font-bold text-rose-700 animate-pulse">
              <Activity className="w-3.5 h-3.5" />
              <span>Journey Live ({activeTrip.vehicleType})</span>
            </div>
          )}

          {/* User Profile Badge (Clickable to /profile) */}
          {user && (
            <div className="flex items-center gap-3 border-l border-[#EFEAEF] pl-4">
              <div
                className="text-right hidden sm:block cursor-pointer hover:opacity-80 transition-opacity"
                onClick={() => navigate('/profile')}
              >
                <p className="text-xs font-extrabold text-[#2D2329] leading-tight">{user.name}</p>
                <p className="text-[10px] font-semibold text-[#8C7A87] capitalize">{user.role}</p>
              </div>

              <div
                onClick={() => navigate('/profile')}
                className="w-9 h-9 rounded-xl bg-[#6B4355]/10 text-[#6B4355] flex items-center justify-center font-bold text-sm overflow-hidden cursor-pointer border border-[#6B4355]/20 hover:scale-105 transition-transform"
                title="Profile & Settings"
              >
                {user.avatarUrl ? (
                  <img src={user.avatarUrl} alt={user.name} className="w-full h-full object-cover" />
                ) : (
                  <User className="w-4 h-4" />
                )}
              </div>

              <button
                onClick={handleLogout}
                title="Logout"
                className="p-2 rounded-xl text-[#8C7A87] hover:text-red-600 hover:bg-red-50 transition-all"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
