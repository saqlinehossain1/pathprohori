import React from 'react';
import Card from '../common/Card';
import { ShieldCheck, Activity, Trash2 } from 'lucide-react';

export const StatsOverview = () => {
  const stats = [
    {
      title: 'Community Verified Incidents',
      value: '24 Reports',
      desc: 'Module 1 Crowdsourced Feed',
      icon: ShieldCheck,
      color: 'text-emerald-600',
    },
    {
      title: 'Heartbeat Monitor Status',
      value: 'Active Ping',
      desc: '15-sec signal loss timer',
      icon: Activity,
      color: 'text-sky-600',
    },
    {
      title: 'Privacy Purge Schedule',
      value: '48-hr Purge',
      desc: 'Module 3 Automatic cleanup',
      icon: Trash2,
      color: 'text-[#6B4355]',
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {stats.map((item, index) => {
        const Icon = item.icon;
        return (
          <Card key={index} className="flex items-center gap-4">
            <Icon className={`w-9 h-9 ${item.color} stroke-[2.2] flex-shrink-0`} />
            <div>
              <p className="text-xs font-extrabold text-[#8C7A87] uppercase tracking-wider">
                {item.title}
              </p>
              <h4 className="text-xl font-black text-[#2D2329] mt-0.5">{item.value}</h4>
              <p className="text-[11px] font-medium text-[#8C7A87] mt-0.5">{item.desc}</p>
            </div>
          </Card>
        );
      })}
    </div>
  );
};

export default StatsOverview;
