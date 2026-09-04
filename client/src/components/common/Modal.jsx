import React from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

export const Modal = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-md animate-fadeIn">
      <div className="bg-white rounded-2xl sm:rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl border border-slate-200 animate-scaleUp max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 sm:py-4 border-b border-slate-100 bg-slate-50 shrink-0">
          <h3 className="text-base sm:text-lg font-black text-slate-900 font-display truncate pr-2">{title}</h3>
          <button
            onClick={onClose}
            className="p-1.5 sm:p-2 rounded-xl text-slate-400 hover:text-slate-900 hover:bg-slate-200/50 transition-all cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-4 sm:p-6 max-h-[calc(90vh-65px)] overflow-y-auto custom-scrollbar touch-pan-y flex-1">{children}</div>
      </div>
    </div>,
    document.body
  );
};

export default Modal;
