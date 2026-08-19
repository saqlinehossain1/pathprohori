import React, { useContext } from 'react';
import { AuthContext } from '../../context/AuthContext';
import { SocketContext } from '../../context/SocketContext';
import { Shield, User, LogOut, Activity, Radio, Sparkles } from 'lucide-react';
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
    <header className="bg-white/90 backdrop-blur-xl border-b border-slate-200/80 sticky top-0 z-40 shadow-xs transition-all duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand Identity with Glass Logo */}
        <div className="flex items-center gap-3.5 cursor-pointer group" onClick={() => navigate('/')}>
          <div className="relative flex items-center justify-center">
            <img
              src="/logo.png"
              alt="PATHPROHORI Logo"
              className="w-9 h-9 object-contain drop-shadow-md group-hover:scale-105 transition-transform duration-300"
              onError={(e) => {
                e.target.onerror = null;
                e.target.style.display = 'none';
                if (e.target.nextSibling) {
                  e.target.nextSibling.style.display = 'flex';
                }
              }}
            />
            <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-slate-900 to-rose-600 hidden items-center justify-center text-white shadow-md group-hover:scale-105 transition-transform duration-300">
              <Shield className="w-5 h-5" />
            </div>
          </div>

          <div>
            <span className="text-xl font-black tracking-tight font-display bg-clip-text text-transparent bg-gradient-to-r from-slate-900 via-slate-800 to-rose-700 block leading-none">
              PATHPROHORI
            </span>
            <div className="flex items-center gap-1.5 mt-1">
              <span className="text-[9px] font-extrabold text-rose-600 uppercase tracking-widest block leading-none font-display">
                Hyperlocal Transit Security
              </span>
              <Sparkles className="w-2.5 h-2.5 text-amber-500 inline-block" />
            </div>
          </div>
        </div>

        {/* Live Network & User Profile Bar */}
        <div className="flex items-center gap-3 sm:gap-4">
          {/* Socket Connection Live Indicator */}
          <div className="hidden sm:flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-50 border border-slate-200 text-xs font-semibold shadow-xs">
            <span className="relative flex h-2 w-2">
              {isConnected && (
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              )}
              <span
                className={`relative inline-flex rounded-full h-2 w-2 ${
                  isConnected ? 'bg-emerald-500' : 'bg-amber-500'
                }`}
              ></span>
            </span>
            <span className="text-slate-700 font-medium text-[11px]">
              {isConnected ? 'Heartbeat Active' : 'Connecting Network'}
            </span>
          </div>

          {/* Active Trip Quick Pill */}
          {activeTrip && (
            <div
              onClick={() => navigate('/log-journey')}
              className="hidden md:flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-rose-50 border border-rose-200 text-xs font-extrabold text-rose-700 shadow-xs cursor-pointer hover:shadow-md transition-all animate-pulse"
            >
              <Activity className="w-3.5 h-3.5 text-rose-600 animate-spin" style={{ animationDuration: '3s' }} />
              <span>Journey Live ({activeTrip.vehicleType})</span>
            </div>
          )}

          {/* User Profile Badge */}
          {user && (
            <div className="flex items-center gap-3 border-l border-slate-200 pl-3.5 sm:pl-4">
              <div
                className="text-right hidden sm:block cursor-pointer group"
                onClick={() => navigate('/profile')}
              >
                <p className="text-xs font-extrabold text-slate-900 group-hover:text-rose-600 transition-colors leading-tight">
                  {user.name}
                </p>
                <p className="text-[10px] font-semibold text-slate-500 capitalize tracking-wide">{user.role}</p>
              </div>

              <div
                onClick={() => navigate('/profile')}
                className="w-9 h-9 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold text-sm overflow-hidden cursor-pointer border border-slate-800 shadow-xs hover:scale-105 transition-all"
                title="Profile & Settings"
              >
                {user.avatarUrl ? (
                  <img src={user.avatarUrl} alt={user.name} className="w-full h-full object-cover" />
                ) : (
                  <User className="w-4 h-4 text-slate-200" />
                )}
              </div>

              <button
                onClick={handleLogout}
                title="Logout"
                className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50/80 transition-all cursor-pointer active:scale-95"
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

