import React, { useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { useTrip } from '../hooks/useTrip';
import ActiveTripBanner from '../components/dashboard/ActiveTripBanner';
import StatsOverview from '../components/dashboard/StatsOverview';
import QuickActionsCard from '../components/dashboard/QuickActionsCard';
import LiveCommunityMarquee from '../components/dashboard/LiveCommunityMarquee';
import AnimatedBentoGrid from '../components/dashboard/AnimatedBentoGrid';
import InteractiveHoverButton from '../components/ui/InteractiveHoverButton';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { Sparkles, ShieldAlert } from 'lucide-react';
import PanicButton from '../components/emergency/PanicButton';

export const Dashboard = () => {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();

  const {
    activeTrip,
    signalLossAlert,
    loading: loadingTrip,
    panicLoading,
    triggerPanic,
    completeTrip,
  } = useTrip();

  const isResponseRole = user?.role === 'admin' || user?.role === 'operator';

  if (loadingTrip && !activeTrip) {
    return <LoadingSpinner label="Synchronizing journey heartbeat status..." />;
  }

  return (
    <div className="space-y-8 relative pb-12">
      {/* Background Texture Layer */}
      <div className="absolute inset-0 bg-dots-texture pointer-events-none opacity-60 -z-10 rounded-3xl" />

      {/* Hero Welcome Banner & Action Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
        {/* Welcome Banner */}
        <div
          className={`${
            isResponseRole ? 'lg:col-span-3' : 'lg:col-span-2'
          } bg-gradient-to-r from-[#6B4355] via-[#5C3A48] to-[#4C2F3C] text-white rounded-3xl p-6 sm:p-8 shadow-card flex flex-col justify-between relative overflow-hidden`}
        >
          {/* Ambient Glow Background Effect */}
          <div className="absolute -top-24 -right-24 w-96 h-96 bg-rose-500/20 rounded-full blur-3xl pointer-events-none" />

          <div className="z-10 max-w-xl space-y-3">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 bg-white/10 backdrop-blur-md rounded-full text-xs font-extrabold border border-white/15">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>
                {isResponseRole
                  ? 'PATHPROHORI Control Room & Operator Dispatch Center'
                  : 'PATHPROHORI Safety Engine Active'}
              </span>
              <Sparkles className="w-3.5 h-3.5 text-amber-300 ml-1" />
            </div>

            <h1 className="text-3xl sm:text-4xl font-black tracking-tight leading-tight">
              Welcome back, {user?.name || (isResponseRole ? 'System Monitor' : 'Commuter')}!
            </h1>

            <p className="text-xs sm:text-sm text-[#EAD9E3] font-medium leading-relaxed">
              {isResponseRole
                ? 'Monitoring real-time emergency signals, high-alert transit telemetry, and safety notifications across all commuter routes.'
                : 'Your signal heartbeat is monitored in real-time. Safe historical coordinates are automatically purged after 48 hours per privacy guidelines.'}
            </p>
          </div>

          {/* Action Buttons */}
          <div className="z-10 flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full mt-6 pt-4 border-t border-white/15">
            {!isResponseRole && (
              <InteractiveHoverButton onClick={() => navigate('/log-journey')} className="w-full sm:w-auto whitespace-nowrap">
                Log New Journey
              </InteractiveHoverButton>
            )}

            <button
              onClick={() => navigate('/notifications')}
              className="w-full sm:w-auto px-6 py-3.5 bg-white/20 hover:bg-white/30 text-white font-extrabold rounded-2xl text-xs border border-white/25 transition-all flex items-center justify-center gap-2 shadow-sm active:scale-95 cursor-pointer whitespace-nowrap"
            >
              <ShieldAlert className="w-4 h-4 text-amber-300 shrink-0" />
              <span>Emergency Notifications</span>
            </button>

            <button
              onClick={() => navigate('/live-danger-feed')}
              className="w-full sm:w-auto px-6 py-3.5 bg-white/15 hover:bg-white/20 text-white font-extrabold rounded-2xl text-xs border border-white/25 transition-all flex items-center justify-center gap-2 shadow-sm active:scale-95 cursor-pointer whitespace-nowrap"
            >
              <ShieldAlert className="w-4 h-4 text-rose-300 shrink-0" />
              <span>Live Danger Feed</span>
            </button>
          </div>
        </div>

        {/* Dedicated Prominent Panic Button Card (Only for Commuters & Guardians) */}
        {!isResponseRole && (
          <div className="lg:col-span-1 bg-white border-2 border-red-100 hover:border-red-200 rounded-3xl p-6 shadow-card flex flex-col items-center justify-center text-center relative overflow-hidden bg-gradient-to-b from-red-50/40 via-white to-white transition-all">
            <div className="flex items-center gap-1.5 px-3 py-1 bg-red-100 text-red-700 rounded-full text-[11px] font-black uppercase tracking-wider mb-4">
              <ShieldAlert className="w-3.5 h-3.5 text-red-600" />
              <span>Instant Emergency SOS</span>
            </div>

            <PanicButton />

            <p className="text-[11px] text-[#8C7A87] font-semibold mt-3 max-w-xs leading-tight">
              Transmits instant GPS coordinates to assigned guardians & response rooms.
            </p>
          </div>
        )}
      </div>

      {/* Active Trip Tracking Status Banner */}
      <ActiveTripBanner
        activeTrip={activeTrip}
        signalLossAlert={signalLossAlert}
        panicLoading={panicLoading}
        onPanic={triggerPanic}
        onComplete={completeTrip}
      />

      {/* High Level Stats Overview Metrics */}
      <StatsOverview />

      {/* Magic Bento Grid Showcase */}
      <AnimatedBentoGrid />

      {/* Quick Action Navigation Grid */}
      <QuickActionsCard />

      {/* Infinite Scrolling Safety Marquee & Testimonials */}
      <LiveCommunityMarquee />
    </div>
  );
};

export default Dashboard;
