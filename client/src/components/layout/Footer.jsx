import React from 'react';

export const Footer = () => {
  return (
    <footer className="glass-footer py-2.5 px-6 text-xs text-slate-500 hidden md:block w-full z-20 shadow-xs select-none pointer-events-auto">
      <div className="w-full flex items-center justify-between">
        <span className="font-medium text-slate-600">© 2026 PATHPROHORI — Hyperlocal Transit & Personal Safety Infrastructure</span>
        <div className="flex items-center gap-4 text-[11px] font-medium">
          <span className="hover:text-slate-900 cursor-pointer transition-colors">Privacy & 48-Hour Data Purge</span>
          <span className="text-slate-300">•</span>
          <span className="hover:text-slate-900 cursor-pointer transition-colors">Guardian Protocol</span>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
