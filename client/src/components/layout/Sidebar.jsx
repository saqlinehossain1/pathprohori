import React, { useContext, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import Modal from '../common/Modal';
import {
  LayoutDashboard,
  Navigation,
  ShieldAlert,
  Bell,
  Mic,
  User,
  PhoneCall,
  UserCheck,
  Sparkles,
  ChevronRight,
  Phone,
  Shield,
  PlusCircle,
} from 'lucide-react';

export const Sidebar = () => {
  const { user } = useContext(AuthContext);
  const { unreadCount } = useNotifications();
  const navigate = useNavigate();
  const [showCallModal, setShowCallModal] = useState(false);

  const guardians = user?.guardians || [];
  const primaryGuardian = guardians[0];
  const primaryPhone = primaryGuardian?.phone || primaryGuardian?.contactPhone || '';

  const handleCallGuardianClick = () => {
    // If only one guardian with phone, initiate call directly
    if (guardians.length === 1 && primaryPhone) {
      window.location.href = `tel:${primaryPhone}`;
      return;
    }
    // Otherwise open guardian selection dialog
    setShowCallModal(true);
  };

  const navItems = [
    { label: 'Dashboard Overview', path: '/', icon: LayoutDashboard },
    { label: 'Log New Journey', path: '/log-journey', icon: Navigation },
    { label: 'Live Danger Feed', path: '/live-danger-feed', icon: ShieldAlert },
    { label: 'Notifications', path: '/notifications', icon: Bell },
    { label: 'Voice & Emergency', path: '/voice-settings', icon: Mic },
    { label: 'Profile & Account', path: '/profile', icon: User },
  ];

  return (
    <>
      <aside className="w-64 bg-gradient-to-b from-[#0F172A] via-[#1E293B] to-[#0B1120] text-white p-4 pb-6 hidden md:flex flex-col justify-between h-full overflow-y-auto min-h-0 flex-shrink-0 space-y-6 shadow-2xl z-20 border-r border-slate-800/80 rounded-r-3xl my-3 ml-2">
        <div className="space-y-6">
          <div className="px-3 pt-2 flex items-center justify-between">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest font-display">
              Navigation Menu
            </p>
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-glow" />
          </div>

          <nav className="space-y-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isNotificationsItem = item.path === '/notifications';
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={({ isActive }) =>
                    `flex items-center justify-between px-4 py-3.5 rounded-2xl text-xs font-bold transition-all duration-300 ${
                      isActive
                        ? 'bg-gradient-to-r from-rose-600 to-rose-500 text-white shadow-lg shadow-rose-900/30 scale-[1.02] border border-rose-400/20'
                        : 'text-slate-300 hover:bg-white/10 hover:text-white hover:translate-x-1'
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      <div className="flex items-center gap-3">
                        <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                        <span className="font-display tracking-wide">{item.label}</span>
                      </div>
                      {isNotificationsItem && unreadCount > 0 ? (
                        <span className="bg-rose-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full min-w-[20px] text-center shadow-xs">
                          {unreadCount > 99 ? '99+' : unreadCount}
                        </span>
                      ) : (
                        isActive && <ChevronRight className="w-3.5 h-3.5 text-white/80" />
                      )}
                    </>
                  )}
                </NavLink>
              );
            })}
          </nav>
        </div>

        {/* Emergency Guardian Glass Card */}
        <div className="bg-white/10 backdrop-blur-xl border border-white/15 rounded-3xl p-4 space-y-3 shrink-0 shadow-lg relative overflow-hidden group">
          <div className="absolute -top-10 -right-10 w-24 h-24 bg-rose-500/20 rounded-full blur-xl pointer-events-none group-hover:bg-rose-500/30 transition-colors" />

          <div className="flex items-center justify-between text-white">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-xl bg-rose-500/20 flex items-center justify-center border border-rose-400/30">
                <UserCheck className="w-3.5 h-3.5 text-rose-300" />
              </div>
              <span className="text-xs font-black font-display text-white">Guardian Protocol</span>
            </div>
            <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-pulse" />
          </div>

          <div>
            <p className="text-[10px] font-bold text-[#D5B6C6] uppercase tracking-wider">Assigned Contact</p>
            <p className="text-xs text-white font-extrabold truncate mt-0.5">
              {guardians.length > 0
                ? primaryGuardian?.name || primaryGuardian?.email || 'Assigned Guardian'
                : 'National Helpline (999)'}
            </p>
            {primaryPhone && (
              <p className="text-[10px] text-rose-200 font-mono mt-0.5">{primaryPhone}</p>
            )}
          </div>

          <button
            type="button"
            onClick={handleCallGuardianClick}
            className="w-full py-2.5 bg-gradient-to-r from-rose-600 to-[#E05370] hover:from-rose-500 hover:to-rose-600 text-white rounded-2xl text-[11px] font-black flex items-center justify-center gap-2 transition-all shadow-md shadow-rose-950/40 active:scale-95 cursor-pointer font-display"
          >
            <PhoneCall className="w-3.5 h-3.5 animate-bounce" />
            Call Guardian Now
          </button>
        </div>
      </aside>

      {/* Guardian Calling Modal */}
      <Modal
        isOpen={showCallModal}
        onClose={() => setShowCallModal(false)}
        title="Emergency Contact Direct Dial"
      >
        <div className="space-y-4">
          <p className="text-xs text-slate-500 font-medium">
            Select a verified guardian contact or national emergency hotline to place an instant call:
          </p>

          {guardians.length > 0 ? (
            <div className="space-y-2.5">
              {guardians.map((g, idx) => {
                const gPhone = g.phone || g.contactPhone || '';
                const gName = g.name || g.email || `Guardian #${idx + 1}`;
                const gRelation = g.relationship || 'Emergency Contact';
                return (
                  <div
                    key={idx}
                    className="p-3 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between gap-3 shadow-2xs"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <UserCheck className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                        <span className="font-bold text-slate-900 text-xs font-display truncate">
                          {gName}
                        </span>
                      </div>
                      <span className="text-[11px] text-slate-500 block">
                        {gRelation} {gPhone ? `• ${gPhone}` : ''}
                      </span>
                    </div>

                    {gPhone ? (
                      <a
                        href={`tel:${gPhone}`}
                        className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black rounded-xl transition-all flex items-center gap-1.5 shadow-2xs active:scale-95 shrink-0 font-display"
                      >
                        <PhoneCall className="w-3.5 h-3.5" />
                        <span>Call</span>
                      </a>
                    ) : (
                      <span className="text-[10px] text-slate-400 font-mono italic">No phone set</span>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl text-center space-y-2">
              <p className="text-xs font-bold text-amber-900">
                No personal guardians assigned yet.
              </p>
              <p className="text-[11px] text-amber-700">
                Add trusted family members or friends in your profile so you can reach them in one tap.
              </p>
              <button
                type="button"
                onClick={() => {
                  setShowCallModal(false);
                  navigate('/profile');
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl shadow-xs cursor-pointer"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>Add Guardian in Profile</span>
              </button>
            </div>
          )}

          {/* National 999 Hotline */}
          <div className="pt-2 border-t border-slate-200/80">
            <a
              href="tel:999"
              className="w-full py-3 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-black flex items-center justify-center gap-2 shadow-md transition-all active:scale-95 font-display uppercase tracking-wider"
            >
              <Shield className="w-4 h-4 animate-pulse" />
              <span>Call National Emergency (999)</span>
            </a>
          </div>
        </div>
      </Modal>
    </>
  );
};

export default Sidebar;

