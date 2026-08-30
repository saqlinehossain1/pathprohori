import React from 'react';
import {
  HazardRadarVector,
  SatelliteTelemetryVector,
  PrivacyVaultVector,
} from '../common/DashboardVectors';
import { ShieldCheck, Activity, Trash2, ArrowUpRight, CheckCircle2, Shield } from 'lucide-react';

export const StatsOverview = () => {
  const stats = [
    {
      title: 'Community Verified Hazards',
      value: '24 Reports',
      desc: 'Real-time crowdsourced & verified incident feed',
      tag: '98% Confirmed',
      tagColor: 'text-emerald-800 bg-emerald-100/90 border-emerald-300',
      statusText: 'Active Feed',
      statusColor: 'text-emerald-800 bg-emerald-50 border-emerald-300',
      VectorComponent: HazardRadarVector,
      accentGlow: 'hover:border-rose-300 hover:shadow-rose-500/10',
      vectorClass: 'w-24 h-24 sm:w-28 sm:h-26 group-hover:scale-105 group-hover:-translate-y-1 transition-transform duration-300',
    },
    {
      title: 'Telemetry Heartbeat Ping',
      value: '15s Loop Active',
      desc: 'Automatic signal-loss detection & emergency ping',
      tag: '0.2s Sync Latency',
      tagColor: 'text-sky-800 bg-sky-100/90 border-sky-300',
      statusText: 'Connected',
      statusColor: 'text-sky-800 bg-sky-50 border-sky-300',
      VectorComponent: SatelliteTelemetryVector,
      accentGlow: 'hover:border-sky-300 hover:shadow-sky-500/10',
      vectorClass: 'w-24 h-24 sm:w-28 sm:h-26 group-hover:scale-105 group-hover:-translate-y-1 transition-transform duration-300',
    },
    {
      title: 'Privacy Auto-Purge',
      value: '48h Lifespan',
      desc: 'Permanent GPS log cleanup & cryptographic wipe',
      tag: 'Zero-Trace Policy',
      tagColor: 'text-indigo-800 bg-indigo-100/90 border-indigo-300',
      statusText: 'Enforced',
      statusColor: 'text-indigo-800 bg-indigo-50 border-indigo-300',
      VectorComponent: PrivacyVaultVector,
      accentGlow: 'hover:border-indigo-300 hover:shadow-indigo-500/10',
      vectorClass: 'w-24 h-24 sm:w-28 sm:h-26 group-hover:scale-105 group-hover:-translate-y-1 transition-transform duration-300',
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5">
      {stats.map((item, index) => {
        const Vector = item.VectorComponent;
        return (
          <div
            key={index}
            className={`bg-white rounded-2xl p-5 border border-slate-200 shadow-soft transition-all duration-300 hover:-translate-y-1.5 hover:shadow-card group cursor-default relative overflow-hidden flex flex-col justify-between ${item.accentGlow}`}
          >
            {/* Top Row: Category + Status Badge */}
            <div className="flex items-start justify-between gap-2 z-10">
              <span className="text-[11px] font-extrabold text-slate-700 uppercase tracking-wider font-display">
                {item.title}
              </span>
              <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider border shadow-2xs shrink-0 ${item.statusColor}`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
                {item.statusText}
              </span>
            </div>

            {/* Middle Row: Big Stat & Vector Illustration (Like Pathao app cards) */}
            <div className="flex items-center justify-between gap-2 my-2 relative z-10">
              <div className="min-w-0 flex-1">
                <h4 className="text-2xl sm:text-3xl font-black text-slate-950 tracking-tight font-display">
                  {item.value}
                </h4>
                <p className="text-xs text-slate-700 font-semibold leading-relaxed mt-1 line-clamp-2">
                  {item.desc}
                </p>
              </div>

              {/* Pathao-Style Vector Illustration Graphic */}
              <div className="shrink-0 flex items-center justify-end -mr-1">
                <Vector className={item.vectorClass} />
              </div>
            </div>

            {/* Bottom Row: Pathao-style Feature Pill Tag */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-between z-10">
              <span
                className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-black border shadow-2xs ${item.tagColor}`}
              >
                {item.tag}
              </span>
              <span className="text-[11px] font-bold text-slate-600 group-hover:text-slate-900 transition-colors">
                Live Status →
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default StatsOverview;
