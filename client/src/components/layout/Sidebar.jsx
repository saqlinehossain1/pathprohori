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
      <aside className="w-64 bg-gradient-to-b from-slate-950 via-[#0C1222] to-slate-950 text-slate-300 p-4 pb-5 hidden md:flex flex-col justify-between h-full overflow-y-auto min-h-0 flex-shrink-0 border-r border-slate-800/80 z-20 select-none">
        <div className="space-y-4">
          <div className="px-3 pt-1 flex items-center justify-between">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
              Live Operations
            </p>
            <div className="flex items-center gap-1.5 px-1.5 py-0.5 rounded bg-emerald-950/60 border border-emerald-800/40">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[9px] font-bold text-emerald-400 uppercase tracking-wider">Active</span>
            </div>
          </div>

          <nav className="space-y-1.5">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isNotificationsItem = item.path === '/notifications';
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={({ isActive }) =>
                    `group flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-medium transition-all duration-150 relative ${
                      isActive
                        ? 'bg-slate-900/90 text-white font-semibold border border-slate-800/70 shadow-inner before:absolute before:left-0 before:top-2 before:bottom-2 before:w-1 before:rounded-r before:bg-rose-500 before:shadow-[0_0_10px_rgba(244,63,94,0.8)] pl-3.5'
                        : 'text-slate-400 hover:text-slate-100 hover:bg-slate-900/60'
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      <div className="flex items-center gap-2.5">
                        <Icon
                          className={`w-4 h-4 transition-transform duration-150 group-hover:translate-x-0.5 ${
                            isActive ? 'text-rose-400' : 'text-slate-400 group-hover:text-slate-200'
                          }`}
                        />
                        <span className="tracking-tight">{item.label}</span>
                      </div>
                      {isNotificationsItem && unreadCount > 0 ? (
                        <span className="bg-rose-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center shadow-xs animate-pulse">
                          {unreadCount > 99 ? '99+' : unreadCount}
                        </span>
                      ) : (
                        isActive && <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
                      )}
                    </>
                  )}
                </NavLink>
              );
            })}
          </nav>
        </div>

        {/* Emergency Guardian Operational Card */}
        <div className="bg-gradient-to-br from-slate-900/95 to-[#151D30] border border-slate-800/90 rounded-xl p-3.5 space-y-3 shrink-0 shadow-soft">
          <div className="flex items-center justify-between text-slate-200">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-rose-500/15 flex items-center justify-center border border-rose-500/30">
                <UserCheck className="w-3.5 h-3.5 text-rose-400" />
              </div>
              <div>
                <span className="text-xs font-bold text-slate-100 block leading-tight">Guardian Protocol</span>
                <span className="text-[10px] text-emerald-400 font-medium flex items-center gap-1">
                  <span className="w-1 h-1 rounded-full bg-emerald-400" /> Standby Active
                </span>
              </div>
            </div>
          </div>

          <div className="p-2 rounded-lg bg-slate-950/60 border border-slate-800/60">
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Primary Dispatch</p>
            <p className="text-xs text-slate-200 font-semibold truncate mt-0.5">
              {guardians.length > 0
                ? primaryGuardian?.name || primaryGuardian?.email || 'Assigned Guardian'
                : 'National Helpline (999)'}
            </p>
            {primaryPhone && (
              <p className="text-[11px] text-slate-400 font-mono mt-0.5">{primaryPhone}</p>
            )}
          </div>

          <button
            type="button"
            onClick={handleCallGuardianClick}
            className="w-full py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs hover:shadow-rose-900/40 active:scale-[0.98]"
          >
            <PhoneCall className="w-3.5 h-3.5" />
            <span>Emergency Dial</span>
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

