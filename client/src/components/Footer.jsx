import React from 'react';

export const Footer = () => {
  return (
    <footer className="bg-white border-t border-[#EFEAEB] py-4 px-6 mt-auto">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#8C8289]">
        <div className="flex items-center gap-2">
          <span className="font-bold text-[#6B4355] tracking-wider">
            PATHPROHORI
          </span>
          <span>© 2026 PATHPROHORI Safety Systems</span>
        </div>

        <div className="flex items-center gap-6 font-medium">
          <a
            href="#privacy"
            className="hover:text-[#6B4355] transition-colors"
          >
            Privacy Policy
          </a>
          <a href="#terms" className="hover:text-[#6B4355] transition-colors">
            Terms of Service
          </a>
          <a
            href="#emergency"
            className="hover:text-[#6B4355] transition-colors"
          >
            Emergency Contacts
          </a>
        </div>
      </div>
    </footer>
  );
};
