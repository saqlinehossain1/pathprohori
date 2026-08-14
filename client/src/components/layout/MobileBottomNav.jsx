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
    <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-[#EFEAEF] z-40 px-2 py-2 flex items-center justify-around shadow-lg">
      {navItems.map((item) => {
        const Icon = item.icon;
        return (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `flex flex-col items-center gap-1 py-1 px-2 rounded-2xl text-[10px] font-bold transition-all ${
                isActive ? 'text-[#6B4355] bg-[#FDF7F9]' : 'text-[#8C7A87]'
              }`
            }
          >
            <Icon className="w-4 h-4" />
            <span>{item.label}</span>
          </NavLink>
        );
      })}
    </div>
  );
};

export default MobileBottomNav;
