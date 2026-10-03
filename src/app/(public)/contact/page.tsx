'use client';

import { ContactCard } from '@/components/contact/ContactCard';
import {SupportRequests} from '@/components/contact/SupportRequests';
import { ContactForm } from '@/components/contact/ContactForm';
import { BusinessHours } from '@/components/contact/BusinessHours';

export default function Contact() {
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
          <SupportRequests />
          
          {/* Embedded Google Maps Placement */}
          <div className="overflow-hidden rounded-2xl bg-white dark:bg-zinc-950 border border-sandal-300/40 dark:border-zinc-800/80 shadow-xl p-4">
            <h3 className="text-sm font-serif font-bold text-maroon-700 dark:text-gold-400 mb-3 pl-1">
              Find Us on Google Maps
            </h3>
            <div className="relative w-full h-64 sm:h-80 rounded-xl overflow-hidden border border-sandal-100 dark:border-zinc-800">
              <iframe
                title="Gokul Vivaham Office Location"
                src="https://maps.google.com/maps?q=165,%20Sakreeshwari%20Nagar,%202nd%20Street,%20Thiruverkadu,%20Chennai,%20Tamil%20Nadu%20600077&t=&z=14&ie=UTF8&iwloc=&output=embed"
                width="100%"
                height="100%"
                style={{ border: 0 }}
                allowFullScreen
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                className="absolute inset-0"
              />
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}

