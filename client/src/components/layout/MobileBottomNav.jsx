import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Navigation, ShieldAlert, Mic, User } from 'lucide-react';

export const MobileBottomNav = () => {
  const navItems = [
    { label: 'Home', path: '/', icon: LayoutDashboard },
    { label: 'Log Trip', path: '/log-journey', icon: Navigation },
    { label: 'Danger Feed', path: '/live-danger-feed', icon: ShieldAlert },
    { label: 'Voice', path: '/voice-settings', icon: Mic },
    { label: 'Profile', path: '/profile', icon: User },
  ];

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 glass-panel-dark border-t border-slate-800/80 z-40 px-1.5 py-2 flex items-center justify-around shadow-2xl backdrop-blur-xl">
      {navItems.map((item) => {
        const Icon = item.icon;
        return (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `flex flex-col items-center gap-1 py-1 px-2.5 rounded-lg text-[10px] font-medium transition-all active:scale-95 ${
                isActive
                  ? 'text-rose-400 font-bold bg-rose-500/10 border border-rose-500/20'
                  : 'text-slate-400 hover:text-slate-200'
              }`
            }
          >
            <Icon className="w-4 h-4" />
            <span className="tracking-tight">{item.label}</span>
          </NavLink>
        );
      })}
    </div>
  );
};

export default MobileBottomNav;
