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

  if (loadingTrip && !activeTrip) {
    return <LoadingSpinner label="Synchronizing journey heartbeat status..." />;
  }

  return (
    <div className="space-y-8 relative pb-12">
      {/* Background Texture Layer */}
      <div className="absolute inset-0 bg-dots-texture pointer-events-none opacity-60 -z-10 rounded-3xl" />

      {/* Hero Welcome Banner with Full Name & Clean Button Placement */}
      <div className="bg-gradient-to-r from-[#6B4355] via-[#5C3A48] to-[#4C2F3C] text-white rounded-3xl p-8 shadow-card flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative overflow-hidden">
        {/* Ambient Glow Background Effect */}
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-rose-500/20 rounded-full blur-3xl pointer-events-none"></div>

        <div className="z-10 max-w-xl">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 bg-white/10 backdrop-blur-md rounded-full text-xs font-extrabold mb-3 border border-white/15">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>PATHPROHORI Safety Engine Active</span>
            <Sparkles className="w-3.5 h-3.5 text-amber-300 ml-1" />
          </div>

          <h1 className="text-3xl sm:text-4xl font-black tracking-tight leading-tight">
            Welcome back, {user?.name || 'Commuter'}!
          </h1>

          <p className="text-xs sm:text-sm text-[#EAD9E3] mt-2 font-medium leading-relaxed">
            Your signal heartbeat is monitored in real-time. Safe historical coordinates are automatically purged after 48 hours per privacy guidelines.
          </p>
        </div>

        {/* Action Buttons: Clean Side-by-Side Horizontal Layout */}
        <div className="z-10 flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto flex-shrink-0">
          <InteractiveHoverButton onClick={() => navigate('/log-journey')} className="w-full sm:w-auto whitespace-nowrap">
            Log New Journey
          </InteractiveHoverButton>

          <button
            onClick={() => navigate('/live-danger-feed')}
            className="w-full sm:w-auto px-6 py-3.5 bg-white/15 hover:bg-white/20 text-white font-extrabold rounded-2xl text-xs border border-white/25 transition-all flex items-center justify-center gap-2 shadow-sm active:scale-95 cursor-pointer whitespace-nowrap flex-shrink-0"
          >
            <ShieldAlert className="w-4 h-4 text-rose-300 flex-shrink-0" />
            <span className="whitespace-nowrap">Live Danger Feed</span>
          </button>
        </div>
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
