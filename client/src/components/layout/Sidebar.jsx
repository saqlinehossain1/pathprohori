import React, { useContext } from 'react';
import { NavLink } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import {
  LayoutDashboard,
  Navigation,
  ShieldAlert,
  Bell,
  Mic,
  User,
  PhoneCall,
  UserCheck,
} from 'lucide-react';

export const Sidebar = () => {
  const { user } = useContext(AuthContext);
  const { unreadCount } = useNotifications();

  const navItems = [
    { label: 'Dashboard Overview', path: '/', icon: LayoutDashboard },
    { label: 'Log New Journey', path: '/log-journey', icon: Navigation },
    { label: 'Live Danger Feed', path: '/live-danger-feed', icon: ShieldAlert },
    { label: 'Notifications', path: '/notifications', icon: Bell },
    { label: 'Voice & Emergency', path: '/voice-settings', icon: Mic },
    { label: 'Profile & Account', path: '/profile', icon: User },
  ];

  return (
    <aside className="w-64 bg-white border-r border-[#EFEAEF] p-4 pb-6 hidden md:flex flex-col justify-between h-full overflow-y-auto min-h-0 flex-shrink-0 space-y-6 custom-scrollbar">
      <div className="space-y-6">
        <div className="px-3 pt-2">
          <p className="text-[10px] font-extrabold text-[#8C7A87] uppercase tracking-wider">
            Navigation Menu
          </p>
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
                  `flex items-center gap-3 px-4 py-3 rounded-2xl text-xs font-bold transition-all ${isActive
                    ? 'bg-[#6B4355] text-white shadow-card'
                    : 'text-[#6B4355] hover:bg-[#FDF7F9] hover:text-[#2D2329]'
                  }`
                }
              >
                <Icon className="w-4 h-4" />
                <span className="flex-1">{item.label}</span>
                {isNotificationsItem && unreadCount > 0 && (
                  <span className="bg-red-600 text-white text-[10px] font-black px-2 py-0.5 rounded-full min-w-[20px] text-center shadow-sm">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </NavLink>
            );
          })}
        </nav>
      </div>

      {/* Emergency Guardian Card */}
      <div className="bg-[#FDF7F9] border border-[#E0D5DC] rounded-3xl p-4 space-y-3 shrink-0">
        <div className="flex items-center gap-2 text-[#6B4355]">
          <UserCheck className="w-4 h-4" />
          <span className="text-xs font-extrabold">Assigned Guardian</span>
        </div>
        <p className="text-xs text-[#6B4355] font-semibold">
          {user?.guardians && user.guardians.length > 0
            ? user.guardians[0]?.name || user.guardians[0]
            : 'Default Safety Hotline Connected'}
        </p>
        <button
          onClick={() => alert('Initiating Instant Emergency Call to Guardian...')}
          className="w-full py-2.5 bg-[#6B4355] hover:bg-[#583645] text-white rounded-xl text-[11px] font-bold flex items-center justify-center gap-1.5 transition-all shadow-sm active:scale-95"
        >
          <PhoneCall className="w-3.5 h-3.5" />
          Call Guardian Now
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
