import React from 'react';
import { ArrowRight } from 'lucide-react';
import { cn } from '../../utils/cn';

export const InteractiveHoverButton = React.forwardRef(
  ({ children, className, onClick, ...props }, ref) => {
    return (
      <button
        ref={ref}
        onClick={onClick}
        className={cn(
          'group relative w-auto whitespace-nowrap flex-shrink-0 cursor-pointer overflow-hidden rounded-2xl border border-slate-200 bg-slate-900 p-3.5 px-6 text-center text-xs font-extrabold text-white transition-all duration-300 hover:border-rose-500 shadow-md shadow-slate-950/10 font-display',
          className
        )}
        {...props}
      >
        <div className="flex items-center gap-2 whitespace-nowrap">
          <div className="h-2 w-2 rounded-full bg-rose-500 transition-all duration-300 group-hover:scale-[100.0]" />
          <span className="inline-block whitespace-nowrap transition-all duration-300 group-hover:translate-x-12 group-hover:opacity-0">
            {children}
          </span>
        </div>
        <div className="absolute top-0 z-10 flex h-full w-full translate-x-12 items-center justify-center gap-2 text-white opacity-0 transition-all duration-300 group-hover:-translate-x-5 group-hover:opacity-100 whitespace-nowrap">
          <span className="whitespace-nowrap font-display">{children}</span>
          <ArrowRight className="w-4 h-4 text-white flex-shrink-0" />
        </div>
      </button>
    );
  }
);

InteractiveHoverButton.displayName = 'InteractiveHoverButton';
export default InteractiveHoverButton;
