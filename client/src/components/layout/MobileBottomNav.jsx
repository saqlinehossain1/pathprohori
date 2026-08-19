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
    <div className="md:hidden fixed bottom-0 left-0 right-0 bg-slate-900/95 backdrop-blur-xl border-t border-slate-800 z-40 px-2 py-2 flex items-center justify-around shadow-2xl">
      {navItems.map((item) => {
        const Icon = item.icon;
        return (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `flex flex-col items-center gap-1 py-1.5 px-3 rounded-2xl text-[10px] font-extrabold transition-all duration-200 ${
                isActive ? 'text-white bg-rose-600 shadow-md shadow-rose-900/40' : 'text-slate-400 hover:text-slate-200'
              }`
            }
          >
            <Icon className="w-4 h-4" />
            <span className="font-display">{item.label}</span>
          </NavLink>
        );
      })}
    </div>
  );
};

export default MobileBottomNav;
