'use client';

import { ReactNode } from 'react';
import { motion } from 'framer-motion';

interface StatCardProps {
  title: string;
  value: string | number;
  icon?: ReactNode;
  description?: string;
  change?: {
    value: string | number;
    type: 'increase' | 'decrease';
  };
}

export default function StatCard({
  title,
  value,
  icon,
  description,
  change,
}: StatCardProps) {
  return (
    <motion.div
      whileHover={{ y: -3 }}
      transition={{ duration: 0.2 }}
      className="bg-white dark:bg-zinc-900 border border-sandal-200 dark:border-zinc-800/80 rounded-2xl p-5 shadow-sm flex flex-col text-left transition-all duration-300"
    >
      <div className="flex justify-between items-center mb-3">
        <span className="text-xs font-bold text-zinc-500 uppercase tracking-widest leading-none">
          {title}
        </span>
        {icon && (
          <div className="w-9 h-9 rounded-lg bg-maroon-500/10 flex items-center justify-center text-maroon-600 dark:text-gold-450 shrink-0">
            {icon}
          </div>
        )}
      </div>

      <div className="flex items-baseline gap-2">
        <span className="text-2xl md:text-3xl font-serif font-black text-zinc-900 dark:text-zinc-50 tracking-tight leading-none">
          {value}
        </span>
        
        {change && (
          <span
            className={`text-xs font-bold ${
              change.type === 'increase' ? 'text-emerald-600' : 'text-red-500'
            }`}
          >
            {change.type === 'increase' ? '↑' : '↓'} {change.value}
          </span>
        )}
      </div>

      {(description || change) && (
        <span className="text-[11px] text-zinc-400 dark:text-zinc-500 mt-2 font-light">
          {description || 'Compared to last month'}
        </span>
      )}
    </motion.div>
  );
}
