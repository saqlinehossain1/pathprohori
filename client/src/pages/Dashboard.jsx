import React, { useContext, useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { SocketContext } from '../context/SocketContext';
import API from '../services/api';
import {
  ShieldAlert,
  Navigation,
  Mic,
  Activity,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Radio,
  ArrowRight,
} from 'lucide-react';

export const Dashboard = () => {
  const { user } = useContext(AuthContext);
  const { activeTrip, setActiveTrip, signalLossAlert } = useContext(SocketContext);

  const [loadingTrip, setLoadingTrip] = useState(true);
  const [panicLoading, setPanicLoading] = useState(false);

  useEffect(() => {
    const fetchActiveTrip = async () => {
      try {
        const { data } = await API.get('/trips/active');
        setActiveTrip(data);
      } catch (err) {
        console.error('Failed to fetch active trip:', err);
      } finally {
        setLoadingTrip(false);
      }
    };
    fetchActiveTrip();
  }, [setActiveTrip]);

  const handlePanicButton = async () => {
    if (!activeTrip) return;
    setPanicLoading(true);
    try {
      const { data } = await API.post(`/trips/${activeTrip._id}/trigger-panic`);
      setActiveTrip(data.trip);
    } catch (err) {
      console.error('Failed to trigger panic:', err);
    } finally {
      setPanicLoading(false);
    }
  };

  const handleCompleteTrip = async () => {
    if (!activeTrip) return;
    try {
      await API.put(`/trips/${activeTrip._id}/complete`);
      setActiveTrip(null);
    } catch (err) {
      console.error('Failed to complete trip:', err);
    }
  };

  return (
    <div className="space-y-8 relative">
      {/* Subtle Background Texture Layer */}
      <div className="absolute inset-0 bg-dots-texture pointer-events-none opacity-60 -z-10 rounded-3xl"></div>

      {/* Top Banner Welcome with Animated Gradient & Texture */}
      <div className="bg-gradient-to-r from-[#6B4355] via-[#5C3A48] to-[#4C2F3C] text-white rounded-3xl p-8 shadow-card flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative overflow-hidden animate-float">
        <div className="z-10 max-w-xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 backdrop-blur-md rounded-full text-xs font-semibold mb-3 border border-white/10">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            Common Workflows Active
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight">
            Hello, {user?.name || 'Commuter'}!
          </h1>
          <p className="text-sm text-[#EAD9E3] mt-2 font-medium leading-relaxed">
            PATHPROHORI is active. Your signal heartbeat is being monitored in real-time, and safe historical coordinates will be automatically purged after 48 hours.
          </p>
        </div>

        <div className="z-10 flex flex-wrap gap-3">
          <Link
            to="/log-journey"
            className="px-5 py-3 bg-white text-[#6B4355] hover:bg-[#FDF7F9] font-bold rounded-2xl text-xs transition-all shadow-md flex items-center gap-2 active:scale-95"
          >
            <Navigation className="w-4 h-4" />
            Log New Journey
          </Link>
          <Link
            to="/live-danger-feed"
            className="px-5 py-3 bg-white/15 hover:bg-white/20 text-white font-bold rounded-2xl text-xs border border-white/20 transition-all flex items-center gap-2"
          >
            <ShieldAlert className="w-4 h-4" />
            Live Danger Feed
          </Link>
        </div>

        {/* Decorative circle backdrop */}
        <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-white/5 rounded-full blur-2xl pointer-events-none"></div>
      </div>

      {/* Signal Loss Emergency Banner Alert */}
      {signalLossAlert && (
        <div className="bg-[#FDE8EC] border-2 border-[#E05370] text-[#2D2329] p-5 rounded-2xl flex items-start gap-4 animate-bounce">
          <div className="p-3 bg-[#E05370] text-white rounded-xl">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div className="flex-1">
            <h4 className="font-extrabold text-sm text-[#E05370] uppercase tracking-wider">
              CRITICAL SIGNAL LOSS DETECTED!
            </h4>
            <p className="text-xs text-[#6E656B] mt-1 font-medium">
              Commuter <strong>{signalLossAlert.userName}</strong> dropped internet heartbeat mid-journey (Vehicle: {signalLossAlert.vehicleType} #{signalLossAlert.numberPlate}). Auto-alert sent to guardians!
            </p>
          </div>
        </div>
      )}

      {/* Grid Section: Common Workflows Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Card 1: MERN Authentication Session */}
        <div className="bg-white p-6 rounded-3xl border border-[#EFEAEB] shadow-card hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-2xl bg-[#FDF7F9] text-[#6B4355] flex items-center justify-center font-bold">
              <CheckCircle2 className="w-6 h-6 text-[#6B4355]" />
            </div>
            <span className="px-3 py-1 bg-[#FDF7F9] text-[#6B4355] text-[11px] font-bold rounded-full uppercase tracking-wider">
              Workflow #1
            </span>
          </div>
          <h3 className="font-bold text-base text-[#2D2329]">MERN Authentication</h3>
          <p className="text-xs text-[#8C8289] font-medium mt-1 leading-relaxed">
            Stateless JWT user sessions with bcrypt password encryption on MongoDB Atlas.
          </p>
          <div className="mt-4 pt-4 border-t border-[#F4EFF2] flex items-center justify-between text-xs">
            <span className="text-[#8C8289] font-medium">Logged Role:</span>
            <span className="font-extrabold text-[#6B4355] uppercase">{user?.role}</span>
          </div>
        </div>

        {/* Card 2: Signal Loss Heartbeat Tracker */}
        <div className="bg-white p-6 rounded-3xl border border-[#EFEAEB] shadow-card hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-2xl bg-[#FDE8EC] text-[#E05370] flex items-center justify-center font-bold">
              <Radio className="w-6 h-6 text-[#E05370] animate-pulse" />
            </div>
            <span className="px-3 py-1 bg-[#FDE8EC] text-[#E05370] text-[11px] font-bold rounded-full uppercase tracking-wider">
              Workflow #2
            </span>
          </div>
          <h3 className="font-bold text-base text-[#2D2329]">Heartbeat Signal Tracker</h3>
          <p className="text-xs text-[#8C8289] font-medium mt-1 leading-relaxed">
            Auto-triggers guardian alerts if mid-journey data connection drops for &gt; 2 minutes.
          </p>
          <div className="mt-4 pt-4 border-t border-[#F4EFF2] flex items-center justify-between text-xs">
            <span className="text-[#8C8289] font-medium">Monitoring Interval:</span>
            <span className="font-extrabold text-[#E05370]">120s Timeout</span>
          </div>
        </div>

        {/* Card 3: 48-Hour Privacy Data Eraser */}
        <div className="bg-white p-6 rounded-3xl border border-[#EFEAEB] shadow-card hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-2xl bg-[#FDF7F9] text-[#6B4355] flex items-center justify-center font-bold">
              <Trash2 className="w-6 h-6 text-[#6B4355]" />
            </div>
            <span className="px-3 py-1 bg-[#FDF7F9] text-[#6B4355] text-[11px] font-bold rounded-full uppercase tracking-wider">
              Workflow #3
            </span>
          </div>
          <h3 className="font-bold text-base text-[#2D2329]">48-Hour Privacy Eraser</h3>
          <p className="text-xs text-[#8C8289] font-medium mt-1 leading-relaxed">
            Daily <code className="bg-[#F4EFF2] px-1.5 py-0.5 rounded text-[#6B4355]">node-cron</code> purges all precise GPS logs of safe completed trips older than 48 hours.
          </p>
          <div className="mt-4 pt-4 border-t border-[#F4EFF2] flex items-center justify-between text-xs">
            <span className="text-[#8C8289] font-medium">Scheduler:</span>
            <span className="font-extrabold text-[#6B4355]">Daily @ Midnight</span>
          </div>
        </div>
      </div>

      {/* Active Journey Status & One-Tap Panic Controls */}
      <div className="bg-white rounded-3xl p-8 border border-[#EFEAEB] shadow-card">
        <div className="flex items-center justify-between pb-6 border-b border-[#F4EFF2]">
          <div>
            <h3 className="text-xl font-extrabold text-[#2D2329]">Active Journey Monitor</h3>
            <p className="text-xs text-[#8C8289] font-medium mt-1">
              Live tracking status and emergency panic activation
            </p>
          </div>
          {activeTrip && (
            <span className="px-4 py-1.5 bg-amber-100 text-amber-800 text-xs font-extrabold rounded-full animate-pulse flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5" />
              TRIP IN PROGRESS
            </span>
          )}
        </div>

        <div className="mt-6">
          {activeTrip ? (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 p-5 bg-[#FBF9FA] rounded-2xl border border-[#F3E6EC]">
                <div>
                  <span className="text-[11px] font-bold uppercase text-[#8C8289]">Vehicle</span>
                  <p className="text-sm font-extrabold text-[#2D2329]">
                    {activeTrip.vehicleType} ({activeTrip.numberPlate || 'Unregistered'})
                  </p>
                </div>
                <div>
                  <span className="text-[11px] font-bold uppercase text-[#8C8289]">Destination</span>
                  <p className="text-sm font-extrabold text-[#2D2329]">
                    {activeTrip.destination}
                  </p>
                </div>
                <div>
                  <span className="text-[11px] font-bold uppercase text-[#8C8289]">Status</span>
                  <p className="text-sm font-extrabold text-[#6B4355]">
                    {activeTrip.status}
                  </p>
                </div>
                <div>
                  <span className="text-[11px] font-bold uppercase text-[#8C8289]">Last Heartbeat</span>
                  <p className="text-sm font-extrabold text-emerald-600 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" /> Just Now
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-4">
                <button
                  onClick={handlePanicButton}
                  disabled={panicLoading}
                  className="px-6 py-4 bg-[#E05370] hover:bg-[#D93856] text-white font-extrabold text-sm rounded-2xl shadow-lg flex items-center gap-2 pulse-emergency transition-all"
                >
                  <AlertTriangle className="w-5 h-5" />
                  ONE-TAP INSTANT PANIC BUTTON
                </button>

                <button
                  onClick={handleCompleteTrip}
                  className="px-6 py-4 bg-[#6B4355] hover:bg-[#5C3A48] text-white font-bold text-sm rounded-2xl shadow-md transition-all"
                >
                  Complete Trip Safely
                </button>
              </div>
            </div>
          ) : (
            <div className="text-center py-10 space-y-4">
              <div className="w-16 h-16 rounded-full bg-[#FDF7F9] text-[#6B4355] flex items-center justify-center mx-auto">
                <Navigation className="w-8 h-8" />
              </div>
              <div>
                <h4 className="font-bold text-base text-[#2D2329]">No Active Journey Registered</h4>
                <p className="text-xs text-[#8C8289] font-medium max-w-md mx-auto mt-1">
                  Before boarding an un-tracked transport (Rickshaw, CNG, Taxi), log your journey to enable heartbeat monitoring.
                </p>
              </div>
              <Link
                to="/log-journey"
                className="inline-flex items-center gap-2 px-6 py-3 bg-[#6B4355] hover:bg-[#5C3A48] text-white text-xs font-bold rounded-2xl shadow-md transition-all"
              >
                Log New Journey Now
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
