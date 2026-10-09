'use client';

import { useEffect } from 'react';

interface RequestSentConfirmationProps {
  onClose: () => void;
  durationMs?: number;
}

export default function RequestSentConfirmation({ onClose, durationMs = 1800 }: RequestSentConfirmationProps) {
  useEffect(() => {
    const timeout = window.setTimeout(onClose, durationMs);
    return () => window.clearTimeout(timeout);
  }, [durationMs, onClose]);

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/25 px-6 backdrop-blur-[2px]"
      role="status"
      aria-live="polite"
      aria-label="Request Sent"
    >
      <div className="request-sent-confirmation rounded-3xl border border-gold-400/30 bg-white/95 px-10 py-8 text-center shadow-2xl dark:bg-zinc-900/95">
        <div className="request-sent-icon mx-auto flex h-24 w-24 items-center justify-center rounded-full border-2 border-emerald-500/25 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
          <svg className="h-14 w-14" viewBox="0 0 52 52" fill="none" aria-hidden="true">
            <circle className="request-sent-circle" cx="26" cy="26" r="23" />
            <path className="request-sent-tick" d="M15 27.5 22.5 35 38 18" />
          </svg>
        </div>
        <p className="mt-5 font-serif text-xl font-bold text-zinc-900 dark:text-zinc-50">Request Sent!</p>
        <span className="sr-only">Your interest request was sent successfully.</span>
      </div>
    </div>
  );
}
