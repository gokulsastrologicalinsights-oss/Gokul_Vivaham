'use client';

import { CheckCircle2, ShieldAlert, X } from 'lucide-react';

interface ToastProps {
  message: string;
  type?: 'success' | 'error';
  onClose?: () => void;
}

export default function Toast({ message, type = 'success', onClose }: ToastProps) {
  if (!message) return null;

  return (
    <div className={`p-4 rounded-xl border flex items-center justify-between gap-3 text-xs font-semibold shadow-md animate-in fade-in slide-in-from-top-4 duration-300 ${
      type === 'success'
        ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-650 dark:text-emerald-450'
        : 'bg-red-500/10 border-red-500/20 text-red-650 dark:text-red-450'
    }`}>
      <div className="flex items-center gap-2">
        {type === 'success' ? (
          <CheckCircle2 className="h-4.5 w-4.5 shrink-0" />
        ) : (
          <ShieldAlert className="h-4.5 w-4.5 shrink-0" />
        )}
        <span>{message}</span>
      </div>
      {onClose && (
        <button onClick={onClose} className="p-0.5 rounded-full hover:bg-black/5 dark:hover:bg-white/5 text-zinc-400">
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
