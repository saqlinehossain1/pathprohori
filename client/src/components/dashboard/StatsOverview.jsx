import React from 'react';
import Card from '../common/Card';
import { ShieldCheck, Activity, Trash2, ArrowUpRight, CheckCircle2 } from 'lucide-react';

export const StatsOverview = () => {
  const stats = [
    {
      title: 'Community Verified Incidents',
      value: '24 Reports',
      desc: 'Crowdsourced Feed',
      icon: ShieldCheck,
      badge: '+12% active verified',
      badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      iconBg: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
    },
    {
      title: 'Heartbeat Monitor Status',
      value: 'Active Ping',
      desc: '15-sec signal loss timer',
      icon: Activity,
      badge: 'Real-time Socket',
      badgeColor: 'bg-sky-50 text-sky-700 border-sky-200',
      iconBg: 'bg-sky-500/10 text-sky-600 border-sky-500/20',
    },
    {
      title: 'Privacy Purge Schedule',
      value: '48-hr Purge',
      desc: 'Automatic cleanup',
      icon: Trash2,
      badge: 'Privacy Compliant',
      badgeColor: 'bg-rose-50 text-rose-700 border-rose-200',
      iconBg: 'bg-rose-500/10 text-rose-600 border-rose-500/20',
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
      {stats.map((item, index) => {
        const Icon = item.icon;
        return (
          <div
            key={index}
            className="group relative bg-white/95 backdrop-blur-xl rounded-3xl p-5 border border-slate-200/80 shadow-card hover:shadow-glass hover:-translate-y-0.5 transition-all duration-300 overflow-hidden"
          >
            {/* Subtle card ambient highlight */}
            <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-rose-500/5 rounded-full blur-2xl group-hover:bg-rose-500/10 transition-colors pointer-events-none" />

            <div className="flex items-start justify-between gap-3">
              <div className={`p-3 rounded-2xl border ${item.iconBg} flex items-center justify-center transition-transform group-hover:scale-105 duration-300 shadow-xs`}>
                <Icon className="w-6 h-6 stroke-[2.2]" />
              </div>
              <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold border ${item.badgeColor} font-display`}>
                <CheckCircle2 className="w-3 h-3" />
                {item.badge}
              </span>
            </div>

            <div className="mt-4">
              <p className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider font-display">
                {item.title}
              </p>
              <h4 className="text-2xl font-black text-slate-900 mt-0.5 font-display tracking-tight">{item.value}</h4>
              <p className="text-xs font-medium text-slate-500 mt-1 flex items-center gap-1">
                <span>{item.desc}</span>
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default StatsOverview;

