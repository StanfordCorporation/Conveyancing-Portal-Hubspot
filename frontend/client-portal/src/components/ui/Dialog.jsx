import React from 'react';
import { X } from 'lucide-react';

/**
 * Dialog/Modal Component
 * Reusable modal overlay with header, content, and footer sections
 */
export function Dialog({ isOpen, onOpenChange, children }) {
  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
        onClick={() => onOpenChange(false)}
      />

      {/* Dialog */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] flex flex-col overflow-hidden animate-scale-in"
          onClick={(e) => e.stopPropagation()}
        >
          {children}
        </div>
      </div>

      <style>{`
        @keyframes scale-in {
          from {
            transform: scale(0.95);
            opacity: 0;
          }
          to {
            transform: scale(1);
            opacity: 1;
          }
        }

        .animate-scale-in {
          animation: scale-in 0.3s ease-out;
        }
      `}</style>
    </>
  );
}

/**
 * Dialog Header
 */
export function DialogHeader({ children, onClose }) {
  return (
    <div className="flex items-center justify-between p-6 border-b border-slate-200">
      <div>{children}</div>
      {onClose && (
        <button
          onClick={onClose}
          className="p-1 hover:bg-slate-100 rounded-lg transition-colors"
        >
          <X className="w-5 h-5 text-slate-600" />
        </button>
      )}
    </div>
  );
}

/**
 * Dialog Title
 */
export function DialogTitle({ children }) {
  return <h2 className="text-2xl font-bold text-slate-900">{children}</h2>;
}

/**
 * Dialog Description
 */
export function DialogDescription({ children }) {
  return <p className="text-slate-600 mt-1">{children}</p>;
}

/**
 * Dialog Content
 */
export function DialogContent({ children }) {
  return <div className="p-6 overflow-y-auto flex-1">{children}</div>;
}

/**
 * Dialog Footer
 */
export function DialogFooter({ children }) {
  return (
    <div className="flex gap-3 justify-end p-6 border-t border-slate-200 bg-slate-50">
      {children}
    </div>
  );
}

export default Dialog;
