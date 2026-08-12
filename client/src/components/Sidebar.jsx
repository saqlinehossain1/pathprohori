import React, { useContext } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Navigation,
  ShieldAlert,
  Mic,
  User,
  Bell,
  HelpCircle,
  Settings,
  ShieldCheck,
  LogOut,
} from 'lucide-react';
import { AuthContext } from '../context/AuthContext';

export const Sidebar = () => {
  const { user, logout } = useContext(AuthContext);
  const location = useLocation();

  const navItems = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard },
    { name: 'Log Journey', path: '/log-journey', icon: Navigation },
    { name: 'Live Danger Feed', path: '/live-danger-feed', icon: ShieldAlert },
    { name: 'Voice Settings', path: '/voice-settings', icon: Mic },
    { name: 'Profile', path: '/profile', icon: User },
    { name: 'Notifications', path: '/notifications', icon: Bell },
    { name: 'Help & FAQ', path: '/help', icon: HelpCircle },
    { name: 'Settings', path: '/settings', icon: Settings },
  ];

  return (
    <aside className="w-64 bg-white border-r border-[#EFEAEB] h-full flex flex-col p-4 shrink-0 hidden md:flex overflow-y-auto">
      {/* User Console Status Badge */}
      <div className="flex items-center gap-3 p-3 mb-6 bg-[#FDF7F9] rounded-2xl border border-[#F3E6EC]">
        <div className="w-10 h-10 rounded-2xl bg-[#FDE8EC] text-[#E05370] flex items-center justify-center font-bold shrink-0">
          <ShieldCheck className="w-6 h-6 text-[#E05370]" />
        </div>
        <div>
          <h4 className="text-xs font-extrabold text-[#6B4355] uppercase tracking-wider">
            Safety Console
          </h4>
          <p className="text-[11px] text-[#8C8289] font-medium">
            {user ? `${user.role.toUpperCase()} ACCESS` : 'PREMIUM PROTECTION'}
          </p>
        </div>
      </div>

      {/* Navigation List */}
      <nav className="space-y-1.5 flex-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = location.pathname === item.path;

          return (
            <Link
              key={item.name}
              to={item.path}
              className={`flex items-center gap-3.5 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
                active
                  ? 'bg-[#F4ECEF] text-[#6B4355] shadow-xs'
                  : 'text-[#6E656B] hover:bg-[#F9F6F7] hover:text-[#6B4355]'
              }`}
            >
              <Icon
                className={`w-4 h-4 ${
                  active ? 'text-[#6B4355]' : 'text-[#8C8289]'
                }`}
              />
              <span>{item.name}</span>
            </Link>
          );
        })}

        <button
          onClick={logout}
          className="w-full flex items-center gap-3.5 px-4 py-3 rounded-xl text-sm font-semibold text-[#E05370] hover:bg-[#FDE8EC] transition-all text-left mt-2"
        >
          <LogOut className="w-4 h-4 text-[#E05370]" />
          <span>Sign Out</span>
        </button>
      </nav>

      {/* Footer System Status */}
      <div className="pt-4 border-t border-[#EFEAEB]">
        <div className="flex items-center justify-between px-2 text-[11px] text-[#8C8289] font-medium">
          <span>Signal Heartbeat</span>
          <span className="inline-flex items-center gap-1 text-emerald-600 font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            ACTIVE
          </span>
        </div>
      </div>
    </aside>
  );
};
