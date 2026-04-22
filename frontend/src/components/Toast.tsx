'use client';

import { useEffect, useState } from 'react';
import { create } from 'zustand';
import { cn } from '@/lib/utils';
import { CheckCircle, XCircle, Info, X } from 'lucide-react';

interface ToastItem {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

interface ToastStore {
  toasts: ToastItem[];
  addToast: (message: string, type?: 'success' | 'error' | 'info') => void;
  removeToast: (id: string) => void;
}

export const useToastStore = create<ToastStore>((set) => ({
  toasts: [],
  addToast: (message, type = 'info') => {
    const id = Date.now().toString();
    set((state) => ({ toasts: [...state.toasts, { id, message, type }] }));
    setTimeout(() => {
      set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }));
    }, 4000);
  },
  removeToast: (id) => {
    set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }));
  },
}));

function ToastIcon({ type }: { type: string }) {
  switch (type) {
    case 'success': return <CheckCircle size={16} className="text-green-700" />;
    case 'error': return <XCircle size={16} className="text-red-700" />;
    default: return <Info size={16} className="text-blue-700" />;
  }
}

export default function ToastContainer() {
  const { toasts, removeToast } = useToastStore();

  return (
    <div className="fixed top-4 right-4 z-[99999] flex flex-col gap-2 pointer-events-none">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={cn(
            'pointer-events-auto animate-in slide-in-from-right',
            'bg-retro-window border-t-[2px] border-l-[2px] border-white border-b-[2px] border-r-[2px] border-b-black border-r-black',
            'px-3 py-2 min-w-[250px] max-w-[350px] flex items-start gap-2 shadow-lg'
          )}
          style={{
            animation: 'slideIn 0.3s ease-out',
          }}
        >
          <ToastIcon type={toast.type} />
          <span className="text-[11px] flex-1 text-retro-text leading-tight pt-0.5">
            {toast.message}
          </span>
          <button
            className="retro-window-button flex-shrink-0"
            onClick={() => removeToast(toast.id)}
          >
            <X size={8} />
          </button>
        </div>
      ))}
    </div>
  );
}
