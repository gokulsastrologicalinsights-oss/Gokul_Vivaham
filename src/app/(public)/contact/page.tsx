'use client';

import { ContactCard } from '@/components/contact/ContactCard';
import {SupportRequests} from '@/components/contact/SupportRequests';
import { ContactForm } from '@/components/contact/ContactForm';
import { BusinessHours } from '@/components/contact/BusinessHours';
import { contactConfig } from '@/config/contact.config';
import { useAuth } from '@/hooks/useAuth';

export default function Contact() {
  const { isAuthenticated } = useAuth();
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16 text-left flex flex-col gap-12 flex-grow">
      
      {/* Header Info */}
      <div className="flex flex-col gap-3 text-center items-center">
        <h1 className="text-3xl md:text-4xl font-serif font-bold text-zinc-900 dark:text-zinc-50">
          Support &amp; Contact Desk
        </h1>
        <div className="w-16 h-1 bg-gradient-to-r from-maroon-700 to-gold-500 rounded-full" />
        <p className="text-sm text-zinc-600 dark:text-zinc-400 font-light max-w-lg mt-1">
          Have questions about verification badges, membership packages, or horoscope calculations? Contact our support staff.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* LEFT COLUMN: OFFICE CONTACT DETAILS & BUSINESS HOURS */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          <ContactCard />
          <BusinessHours />
        </div>

        {/* RIGHT COLUMN: CONTACT FORM & MAP */}
        <div className="lg:col-span-7 flex flex-col gap-6">
          <ContactForm />
          {isAuthenticated && <SupportRequests />}
          
          {/* Open the external map only when requested. */}
          <div className="overflow-hidden rounded-2xl bg-white dark:bg-zinc-950 border border-sandal-300/40 dark:border-zinc-800/80 shadow-xl p-4">
            <h3 className="text-sm font-serif font-bold text-maroon-700 dark:text-gold-400 mb-3 pl-1">
              Find Us on Google Maps
            </h3>
            <p className="text-sm text-muted mb-3">{contactConfig.address.display}</p>
            <a className="inline-block underline py-2" href={'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(contactConfig.address.display)} target="_blank" rel="noopener noreferrer">Open office location in Google Maps (new tab)</a>
            <p className="text-xs text-muted mt-2">Opening the map connects to Google under its privacy practices.</p>
          </div>
        </div>

      </div>

    </div>
  );
}
