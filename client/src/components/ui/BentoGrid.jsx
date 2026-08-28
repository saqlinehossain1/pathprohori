import React from 'react';
import { ArrowRight } from 'lucide-react';
import { cn } from '../../utils/cn';

export const BentoGrid = ({ children, className }) => {
  return (
    <div
      className={cn(
        'grid w-full auto-rows-[17.5rem] grid-cols-3 gap-6',
        className
      )}
    >
      {children}
    </div>
  );
};

export const BentoCard = ({
  name,
  className,
  background,
  Icon,
  description,
  href,
  cta,
}) => (
  <div
    key={name}
    className={cn(
      'group relative col-span-3 flex flex-col justify-between overflow-hidden rounded-3xl',
      // glass light styles
      'bg-white/95 backdrop-blur-xl border border-slate-200/80',
      'shadow-card hover:shadow-glass hover:-translate-y-1 transition-all duration-300',
      className
    )}
  >
    <div className="w-full relative z-0 flex-shrink-0">{background}</div>

    <div className="pointer-events-none z-10 flex transform-gpu flex-col gap-1 px-6 pt-3 pb-12 transition-all duration-300 group-hover:-translate-y-1">
      {Icon && (
        <div className="w-10 h-10 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center mb-1 group-hover:bg-slate-900 group-hover:border-slate-800 group-hover:text-white transition-all duration-300 shadow-xs">
          <Icon className="h-5 w-5 text-rose-600 group-hover:text-white transition-colors duration-300" />
        </div>
      )}
      <h3 className="text-base font-extrabold text-slate-900 mt-0.5 font-display tracking-tight">{name}</h3>
      <p className="max-w-lg text-xs font-medium text-slate-500 leading-relaxed line-clamp-2">{description}</p>
    </div>

    <div
      className={cn(
        'pointer-events-none absolute bottom-0 flex w-full translate-y-4 transform-gpu flex-row items-center px-6 py-3.5 opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100'
      )}
    >
      {href && cta && (
        <a
          href={href}
          className="pointer-events-auto inline-flex items-center gap-1.5 text-xs font-black text-rose-600 hover:text-rose-700 transition-colors group-hover:underline font-display"
        >
          {cta}
          <ArrowRight className="ml-1 h-3.5 w-3.5" />
        </a>
      )}
    </div>

    <div className="pointer-events-none absolute inset-0 transform-gpu transition-all duration-300 group-hover:bg-slate-900/[0.02]" />
  </div>
);

