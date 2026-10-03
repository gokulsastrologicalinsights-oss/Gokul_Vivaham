'use client';

import { Clock } from 'lucide-react';
import { contactConfig } from '@/config/contact.config';

export function BusinessHours() {
  return (
    <div className="bg-white dark:bg-zinc-950 p-6 rounded-2xl shadow-xl border border-sandal-300/40 dark:border-zinc-800/80 text-left">
      <div className="flex items-center gap-2.5 mb-4">
        <div className="p-2 rounded-lg bg-sandal-100 dark:bg-zinc-900 border border-sandal-200/50 dark:border-zinc-800 text-maroon-600 dark:text-gold-400">
          <Clock className="h-5 w-5" />
        </div>
        <div>
          <h3 className="text-base font-serif font-bold text-maroon-700 dark:text-gold-400">
            Business Hours
          </h3>
          <p className="text-[10px] text-zinc-500 dark:text-zinc-400">
            Our operational office timings
          </p>
        </div>
      </div>

      <div className="h-px bg-sandal-200/50 dark:bg-zinc-800/80 my-3.5" />

      <div className="space-y-3">
        {contactConfig.businessHours.map((item, index) => (
          <div key={index} className="flex justify-between items-center text-sm py-1">
            <span className="text-zinc-500 dark:text-zinc-400 font-medium">{item.day}</span>
            <span className="text-zinc-850 dark:text-zinc-200 font-bold bg-sandal-50 dark:bg-zinc-900/60 border border-sandal-150/40 dark:border-zinc-850 px-3 py-1 rounded-lg text-xs">
              {item.hours}
            </span>
          </div>
        ))}
      </div>
      
      <p className="text-[10.5px] leading-relaxed text-zinc-500 dark:text-zinc-500 mt-4 border-t border-sandal-100/50 dark:border-zinc-800/50 pt-3">
        * Online match support and automatic matching profiles are active 24/7. Physical office visits are welcome during the timings listed above.
      </p>
    </div>
  );
}
