import React from 'react';
import { Link } from 'react-router-dom';
import Card from '../common/Card';
import { Navigation, ShieldAlert, Mic } from 'lucide-react';

export const QuickActionsCard = () => {
  const actions = [
    {
      title: 'Log New Journey',
      desc: 'Track CNG, Rickshaw, Bus or Uber rides live',
      path: '/log-journey',
      icon: Navigation,
      btnText: 'Start Log',
      color: 'text-rose-600',
    },
    {
      title: 'Danger Feed & Heatmap',
      desc: 'View real-time safety alerts & reports',
      path: '/live-danger-feed',
      icon: ShieldAlert,
      btnText: 'Open Feed',
      color: 'text-amber-600',
    },
    {
      title: 'Voice Triggers & Duress',
      desc: 'Set secret emergency phrase & duress PIN',
      path: '/voice-settings',
      icon: Mic,
      btnText: 'Voice Setup',
      color: 'text-sky-600',
    },
  ];

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-extrabold text-slate-900 font-display">Quick Safety Actions</h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {actions.map((act, idx) => {
          const Icon = act.icon;
          return (
            <Card
              key={idx}
              className="flex flex-col justify-between space-y-4 hover:-translate-y-1 transition-transform border-slate-200/80 shadow-card"
            >
              <div className="space-y-3">
                <Icon className={`w-8 h-8 ${act.color} stroke-[2.2]`} />
                <div>
                  <h4 className="font-extrabold text-base text-slate-900 font-display">{act.title}</h4>
                  <p className="text-xs text-slate-500 font-medium leading-relaxed mt-1">{act.desc}</p>
                </div>
              </div>

              <Link
                to={act.path}
                className="w-full py-2.5 bg-slate-50 hover:bg-slate-900 hover:text-white text-slate-800 border border-slate-200 rounded-2xl text-xs font-bold transition-all text-center block font-display shadow-xs"
              >
                {act.btnText}
              </Link>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default QuickActionsCard;
