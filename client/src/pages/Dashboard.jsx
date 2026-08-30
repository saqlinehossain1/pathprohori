import React, { useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { useTrip } from '../hooks/useTrip';
import ActiveTripBanner from '../components/dashboard/ActiveTripBanner';
import StatsOverview from '../components/dashboard/StatsOverview';
import QuickActionsCard from '../components/dashboard/QuickActionsCard';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { ShieldAlert, CheckCircle2, ArrowRight, ShieldCheck, Bell } from 'lucide-react';
import tripApi from '../api/tripApi';
import PersonalSafetyStatusCard from '../components/dashboard/PersonalSafetyStatusCard';

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
    updateSafetyStatus,
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
    <div className="space-y-6 pb-8 animate-page-enter">
      {/* Clean Operations Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-100/90 text-emerald-950 rounded-md text-[11px] font-black mb-1.5 border border-emerald-300 shadow-2xs">
            <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse" />
            <span>
              {isResponseRole
                ? 'Control Room & Safety Operations Dispatch'
                : 'Safety Telemetry Loop Active'}
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-black text-slate-950 tracking-tight font-display">
            Welcome back, {user?.name || (isResponseRole ? 'System Monitor' : 'Commuter')}
          </h1>

          <p className="text-xs sm:text-sm text-slate-700 mt-1 font-semibold leading-relaxed max-w-2xl">
            {isResponseRole
              ? 'Monitoring real-time emergency signals, transit telemetry, and safety feeds across active commuter corridors.'
              : 'Continuous heartbeat telemetry active. GPS coordinates automatically purged after 48 hours.'}
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2.5 flex-shrink-0">
          {!isResponseRole && (
            <button
              onClick={() => navigate('/log-journey')}
              className="px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-black rounded-xl transition-all flex items-center gap-2 shadow-xs hover:shadow-rose-600/30 active:scale-[0.98] cursor-pointer"
            >
              <span>Log New Journey</span>
            </button>
          )}

          <button
            onClick={() => navigate('/live-danger-feed')}
            className="px-3.5 py-2.5 bg-white hover:bg-slate-50 text-slate-900 border border-slate-300 text-xs font-black rounded-xl transition-all flex items-center gap-1.5 shadow-2xs hover:border-slate-400 active:scale-[0.98] cursor-pointer"
          >
            <ShieldAlert className="w-4 h-4 text-rose-600" />
            <span>Live Danger Feed</span>
          </button>

          <button
            onClick={() => navigate('/notifications')}
            className="px-3.5 py-2.5 bg-white hover:bg-slate-50 text-slate-900 border border-slate-300 rounded-xl text-xs font-black transition-all flex items-center justify-center shadow-2xs hover:border-slate-400 active:scale-[0.98] cursor-pointer"
            title="Emergency Notifications"
          >
            <Bell className="w-4 h-4 text-slate-700" />
          </button>
        </div>
      </div>

      {/* 1. Primary Personal Safety Status Panel */}
      {!isResponseRole && (
        <PersonalSafetyStatusCard />
      )}

      {/* 2. Active Transit Tracking Status (If In-Transit) */}
      {activeTrip && (
        <ActiveTripBanner
          activeTrip={activeTrip}
          signalLossAlert={signalLossAlert}
          panicLoading={panicLoading}
          onPanic={triggerPanic}
          onComplete={completeTrip}
          onDeactivateAlarm={deactivateAlarm}
          deactivating={deactivating}
          onSafetyStatusChange={updateSafetyStatus}
        />
      )}

      {/* 3. Recent Safe Journey Summary (If Idle) */}
      {!activeTrip && recentSafeTrip && (
        <div className="p-4 bg-gradient-to-r from-emerald-50/90 via-white to-white border border-emerald-200 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3.5 shadow-soft">
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-sm shadow-emerald-600/20">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-xs sm:text-sm font-black text-slate-950 truncate">
                  Safe Arrival Confirmed: Last journey to <span className="text-emerald-700 font-black underline decoration-emerald-300 underline-offset-2">{recentSafeTrip.destination}</span> arrived safely.
                </p>
                <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-900 border border-emerald-300 shrink-0">
                  ⏱️ 48h Auto-Purge
                </span>
              </div>
              <p className="text-xs text-slate-700 font-semibold mt-0.5">
                Transit telemetry & GPS breadcrumbs will automatically purge in 48 hours for commuter privacy.
              </p>
            </div>
          </div>

          <button
            onClick={() => navigate('/log-journey')}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-black rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shrink-0 shadow-2xs hover:shadow-md active:scale-95"
          >
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Trip History</span>
            <ArrowRight className="w-3.5 h-3.5 text-slate-300" />
          </button>
        </div>
      )}

      {/* 4. High-Level Telemetry & Operational Metrics */}
      <StatsOverview />

      {/* 5. Quick Operational Shortcuts */}
      <QuickActionsCard />
    </div>
  );
};

export default Dashboard;
