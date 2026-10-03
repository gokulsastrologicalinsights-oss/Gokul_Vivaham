'use client';

import { Heart, Phone, Mail } from 'lucide-react';
import { contactConfig } from '@/config/contact.config';

interface SupportSectionProps {
  compact?: boolean;
}

export function SupportSection({ compact = false }: SupportSectionProps) {
  if (compact) {
    return (
      <div className="p-4 rounded-xl bg-sandal-50/50 dark:bg-zinc-900/40 border border-sandal-200/50 dark:border-zinc-800 text-left">
        <div className="flex items-center gap-1.5 text-xs font-serif font-bold text-maroon-700 dark:text-gold-400 mb-2">
          <Heart className="h-3.5 w-3.5 fill-current text-maroon-500" />
          <span>Gokul Support Desk</span>
        </div>
        <div className="space-y-1.5 text-xs text-zinc-650 dark:text-zinc-400">
          <p className="flex items-center gap-2">
            <Phone className="h-3 w-3 text-maroon-500" />
            <a href={contactConfig.phone.link} className="hover:underline hover:text-maroon-600 dark:hover:text-gold-400 font-semibold">
              {contactConfig.phone.display}
            </a>
          </p>
          <p className="flex items-center gap-2">
            <Mail className="h-3 w-3 text-maroon-500" />
            <a href={contactConfig.email.link} className="hover:underline hover:text-maroon-600 dark:hover:text-gold-400 font-medium break-all">
              {contactConfig.email.support}
            </a>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-sandal-50 to-sandal-100/50 dark:from-zinc-950 dark:to-zinc-900 border border-sandal-200/80 dark:border-zinc-800/80 p-5 shadow-sm text-left">
      <div className="absolute top-0 right-0 w-20 h-20 bg-gold-250/10 dark:bg-gold-500/5 rounded-full blur-xl pointer-events-none" />
      
      <div className="flex items-center gap-2.5 mb-3">
        <div className="p-2 rounded-lg bg-white dark:bg-zinc-850 border border-sandal-200 dark:border-zinc-800 text-maroon-600 dark:text-gold-400 shadow-sm">
          <Heart className="h-4.5 w-4.5 fill-current" />
        </div>
        <div>
          <h4 className="text-sm font-serif font-bold text-maroon-700 dark:text-gold-400">
            Need Matrimony Help?
          </h4>
          <p className="text-[10px] text-zinc-550 dark:text-zinc-450 mt-0.5">
            Our relationship experts are here to assist you
          </p>
        </div>
      </div>

      <div className="space-y-2.5 text-xs mt-4">
        <a
          href={contactConfig.phone.link}
          className="flex items-center gap-3 p-2.5 rounded-xl bg-white dark:bg-zinc-950 border border-sandal-150/40 dark:border-zinc-850 text-zinc-800 dark:text-zinc-300 hover:border-gold-300 dark:hover:border-gold-500/30 transition-all font-semibold"
          aria-label={`Call Support at ${contactConfig.phone.display}`}
        >
          <Phone className="h-3.5 w-3.5 text-maroon-500 shrink-0" />
          <span>{contactConfig.phone.display}</span>
        </a>

        <a
          href={contactConfig.email.link}
          className="flex items-center gap-3 p-2.5 rounded-xl bg-white dark:bg-zinc-950 border border-sandal-150/40 dark:border-zinc-850 text-zinc-800 dark:text-zinc-300 hover:border-gold-300 dark:hover:border-gold-500/30 transition-all font-medium break-all"
          aria-label={`Email Support at ${contactConfig.email.support}`}
        >
          <Mail className="h-3.5 w-3.5 text-maroon-500 shrink-0" />
          <span>{contactConfig.email.support}</span>
        </a>

        <a
          href={contactConfig.whatsapp.link}
          target="_blank"
          rel="noopener noreferrer"
          className="w-full mt-1.5 flex items-center justify-center gap-1.5 py-2 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm hover:scale-[1.02] cursor-pointer"
        >
          WhatsApp Quick Support
        </a>
      </div>
    </div>
  );
}
