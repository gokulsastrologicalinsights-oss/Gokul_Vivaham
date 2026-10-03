'use client';
import { ReactNode } from 'react';

export default function ChatLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex w-full min-w-0 h-[calc(100dvh-240px)] min-h-[320px] md:h-[calc(100dvh-140px)] md:min-h-[500px] max-h-[750px] bg-white dark:bg-zinc-900 border border-sandal-200 dark:border-zinc-800/80 rounded-3xl shadow-xl overflow-hidden">
      {children}
    </div>
  );
}
