import React, { useContext } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Search, Bell, Shield, User, LogOut } from 'lucide-react';
import { AuthContext } from '../context/AuthContext';

export const Header = () => {
  const { user, logout } = useContext(AuthContext);
  const location = useLocation();

  const isActive = (path) => location.pathname === path;

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-[#EFEAEB] px-3 sm:px-6 py-2.5 sm:py-3.5 transition-all">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-2 sm:gap-4">
        {/* Brand Logo */}
        <Link to="/" className="flex items-center gap-1.5 sm:gap-2.5 group">
          <img
            src="/logo.png"
            alt="PATHPROHORI Logo"
            className="w-7 h-7 sm:w-9 sm:h-9 object-contain group-hover:scale-105 transition-transform"
          />
          <span className="text-sm sm:text-xl font-extrabold tracking-wider sm:tracking-widest text-[#6B4355] font-sans">
            PATHPROHORI
          </span>
        </Link>

        {/* Right Search, Notification & User Avatar */}
        <div className="flex items-center gap-4">
          <div className="relative hidden lg:block w-64">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8C8289]" />
            <input
              type="text"
              placeholder="Search discussion..."
              className="w-full bg-[#F4F1F3] text-sm text-[#2D2329] placeholder-[#8C8289] pl-10 pr-4 py-2 rounded-full border border-transparent focus:outline-none focus:border-[#D5C2CC] focus:bg-white transition-all"
            />
          </div>

          <button className="relative p-2 text-[#6E656B] hover:text-[#6B4355] hover:bg-[#F9F6F7] rounded-full transition-colors">
            <Bell className="w-5 h-5" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-[#E05370] rounded-full ring-2 ring-white"></span>
          </button>

          {user ? (
            <div className="flex items-center gap-2">
              <Link
                to="/profile"
                className="flex items-center gap-2.5 p-1 pl-2 pr-3 bg-[#F9F6F7] hover:bg-[#F2ECEF] rounded-full border border-[#EFEAEB] transition-all"
              >
                <div className="w-8 h-8 rounded-full bg-[#6B4355] text-white flex items-center justify-center font-bold text-xs">
                  {user.name.charAt(0).toUpperCase()}
                </div>
                <span className="text-xs font-bold text-[#2D2329] hidden sm:inline">
                  {user.name}
                </span>
              </Link>

              <button
                onClick={logout}
                title="Sign Out"
                className="p-2 text-[#8C8289] hover:text-[#E05370] hover:bg-[#FDE8EC] rounded-full transition-colors"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <Link
              to="/login"
              className="px-4 py-2 text-xs font-bold bg-[#6B4355] hover:bg-[#5C3A48] text-white rounded-full transition-colors shadow-sm"
            >
              Sign In
            </Link>
          )}
        </div>
      </div>
    </header>
  );
};
