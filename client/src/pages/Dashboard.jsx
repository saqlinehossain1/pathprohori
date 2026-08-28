import React, { useContext, useState, useEffect } from 'react';
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
import { Sparkles, ShieldAlert, CheckCircle2, ArrowRight, ShieldCheck, Bell } from 'lucide-react';
import tripApi from '../api/tripApi';
import PanicButton from '../components/emergency/PanicButton';

export const Dashboard = () => {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();

  const {
    activeTrip,
    signalLossAlert,
    loading: loadingTrip,
    panicLoading,
    deactivating,
    triggerPanic,
    deactivateAlarm,
    completeTrip,
  } = useTrip();

  const [recentSafeTrip, setRecentSafeTrip] = useState(null);
  const isResponseRole = user?.role === 'admin' || user?.role === 'operator';

  // Fetch recent safe completed trip if no active trip exists
  useEffect(() => {
    if (!activeTrip) {
      tripApi
        .getTripHistory()
        .then((data) => {
          if (Array.isArray(data) && data.length > 0) {
            setRecentSafeTrip(data[0]); // Most recent safe journey
          }
        })
        .catch((err) => console.error('Failed to fetch recent trip history:', err));
    }
  }, [activeTrip]);

  if (loadingTrip && !activeTrip) {
    return <LoadingSpinner label="Synchronizing journey heartbeat status..." />;
  }

  return (
    <div className="space-y-8 relative pb-12">
      {/* Clean Text Welcome Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-2 border-b border-slate-200/60">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-50 text-emerald-700 rounded-full text-xs font-extrabold mb-2 border border-emerald-200 shadow-2xs">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-display">
              {isResponseRole
                ? 'PATHPROHORI Control Room & Operator Dispatch Center'
                : 'PATHPROHORI Safety Engine Active'}
            </span>
            <Sparkles className="w-3.5 h-3.5 text-amber-500 ml-1" />
          </div>

          <h1 className="text-2xl sm:text-4xl font-black text-slate-900 tracking-tight leading-tight font-display">
            Welcome back, {user?.name || (isResponseRole ? 'System Monitor' : 'Commuter')}!
          </h1>

          <p className="text-xs sm:text-sm text-slate-500 mt-1 font-medium leading-relaxed">
            {isResponseRole
              ? 'Monitoring real-time emergency signals, high-alert transit telemetry, and safety notifications across all commuter routes.'
              : 'Your signal heartbeat is monitored in real-time. Historical coordinates automatically purge after 48 hours per privacy guidelines.'}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto flex-shrink-0">
          {!isResponseRole && (
            <InteractiveHoverButton onClick={() => navigate('/log-journey')} className="w-full sm:w-auto whitespace-nowrap">
              Log New Journey
            </InteractiveHoverButton>
          )}

          <button
            onClick={() => navigate('/notifications')}
            className="order-3 w-full sm:w-auto px-4 py-3 bg-white hover:bg-slate-50 text-slate-800 border border-slate-200 font-extrabold rounded-2xl text-xs transition-all flex items-center justify-center gap-1.5 shadow-sm active:scale-95 cursor-pointer whitespace-nowrap font-display"
          >
            <Bell className="w-4 h-4 text-rose-600 flex-shrink-0" />
            <span className="whitespace-nowrap">Notifications</span>
          </button>

          <button
            onClick={() => navigate('/live-danger-feed')}
            className="order-2 w-full sm:w-auto px-5 py-3 bg-slate-900 hover:bg-slate-800 text-white font-extrabold rounded-2xl text-xs transition-all flex items-center justify-center gap-2 shadow-sm active:scale-95 cursor-pointer whitespace-nowrap flex-shrink-0 font-display"
          >
            <ShieldAlert className="w-4 h-4 text-rose-400 flex-shrink-0" />
            <span className="whitespace-nowrap">Live Danger Feed</span>
          </button>
        </div>
      </div>

      {/* Active Trip Tracking Status Banner (If Active) */}
      {activeTrip && (
        <ActiveTripBanner
          activeTrip={activeTrip}
          signalLossAlert={signalLossAlert}
          panicLoading={panicLoading}
          onPanic={triggerPanic}
          onComplete={completeTrip}
          onDeactivateAlarm={deactivateAlarm}
          deactivating={deactivating}
        />
      )}

      {/* Recent Safe Journey 1-Liner Banner (If No Active Trip & Recent Safe Journey Exists) */}
      {!activeTrip && recentSafeTrip && (
        <div className="p-4 bg-gradient-to-r from-emerald-500/10 via-emerald-50 to-white border border-emerald-200/80 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-black text-slate-900 font-display truncate">
                🎉 Safe Arrival Confirmed: Last journey to <span className="text-emerald-700 font-extrabold">{recentSafeTrip.destination}</span> via {recentSafeTrip.vehicleType} arrived safely.
              </p>
              <p className="text-[11px] text-slate-500 font-medium">
                Location telemetry & check-in photos will auto-purge in 48 hours for privacy.
              </p>
            </div>
          </div>

          <button
            onClick={() => navigate('/log-journey')}
            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shrink-0 shadow-2xs active:scale-95 font-display"
          >
            <ShieldCheck className="w-4 h-4" />
            <span>View Safe Journeys</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

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
