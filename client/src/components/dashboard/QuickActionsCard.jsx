import React from 'react';
import { Link } from 'react-router-dom';
import {
  VehicleTransitVector,
  HazardRadarVector,
  VoiceDuressVector,
  GuardianShieldVector,
} from '../common/DashboardVectors';
import { ArrowRight, Sparkles } from 'lucide-react';

export const QuickActionsCard = () => {
  const actions = [
    {
      title: 'Log Safe Journey',
      category: 'Transit Protection',
      desc: 'Live GPS corridor loop for CNG, Rickshaw, Bike & Cab rides',
      path: '/log-journey',
      tag: ' BIKE · CNG · CAB',
      tagColor: 'text-rose-800 bg-rose-100/90 border-rose-300',
      btnText: 'Start Journey',
      btnBg: 'bg-rose-600 hover:bg-rose-700 text-white shadow-rose-600/20',
      VectorComponent: VehicleTransitVector,
      vectorClass: 'w-28 h-24 group-hover:scale-108 group-hover:-translate-y-1 transition-all duration-300',
    },
    {
      title: 'Danger Feed & Radar',
      category: 'Dhaka Threat Map',
      desc: 'Real-time crowdsourced hazard alerts & verified safe corridors',
      path: '/live-danger-feed',
      tag: '24 LIVE ALERTS',
      tagColor: 'text-amber-800 bg-amber-100/90 border-amber-300',
      btnText: 'Open Danger Feed',
      btnBg: 'bg-amber-600 hover:bg-amber-700 text-white shadow-amber-600/20',
      VectorComponent: HazardRadarVector,
      vectorClass: 'w-26 h-24 group-hover:scale-108 group-hover:-translate-y-1 transition-all duration-300',
    },
    {
      title: 'Voice SOS & Duress',
      category: 'Stealth Audio',
      desc: 'Hands-free emergency phrase trigger & covert distress PIN',
      path: '/voice-settings',
      tag: 'HANDS-FREE PROTOCOL',
      tagColor: 'text-sky-800 bg-sky-100/90 border-sky-300',
      btnText: 'Setup Voice Duress',
      btnBg: 'bg-sky-600 hover:bg-sky-700 text-white shadow-sky-600/20',
      VectorComponent: VoiceDuressVector,
      vectorClass: 'w-26 h-24 group-hover:scale-108 group-hover:-translate-y-1 transition-all duration-300',
    },
    {
      title: 'Guardian Protocol',
      category: 'Emergency Dispatch',
      desc: 'Auto-sync emergency contacts, SMS broadcast & live breadcrumbs',
      path: '/profile',
      tag: 'GUARDIANS SYNCED',
      tagColor: 'text-emerald-800 bg-emerald-100/90 border-emerald-300',
      btnText: 'Manage Guardians',
      btnBg: 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/20',
      VectorComponent: GuardianShieldVector,
      vectorClass: 'w-26 h-24 group-hover:scale-108 group-hover:-translate-y-1 transition-all duration-300',
    },
  ];

  return (
    <div className="space-y-3.5 pt-1">
      {/* High Contrast Section Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest font-display">
            Quick Operations
          </h3>
          <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
        </div>
        <span className="text-xs text-slate-600 font-extrabold uppercase tracking-wider">
          Instant Commuter Shortcuts
        </span>
      </div>

      {/* Pathao-Style Rich Action Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        {actions.map((act, idx) => {
          const Vector = act.VectorComponent;
          return (
            <Link
              key={idx}
              to={act.path}
              className="min-w-0 bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-soft transition-all duration-300 hover:-translate-y-1.5 hover:shadow-card hover:border-slate-300 group cursor-pointer flex flex-col justify-between relative overflow-hidden"
            >
              {/* Top Meta info */}
              <div>
                <div className="flex items-center justify-between gap-1 mb-1.5">
                  <span className="min-w-0 break-words text-[10px] font-black uppercase tracking-wider text-slate-700 font-display">
                    {act.category}
                  </span>
                  <span className="text-xs font-bold text-slate-400 group-hover:text-slate-900 group-hover:translate-x-0.5 transition-all">
                    →
                  </span>
                </div>

                <h4 className="text-base sm:text-lg font-black text-slate-900 group-hover:text-rose-600 transition-colors font-display tracking-tight leading-snug">
                  {act.title}
                </h4>

                <p className="text-xs text-slate-700 font-semibold leading-relaxed mt-1 line-clamp-2">
                  {act.desc}
                </p>
              </div>

              {/* Center Vector Illustration (Like Pathao app cards) */}
              <div className="my-3 flex items-center justify-center relative py-1">
                <div className="absolute inset-0 bg-radial from-slate-100/60 to-transparent rounded-full -z-0 opacity-70 group-hover:scale-110 transition-transform duration-300" />
                <div className="z-10 flex justify-center">
                  <Vector className={act.vectorClass} />
                </div>
              </div>

              {/* Bottom Tag & Action Button */}
              <div className="space-y-2.5 pt-2 border-t border-slate-100">
                <div className="flex items-center justify-start">
                  <span
                    className={`inline-flex max-w-full items-center gap-1 truncate px-2.5 py-0.5 rounded-full text-[10px] font-black border shadow-2xs ${act.tagColor}`}
                  >
                    {act.tag}
                  </span>
                </div>

                <div
                  className={`w-full py-2.5 rounded-xl text-xs font-black transition-all text-center flex items-center justify-center gap-1.5 shadow-2xs active:scale-[0.98] ${act.btnBg}`}
                >
                  <span>{act.btnText}</span>
                  <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
};

export default QuickActionsCard;
