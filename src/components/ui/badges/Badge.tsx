'use client';

import { ReactNode } from 'react';

interface BadgeProps {
  children: ReactNode;
  variant?: 'gold' | 'maroon' | 'sandal' | 'emerald' | 'zinc';
  className?: string;
}

export default function Badge({ children, variant = 'zinc', className = '' }: BadgeProps) {
  const styles = {
    gold: 'bg-gold-500/10 text-gold-700 dark:text-gold-400 border-gold-300/30',
    maroon: 'bg-maroon-500/10 text-maroon-700 dark:text-maroon-400 border-maroon-300/20',
    sandal: 'bg-sandal-100/50 text-maroon-800 dark:bg-zinc-800 dark:text-gold-450 border-sandal-300/40',
    emerald: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-900/10',
    zinc: 'bg-zinc-100 dark:bg-zinc-850 text-zinc-500 dark:text-zinc-400 border-zinc-200 dark:border-zinc-800'
  };

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${styles[variant]} ${className}`}>
      {children}
    </span>
  );
}
