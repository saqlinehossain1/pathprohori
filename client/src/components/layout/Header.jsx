import React, { useContext, useState, useEffect } from 'react';
import { AuthContext } from '../../context/AuthContext';
import { SocketContext } from '../../context/SocketContext';
import { Shield, User, LogOut, Activity, Radio, Bell, BellRing, CheckCircle2, Siren, PhoneCall } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { subscribeToWebPushNotifications } from '../../utils/pushNotifications';

export const Header = () => {
  const { user, logout } = useContext(AuthContext);
  const {
    isConnected,
    activeTrip,
    latestEmergencyAlert,
    reopenGuardianEmergencyModal,
  } = useContext(SocketContext);
  const navigate = useNavigate();
  const [pushSubscribed, setPushSubscribed] = useState(true);

  // AUTO-ENABLE Push Notifications on App/Header Mount (No manual clicking required!)
  useEffect(() => {
    if (!user?._id) return;

    let isMounted = true;
    const autoEnablePush = async () => {
      try {
        const res = await subscribeToWebPushNotifications();
        if (isMounted && res && res.success) {
          setPushSubscribed(true);
        }
      } catch (err) {
        console.warn('[Header Auto-Push] Background push subscription check:', err.message);
      }
    };

    autoEnablePush();
    return () => { isMounted = false; };
  }, [user?._id]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="bg-white/90 backdrop-blur-xl border-b border-slate-200/80 sticky top-0 z-40 shadow-xs transition-all duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand Identity */}
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
            </div>
          </div>
        </div>

        {/* Live Network & User Profile Bar - Icon-Based Compact Design */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Socket Heartbeat Live Indicator (Compact Icon Button) */}
          <div
            title={isConnected ? 'Heartbeat Monitor Active' : 'Connecting to Safety Network...'}
            className="w-9 h-9 rounded-xl bg-slate-50 border border-slate-200/90 flex items-center justify-center text-slate-700 shadow-2xs relative group cursor-help transition-all hover:bg-slate-100"
          >
            <Activity className={`w-4 h-4 ${isConnected ? 'text-emerald-600' : 'text-amber-500 animate-spin'}`} />
            <span className="absolute -top-0.5 -right-0.5 flex h-2.5 w-2.5">
              {isConnected && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />}
              <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${isConnected ? 'bg-emerald-500' : 'bg-amber-500'}`} />
            </span>
          </div>

          {/* Web Push Notification Indicator (Compact Icon Button - AUTO ON) */}
          <div
            title="Guardian Web Push Alerts: AUTO-ON Active"
            className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-200/90 flex items-center justify-center text-emerald-600 shadow-2xs relative cursor-help transition-all hover:bg-emerald-100"
          >
            <BellRing className="w-4 h-4 text-emerald-600" />
            <span className="absolute -top-0.5 -right-0.5 flex h-2.5 w-2.5">
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
            </span>
          </div>

          {/* Active Trip Quick Pill (Icon-Based) */}
          {activeTrip && (
            <div
              onClick={() => navigate('/log-journey')}
              title={`Active Journey: ${activeTrip.vehicleType}`}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-rose-50 border border-rose-200 text-xs font-black text-rose-700 shadow-2xs cursor-pointer hover:bg-rose-100 transition-all font-display"
            >
              <Activity className="w-4 h-4 text-rose-600 animate-spin" style={{ animationDuration: '3s' }} />
              <span className="hidden sm:inline">Trip Live</span>
            </div>
          )}

          {/* Persistent Guardian SOS Emergency Re-open Button (Compact Icon/Badge) */}
          {user && latestEmergencyAlert && (user.role === 'guardian' || user.role === 'operator' || user.role === 'admin' || String(user._id) !== String(latestEmergencyAlert.commuterId)) && (
            <button
              onClick={reopenGuardianEmergencyModal}
              title={`Re-open Live SOS Signal from ${latestEmergencyAlert.commuterName || 'Commuter'}`}
              className="w-9 h-9 bg-rose-600 hover:bg-rose-700 text-white rounded-xl flex items-center justify-center font-black text-xs border border-rose-400 shadow-md animate-pulse transition-all cursor-pointer active:scale-95"
            >
              <Siren className="w-4 h-4 text-white animate-bounce" />
            </button>
          )}

          {/* User Profile Badge */}
          {user && (
            <div className="flex items-center gap-2 sm:gap-3 border-l border-slate-200 pl-2.5 sm:pl-3">
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
                className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-all cursor-pointer active:scale-95"
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
