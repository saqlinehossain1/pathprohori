import React from 'react';
import { ArrowRight } from 'lucide-react';
import { cn } from '../../utils/cn';

export const BentoGrid = ({ children, className }) => {
  return (
    <div
      className={cn(
        'grid w-full auto-rows-[16.5rem] grid-cols-3 gap-6',
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
      // light styles
      'bg-white [box-shadow:0_0_0_1px_rgba(0,0,0,.03),0_2px_4px_rgba(0,0,0,.05),0_12px_24px_rgba(0,0,0,.05)]',
      // hover effect
      'hover:shadow-card transition-all duration-300 border border-[#E0D5DC]',
      className
    )}
  >
    <div className="w-full relative z-0">{background}</div>

    <div className="pointer-events-none z-10 flex transform-gpu flex-col gap-1 p-5 transition-all duration-300 group-hover:-translate-y-1">
      {Icon && <Icon className="h-7 w-7 origin-left transform-gpu text-[#6B4355] transition-all duration-300 ease-in-out group-hover:scale-110" />}
      <h3 className="text-lg font-extrabold text-[#2D2329] mt-1">{name}</h3>
      <p className="max-w-lg text-xs font-medium text-[#8C7A87] leading-relaxed line-clamp-2">{description}</p>
    </div>

    <div
      className={cn(
        'pointer-events-none absolute bottom-0 flex w-full translate-y-10 transform-gpu flex-row items-center p-4 opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100'
      )}
    >
      {href && cta && (
        <a
          href={href}
          className="pointer-events-auto inline-flex items-center gap-1.5 text-xs font-extrabold text-[#6B4355] hover:text-[#543343] transition-colors"
        >
          {cta}
          <ArrowRight className="ml-1 h-3.5 w-3.5" />
        </a>
      )}
    </div>

    <div className="pointer-events-none absolute inset-0 transform-gpu transition-all duration-300 group-hover:bg-[#6B4355]/[0.02]" />
  </div>
);
