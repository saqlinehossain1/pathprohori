import React from 'react';

export const Footer = () => {
  return (
    <footer className="bg-white border-t border-[#EFEAEF] py-3 px-6 text-center text-xs text-[#8C7A87] font-medium hidden md:block">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <span>© 2026 PATHPROHORI — Hyperlocal Transit & Personal Safety Ecosystem</span>
        <div className="flex items-center gap-4">
          <span className="hover:text-[#6B4355] cursor-pointer">Privacy & Automatic Purge Policy</span>
          <span>•</span>
          <span className="hover:text-[#6B4355] cursor-pointer">Guardian Protocol</span>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
