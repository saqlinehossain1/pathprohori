import React from 'react';
import { X } from 'lucide-react';

export const Modal = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl border border-[#EFEAEF] animate-scaleUp">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#F0EBF0] bg-[#FDF7F9]">
          <h3 className="text-lg font-extrabold text-[#2D2329]">{title}</h3>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-[#8C7A87] hover:text-[#2D2329] hover:bg-[#EFEAEF]/50 transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6 max-h-[80vh] overflow-y-auto">{children}</div>
      </div>
    </div>
  );
};

export default Modal;
