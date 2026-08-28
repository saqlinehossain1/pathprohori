import React from 'react';

export const Footer = () => {
  return (
    <footer className="bg-white/90 backdrop-blur-xl border-t border-slate-200/80 py-3 px-6 text-center text-xs text-slate-500 font-medium hidden md:block">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <span>© 2026 PATHPROHORI — Hyperlocal Transit & Personal Safety Ecosystem</span>
        <div className="flex items-center gap-4">
          <span className="hover:text-rose-600 cursor-pointer transition-colors">Privacy & Automatic Purge Policy</span>
          <span>•</span>
          <span className="hover:text-rose-600 cursor-pointer transition-colors">Guardian Protocol</span>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
