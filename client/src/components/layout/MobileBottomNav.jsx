import React, { useContext, useEffect, useRef, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import { LayoutDashboard, Navigation, ShieldAlert, MoreHorizontal, Bell, Mic, User, PhoneCall } from 'lucide-react';

export const MobileBottomNav = () => {
  const location = useLocation();
  const { user } = useContext(AuthContext);
  const { unreadCount } = useNotifications();
  const [isMoreOpen, setIsMoreOpen] = useState(false);
  const moreRef = useRef(null);

  const navItems = [
    { label: 'Home', path: '/', icon: LayoutDashboard, end: true },
    { label: 'Log journey', path: '/log-journey', icon: Navigation },
    { label: 'Danger feed', path: '/live-danger-feed', icon: ShieldAlert },
    { label: 'Notifications', path: '/notifications', icon: Bell, badge: unreadCount },
  ];

  const moreItems = [
    { label: 'Voice settings', path: '/voice-settings', icon: Mic },
    { label: 'Profile', path: '/profile', icon: User },
    { label: 'Call guardian', icon: PhoneCall, action: 'call-guardian' },
  ];

  const handleMoreAction = (action) => {
    if (action !== 'call-guardian') return;

    const guardian = user?.guardians?.[0];
    const phone = guardian?.phone || guardian?.contactPhone;
    if (phone) {
      window.location.href = `tel:${phone}`;
    } else {
      window.alert('No guardian phone number is configured yet.');
    }
    setIsMoreOpen(false);
  };

  useEffect(() => {
    const handleOutsidePress = (event) => {
      if (moreRef.current && !moreRef.current.contains(event.target)) {
        setIsMoreOpen(false);
      }
    };

    document.addEventListener('pointerdown', handleOutsidePress);
    return () => document.removeEventListener('pointerdown', handleOutsidePress);
  }, []);

  const isMoreActive = moreItems.some((item) => item.path && location.pathname.startsWith(item.path));

  const itemClass = (isActive) =>
    `flex h-12 w-12 items-center justify-center rounded-[18px] transition-all active:scale-90 ${
      isActive
        ? 'bg-slate-950 text-white shadow-lg shadow-slate-950/20'
        : 'text-slate-500 hover:bg-white/80 hover:text-slate-950'
    }`;

  return (
    <nav
      ref={moreRef}
      aria-label="Mobile navigation"
      className="mobile-bottom-nav md:hidden fixed bottom-3 left-3 right-3 z-40 flex items-center justify-around gap-1 rounded-[26px] border border-white/80 bg-white/65 px-2 py-2 shadow-[0_14px_40px_rgba(15,23,42,0.18)] backdrop-blur-2xl"
    >
      {navItems.map((item) => {
        const Icon = item.icon;
        return (
          <NavLink
            key={item.path}
            to={item.path}
            aria-label={item.label}
            title={item.label}
            end={item.end}
            className={({ isActive }) => itemClass(isActive)}
          >
            <span className="relative">
              <Icon className="h-[21px] w-[21px]" strokeWidth={2.15} />
              {item.badge > 0 && (
                <span className="absolute -right-2 -top-2 min-w-4 rounded-full bg-rose-600 px-1 text-center text-[9px] font-black leading-4 text-white shadow-sm">
                  {item.badge > 99 ? '99+' : item.badge}
                </span>
              )}
            </span>
          </NavLink>
        );
      })}

      <div className="relative">
        {isMoreOpen && (
          <div className="absolute bottom-[calc(100%+14px)] right-0 w-48 rounded-3xl border border-white/80 bg-white/85 p-2 shadow-[0_18px_45px_rgba(15,23,42,0.2)] backdrop-blur-2xl">
            <div className="px-3 pb-2 pt-1 text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">
              More
            </div>
            <div className="space-y-1">
              {moreItems.map((item) => {
                const Icon = item.icon;
                return (
                  item.action ? (
                    <button
                      key={item.action}
                      type="button"
                      onClick={() => handleMoreAction(item.action)}
                      className="flex min-h-11 w-full items-center gap-3 rounded-2xl px-3 text-left text-xs font-bold text-slate-700 transition-colors hover:bg-slate-100"
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      <span>{item.label}</span>
                    </button>
                  ) : (
                    <NavLink
                      key={item.path}
                      to={item.path}
                      onClick={() => setIsMoreOpen(false)}
                      className={({ isActive }) =>
                        `flex min-h-11 items-center gap-3 rounded-2xl px-3 text-xs font-bold transition-colors ${
                          isActive ? 'bg-slate-950 text-white' : 'text-slate-700 hover:bg-slate-100'
                        }`
                      }
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      <span>{item.label}</span>
                    </NavLink>
                  )
                );
              })}
            </div>
          </div>
        )}

        <button
          type="button"
          aria-label="More navigation options"
          aria-expanded={isMoreOpen}
          title="More"
          onClick={() => setIsMoreOpen((open) => !open)}
          className={itemClass(isMoreOpen || isMoreActive)}
        >
          <MoreHorizontal className="h-[21px] w-[21px]" strokeWidth={2.15} />
        </button>
      </div>
    </nav>
  );
};

export default MobileBottomNav;
