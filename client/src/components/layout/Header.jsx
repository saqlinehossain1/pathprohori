import React, { useContext, useState, useEffect, useRef } from 'react';
import { AuthContext } from '../../context/AuthContext';
import { SocketContext } from '../../context/SocketContext';
import { Shield, User, LogOut, Activity, Bell, BellRing, CheckCircle2, Siren, PhoneCall, Radio, Check, Info } from 'lucide-react';
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

  // Web Push Notification State
  const [pushStatus, setPushStatus] = useState(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      return Notification.permission;
    }
    return 'unsupported';
  });
  const [pushLoading, setPushLoading] = useState(false);
  const [showPushInfo, setShowPushInfo] = useState(false);
  const pushDropdownRef = useRef(null);

  // Auto-subscribe or verify web push notifications on mount
  useEffect(() => {
    if (!user?._id) return;
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setPushStatus(Notification.permission);
    }

    let isMounted = true;
    const autoEnablePush = async () => {
      try {
        const res = await subscribeToWebPushNotifications();
        if (isMounted && res && res.success) {
          setPushStatus('granted');
        }
      } catch (err) {
        console.warn('[Header Auto-Push] Background push check:', err.message);
      }
    };

    autoEnablePush();
    return () => { isMounted = false; };
  }, [user?._id]);

  // Click outside to dismiss push info popover
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (pushDropdownRef.current && !pushDropdownRef.current.contains(e.target)) {
        setShowPushInfo(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handlePushClick = async (e) => {
    e.stopPropagation();
    if (pushStatus === 'granted') {
      setShowPushInfo((prev) => !prev);
      return;
    }

    // If not granted, attempt subscription
    setPushLoading(true);
    try {
      const res = await subscribeToWebPushNotifications();
      if (res && res.success) {
        setPushStatus('granted');
      } else if (res && res.reason === 'permission_denied') {
        setPushStatus('denied');
      }
      setShowPushInfo(true);
    } catch (err) {
      console.error('Failed to enable push:', err);
    } finally {
      setPushLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isPushActive = pushStatus === 'granted';

  return (
    <header className="glass-header sticky top-0 z-40 transition-colors w-full shadow-2xs">
      <div className="w-full h-14 flex items-center">
        {/* Brand Identity - Exact width of sidebar (w-64 = 256px) on clean white background */}
        <div
          className="w-auto md:w-64 h-full shrink-0 flex items-center gap-3 px-4 md:px-5 bg-white text-slate-950 md:border-r border-slate-200/90 cursor-pointer select-none group"
          onClick={() => navigate('/')}
          title="PathProhori Dashboard"
        >
          <div className="relative flex items-center justify-center shrink-0">
            <img
              src="/logo.png"
              alt="PATHPROHORI Logo"
              className="w-8 h-8 object-contain transition-transform duration-200 group-hover:scale-105"
              onError={(e) => {
                e.target.onerror = null;
                e.target.style.display = 'none';
                if (e.target.nextSibling) {
                  e.target.nextSibling.style.display = 'flex';
                }
              }}
            />
            <div className="w-8 h-8 rounded-lg bg-slate-900 text-white hidden items-center justify-center shadow-xs">
              <Shield className="w-4 h-4 text-rose-500" />
            </div>
          </div>

          <span className="text-base sm:text-lg font-black tracking-tight text-slate-950 leading-none font-display truncate">
            PATHPROHORI
          </span>
        </div>

        {/* Right Header Navigation & Telemetry Status Bar */}
        <div className="flex-1 h-full px-4 sm:px-6 flex items-center justify-end gap-2 sm:gap-3">
          {/* Socket Heartbeat Live Indicator */}
          <div
            title={isConnected ? 'Heartbeat Monitor Active (Live 15s telemetry stream)' : 'Connecting to Safety Network...'}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-50/90 border border-emerald-200 text-xs font-medium text-emerald-800 cursor-help shadow-2xs"
          >
            <span className="relative flex h-2 w-2">
              {isConnected && (
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              )}
              <span className={`relative inline-flex rounded-full h-2 w-2 ${isConnected ? 'bg-emerald-500' : 'bg-amber-500'}`} />
            </span>
            <span className="hidden sm:inline text-[11px] font-bold text-emerald-800">
              {isConnected ? 'Network Active' : 'Connecting...'}
            </span>
          </div>

          {/* Web Push Notification Active Status (Does NOT navigate to /notifications) */}
          <div className="relative" ref={pushDropdownRef}>
            <button
              type="button"
              onClick={handlePushClick}
              disabled={pushLoading}
              title={
                isPushActive
                  ? 'Web Push Notifications: Active (Emergency & Hazard Alerts Enabled)'
                  : 'Web Push Notifications: Inactive (Click to Enable)'
              }
              className={`relative flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold transition-all shadow-2xs cursor-pointer active:scale-95 ${
                isPushActive
                  ? 'bg-emerald-50/90 text-emerald-800 border border-emerald-200 hover:bg-emerald-100'
                  : 'bg-slate-100 text-slate-700 border border-slate-200 hover:bg-slate-200'
              }`}
            >
              <div className="relative flex items-center justify-center">
                {isPushActive ? (
                  <BellRing className="w-3.5 h-3.5 text-emerald-600" />
                ) : (
                  <Bell className="w-3.5 h-3.5 text-slate-500" />
                )}
                {isPushActive && (
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 absolute -top-0.5 -right-0.5 animate-pulse" />
                )}
              </div>
              <span className="hidden sm:inline text-[11px] font-extrabold text-emerald-800">
                {isPushActive ? 'Push Active' : 'Enable Push'}
              </span>
            </button>

            {/* Push Notification Info Popover */}
            {showPushInfo && (
              <div className="absolute right-0 top-full mt-2 w-72 p-3.5 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 animate-in fade-in zoom-in-95">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                  <div className={`w-6 h-6 rounded-lg flex items-center justify-center ${isPushActive ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                    {isPushActive ? <Check className="w-3.5 h-3.5" /> : <Info className="w-3.5 h-3.5" />}
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-slate-900">
                      {isPushActive ? 'Web Push Notifications Active' : 'Push Notification Status'}
                    </h4>
                    <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">
                      {isPushActive ? '● Browser Sync Enforced' : 'Action Required'}
                    </span>
                  </div>
                </div>

                <p className="text-xs text-slate-600 font-medium mt-2 leading-relaxed">
                  {isPushActive
                    ? 'Emergency SOS broadcasts, danger zone proximity warnings, and guardian alerts are actively delivered to this device in real time.'
                    : pushStatus === 'denied'
                    ? 'Push notifications are blocked in your browser settings. Please allow notifications for this site to receive emergency alerts.'
                    : 'Enable web push notifications to receive instant audio and visual emergency alerts when traveling.'}
                </p>

                {!isPushActive && pushStatus !== 'denied' && (
                  <button
                    onClick={handlePushClick}
                    className="mt-3 w-full py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold transition-all shadow-xs"
                  >
                    Enable Push Notifications
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Active Trip Quick Pill */}
          {activeTrip && (
            <div
              onClick={() => navigate('/log-journey')}
              title={`Active Journey: ${activeTrip.vehicleType}`}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-rose-50 border border-rose-200 text-xs font-bold text-rose-700 cursor-pointer hover:bg-rose-100 transition-colors shadow-2xs"
            >
              <Activity className="w-3.5 h-3.5 text-rose-600 animate-pulse" />
              <span className="hidden sm:inline">Trip Live</span>
            </div>
          )}

          {/* Persistent Guardian SOS Emergency Re-open Button */}
          {user && latestEmergencyAlert && (user.role === 'guardian' || user.role === 'operator' || user.role === 'admin' || String(user._id) !== String(latestEmergencyAlert.commuterId)) && (
            <button
              onClick={reopenGuardianEmergencyModal}
              title={`Re-open Live SOS Signal from ${latestEmergencyAlert.commuterName || 'Commuter'}`}
              className="px-2.5 py-1 bg-red-600 hover:bg-red-700 text-white rounded-md flex items-center gap-1.5 font-bold text-xs shadow-xs transition-colors cursor-pointer"
            >
              <Siren className="w-3.5 h-3.5 text-white" />
              <span className="hidden sm:inline">SOS Active</span>
            </button>
          )}

          {/* User Profile Badge */}
          {user && (
            <div className="flex items-center gap-2 sm:gap-3 border-l border-slate-200 pl-2.5 sm:pl-3">
              <div
                className="text-right hidden sm:block cursor-pointer group"
                onClick={() => navigate('/profile')}
              >
                <p className="text-xs font-bold text-slate-900 group-hover:text-rose-600 transition-colors leading-tight">
                  {user.name}
                </p>
                <p className="text-[10px] font-bold text-slate-600 capitalize">{user.role}</p>
              </div>

              <div
                onClick={() => navigate('/profile')}
                className="w-8 h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center font-bold text-xs overflow-hidden cursor-pointer border border-slate-800 shadow-xs hover:ring-2 hover:ring-slate-400 transition-all"
                title="Profile & Settings"
              >
                {user.avatarUrl ? (
                  <img src={user.avatarUrl} alt={user.name} className="w-full h-full object-cover" />
                ) : (
                  <User className="w-3.5 h-3.5 text-slate-200" />
                )}
              </div>

              <button
                onClick={handleLogout}
                title="Logout"
                className="p-1.5 rounded-lg text-slate-600 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
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
