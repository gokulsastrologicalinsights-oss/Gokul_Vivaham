'use client';
import { ReactNode } from 'react';

export default function ChatLayout({ children }: { children: ReactNode }) {
  return (
    <div className="chat-layout flex w-full min-w-0 min-h-[24rem] bg-white dark:bg-zinc-900 border border-sandal-200 dark:border-zinc-800/80 rounded-3xl shadow-xl overflow-hidden">
      {children}
    </div>
  );
}
