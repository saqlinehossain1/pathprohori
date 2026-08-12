import React, { useState, useContext } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Navigation,
  ShieldAlert,
  Mic,
  MoreHorizontal,
  User,
  Bell,
  HelpCircle,
  Settings,
  LogOut,
  X,
  ShieldCheck,
} from 'lucide-react';
import { AuthContext } from '../context/AuthContext';

export const MobileBottomNav = () => {
  const { user, logout } = useContext(AuthContext);
  const location = useLocation();
  const [showMoreSheet, setShowMoreSheet] = useState(false);

  // Primary 4 Tabs + 5th "More" trigger
  const primaryNavItems = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard },
    { name: 'Log Journey', path: '/log-journey', icon: Navigation },
    { name: 'Live Feed', path: '/live-danger-feed', icon: ShieldAlert },
    { name: 'Voice', path: '/voice-settings', icon: Mic },
  ];

  // Secondary items inside the "More" slide-up sheet
  const secondaryNavItems = [
    { name: 'Profile', path: '/profile', icon: User },
    { name: 'Notifications', path: '/notifications', icon: Bell },
    { name: 'Help & FAQ', path: '/help', icon: HelpCircle },
    { name: 'Settings', path: '/settings', icon: Settings },
  ];

  return (
    <>
      {/* Fixed Mobile Bottom Navigation Bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-lg border-t border-[#EFEAEB] shadow-lg md:hidden px-2 py-2">
        <div className="flex items-center justify-around">
          {primaryNavItems.map((item) => {
            const Icon = item.icon;
            const active = location.pathname === item.path;

            return (
              <Link
                key={item.name}
                to={item.path}
                onClick={() => setShowMoreSheet(false)}
                className={`flex flex-col items-center gap-1 px-2.5 py-1.5 rounded-2xl transition-all ${
                  active
                    ? 'text-[#6B4355] bg-[#FDE8EC]/70 font-extrabold scale-105'
                    : 'text-[#8C8289] hover:text-[#6B4355] font-semibold'
                }`}
              >
                <Icon
                  className={`w-5 h-5 ${
                    active ? 'text-[#6B4355]' : 'text-[#8C8289]'
                  }`}
                />
                <span className="text-[10px] tracking-tight">{item.name}</span>
              </Link>
            );
          })}

          {/* 5th "More" Button */}
          <button
            onClick={() => setShowMoreSheet(!showMoreSheet)}
            className={`flex flex-col items-center gap-1 px-2.5 py-1.5 rounded-2xl transition-all ${
              showMoreSheet
                ? 'text-[#6B4355] bg-[#FDE8EC]/70 font-extrabold scale-105'
                : 'text-[#8C8289] hover:text-[#6B4355] font-semibold'
            }`}
          >
            <MoreHorizontal className="w-5 h-5 text-[#8C8289]" />
            <span className="text-[10px] tracking-tight">More</span>
          </button>
        </div>
      </nav>

      {/* Slide-Up "More" Bottom Sheet Overlay */}
      {showMoreSheet && (
        <div className="fixed inset-0 z-50 bg-[#2D2329]/50 backdrop-blur-sm md:hidden flex flex-col justify-end transition-opacity">
          {/* Backdrop Click Dismiss */}
          <div
            className="flex-1"
            onClick={() => setShowMoreSheet(false)}
          ></div>

          {/* Slide-up Container */}
          <div className="bg-white rounded-t-3xl p-6 border-t border-[#EFEAEB] shadow-2xl space-y-5 animate-in slide-in-from-bottom duration-300 max-h-[80vh] overflow-y-auto">
            {/* Header & Close Button */}
            <div className="flex items-center justify-between pb-3 border-b border-[#F4EFF2]">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-2xl bg-[#FDE8EC] text-[#E05370] flex items-center justify-center font-bold">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-extrabold text-[#6B4355] uppercase tracking-wider">
                    {user?.name || 'Commuter Access'}
                  </h4>
                  <p className="text-[11px] text-[#8C8289] font-semibold uppercase">
                    {user?.role} ROLE
                  </p>
                </div>
              </div>

              <button
                onClick={() => setShowMoreSheet(false)}
                className="p-2 text-[#8C8289] hover:bg-[#F9F6F7] rounded-full"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Secondary Menu Links */}
            <div className="grid grid-cols-2 gap-3">
              {secondaryNavItems.map((item) => {
                const Icon = item.icon;
                const active = location.pathname === item.path;

                return (
                  <Link
                    key={item.name}
                    to={item.path}
                    onClick={() => setShowMoreSheet(false)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-2xl text-xs font-bold transition-all ${
                      active
                        ? 'bg-[#F4ECEF] text-[#6B4355]'
                        : 'bg-[#FBF9FA] text-[#6E656B] hover:bg-[#F4ECEF]'
                    }`}
                  >
                    <Icon className="w-4 h-4 text-[#6B4355]" />
                    <span>{item.name}</span>
                  </Link>
                );
              })}
            </div>

            {/* Sign Out Action Button */}
            <div className="pt-2">
              <button
                onClick={() => {
                  setShowMoreSheet(false);
                  logout();
                }}
                className="w-full flex items-center justify-center gap-2 py-3 bg-[#FDE8EC] hover:bg-[#F9C5D1] text-[#E05370] font-extrabold text-xs rounded-2xl transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
