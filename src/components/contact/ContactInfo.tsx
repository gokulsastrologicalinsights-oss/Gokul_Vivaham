'use client';

import { Phone, Mail, MapPin } from 'lucide-react';
import { contactConfig } from '@/config/contact.config';

interface ContactInfoProps {
  className?: string;
  iconClassName?: string;
  textClassName?: string;
}

export function ContactInfo({ className = '', iconClassName = '', textClassName = '' }: ContactInfoProps) {
  return (
    <div className={`space-y-6 ${className}`}>
      <div className="flex items-start gap-4">
        <div className={`p-3 rounded-full bg-sandal-100 dark:bg-zinc-900 border border-sandal-200/50 dark:border-zinc-800 text-maroon-600 dark:text-gold-400 shrink-0 ${iconClassName}`}>
          <MapPin className="h-6 w-6" />
        </div>
        <div className="flex flex-col">
          <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-500 uppercase tracking-wider">Our Address</span>
          <address className="not-italic mt-1 text-zinc-800 dark:text-zinc-300 text-sm sm:text-base leading-relaxed whitespace-pre-line font-medium">
            {contactConfig.address.lines.join('\n')}
          </address>
        </div>
      </div>

      <div className="flex items-start gap-4">
        <div className={`p-3 rounded-full bg-sandal-100 dark:bg-zinc-900 border border-sandal-200/50 dark:border-zinc-800 text-maroon-600 dark:text-gold-400 shrink-0 ${iconClassName}`}>
          <Phone className="h-6 w-6" />
        </div>
        <div className="flex flex-col">
          <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-500 uppercase tracking-wider">Phone / WhatsApp</span>
          <a
            href={contactConfig.phone.link}
            className={`mt-1 text-zinc-800 dark:text-zinc-300 hover:text-maroon-600 dark:hover:text-gold-400 text-base sm:text-lg font-bold transition-colors ${textClassName}`}
            aria-label={`Call us at ${contactConfig.phone.display}`}
          >
            {contactConfig.phone.display}
          </a>
          <a
            href={contactConfig.whatsapp.link}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-emerald-600 dark:text-emerald-400 hover:underline font-semibold mt-0.5 flex items-center gap-1"
          >
            Chat on WhatsApp
          </a>
        </div>
      </div>

      <div className="flex items-start gap-4">
        <div className={`p-3 rounded-full bg-sandal-100 dark:bg-zinc-900 border border-sandal-200/50 dark:border-zinc-800 text-maroon-600 dark:text-gold-400 shrink-0 ${iconClassName}`}>
          <Mail className="h-6 w-6" />
        </div>
        <div className="flex flex-col">
          <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-500 uppercase tracking-wider">Email Address</span>
          <a
            href={contactConfig.email.link}
            className={`mt-1 text-zinc-800 dark:text-zinc-300 hover:text-maroon-600 dark:hover:text-gold-400 text-sm sm:text-base font-bold break-all transition-colors ${textClassName}`}
            aria-label={`Email us at ${contactConfig.email.support}`}
          >
            {contactConfig.email.support}
          </a>
        </div>
      </div>
    </div>
  );
}
