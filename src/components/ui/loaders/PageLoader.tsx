'use client';

import Spinner from './Spinner';

export default function PageLoader({ message = 'Loading Gokul Vivaham...' }: { message?: string }) {
  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-white/90 dark:bg-zinc-950/90 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="flex flex-col items-center gap-4 text-center">
        <Spinner size="lg" color="maroon" />
        <span className="text-sm font-serif font-black text-zinc-900 dark:text-zinc-50 tracking-wide animate-pulse">
          {message}
        </span>
      </div>
    </div>
  );
}
