import React, { useContext } from 'react';
import { NavLink } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import {
  LayoutDashboard,
  Navigation,
  ShieldAlert,
  Mic,
  User,
  PhoneCall,
  UserCheck,
  Sparkles,
  ChevronRight,
} from 'lucide-react';

export const Sidebar = () => {
  const { user } = useContext(AuthContext);

  const navItems = [
    { label: 'Dashboard Overview', path: '/', icon: LayoutDashboard },
    { label: 'Log New Journey', path: '/log-journey', icon: Navigation },
    { label: 'Live Danger Feed', path: '/live-danger-feed', icon: ShieldAlert },
    { label: 'Voice & Emergency', path: '/voice-settings', icon: Mic },
    { label: 'Profile & Account', path: '/profile', icon: User },
  ];

  return (
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
                    {isActive && <ChevronRight className="w-3.5 h-3.5 text-white/80" />}
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
            {user?.guardians && user.guardians.length > 0
              ? user.guardians[0]?.name || user.guardians[0]
              : 'Default Safety Hotline'}
          </p>
        </div>

        <button
          onClick={() => alert('Initiating Instant Emergency Call to Guardian...')}
          className="w-full py-2.5 bg-gradient-to-r from-rose-600 to-[#E05370] hover:from-rose-500 hover:to-rose-600 text-white rounded-2xl text-[11px] font-black flex items-center justify-center gap-2 transition-all shadow-md shadow-rose-950/40 active:scale-95 cursor-pointer"
        >
          <PhoneCall className="w-3.5 h-3.5 animate-bounce" />
          Call Guardian Now
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;

