'use client';

import React from 'react';
import { ContactInfo } from './ContactInfo';
import { Heart } from 'lucide-react';

interface ContactCardProps {
  title?: string;
  subtitle?: string;
  showIcon?: boolean;
}

export function ContactCard({
  title = 'Gokul Support Desk',
  subtitle = 'Get in touch for matchmaking queries and support',
  showIcon = true
}: ContactCardProps) {
  return (
    <div className="relative overflow-hidden rounded-2xl bg-white dark:bg-zinc-950 border border-sandal-300/40 dark:border-zinc-800/80 shadow-xl dark:shadow-black/55 p-6 sm:p-8 transition-all hover:border-gold-400/60 dark:hover:border-gold-500/40">
      {/* Premium decorative gold gradients */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-gold-250/10 dark:bg-gold-500/5 rounded-full blur-2xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-24 h-24 bg-maroon-500/5 rounded-full blur-xl pointer-events-none" />

      <div className="relative">
        <div className="flex items-center gap-3.5 mb-4">
          {showIcon && (
            <div className="p-2.5 rounded-xl bg-sandal-100 dark:bg-zinc-900 border border-sandal-200/50 dark:border-zinc-800 text-maroon-600 dark:text-gold-400">
              <Heart className="h-5 w-5 fill-current" />
            </div>
          )}
          <div>
            <h3 className="text-lg font-serif font-bold text-maroon-700 dark:text-gold-400">
              {title}
            </h3>
            {subtitle && (
              <p className="text-xs text-zinc-550 dark:text-zinc-400">
                {subtitle}
              </p>
            )}
          </div>
        </div>

        <div className="h-px bg-sandal-200/50 dark:bg-zinc-800/80 my-5" />

        <ContactInfo />
      </div>
    </div>
  );
}
