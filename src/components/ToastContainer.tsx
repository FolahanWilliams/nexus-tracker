'use client';

import { create } from 'zustand';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, AlertCircle, Info, X, Undo2 } from 'lucide-react';

interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
  onUndo?: () => void;
}

interface ToastStore {
  toasts: Toast[];
  addToast: (message: string, type: 'success' | 'error' | 'info', onUndo?: () => void) => void;
  removeToast: (id: string) => void;
}

export const useToastStore = create<ToastStore>((set) => ({
  toasts: [],
  addToast: (message, type, onUndo?) => {
    const id = Math.random().toString(36).substr(2, 9);
    set((state) => ({ toasts: [...state.toasts, { id, message, type, onUndo }] }));
    const duration = onUndo ? 5000 : 3000;
    setTimeout(() => {
      set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }));
    }, duration);
  },
  removeToast: (id) => {
    set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }));
  },
}));

export default function ToastContainer() {
  const { toasts, removeToast } = useToastStore();

  const toastStyles = {
    success: 'bg-[var(--color-bg-card)]/95 backdrop-blur-xl border border-[var(--color-green)]/30 text-[var(--color-text-primary)] shadow-[0_8px_32px_rgba(74,222,128,0.15)]',
    error: 'bg-[var(--color-bg-card)]/95 backdrop-blur-xl border border-[var(--color-red)]/30 text-[var(--color-text-primary)] shadow-[0_8px_32px_rgba(248,113,113,0.15)]',
    info: 'bg-[var(--color-bg-card)]/95 backdrop-blur-xl border border-[var(--color-blue)]/30 text-[var(--color-text-primary)] shadow-[0_8px_32px_rgba(96,165,250,0.15)]',
  };

  const iconColors = {
    success: 'text-[var(--color-green)]',
    error: 'text-[var(--color-red)]',
    info: 'text-[var(--color-blue)]',
  };

  return (
    <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2.5">
      <AnimatePresence>
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, y: -16, scale: 0.95, filter: 'blur(4px)' }}
            animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
            exit={{ opacity: 0, x: 80, scale: 0.9, filter: 'blur(4px)' }}
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            className={`flex items-center gap-3 px-4 py-3.5 rounded-xl min-w-[300px] ${toastStyles[toast.type]}`}
          >
            <div className={iconColors[toast.type]}>
              {toast.type === 'success' && <CheckCircle size={18} />}
              {toast.type === 'error' && <AlertCircle size={18} />}
              {toast.type === 'info' && <Info size={18} />}
            </div>
            <span className="flex-1 font-semibold text-sm">{toast.message}</span>
            {toast.onUndo && (
              <button
                onClick={() => { toast.onUndo?.(); removeToast(toast.id); }}
                className="flex items-center gap-1 px-2 py-1 rounded-md text-xs font-bold text-[var(--color-purple-light)] hover:bg-[var(--color-purple)]/20 transition-colors"
              >
                <Undo2 size={12} />
                Undo
              </button>
            )}
            <button
              onClick={() => removeToast(toast.id)}
              className="text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors"
            >
              <X size={14} />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
