'use client';

import { useState } from 'react';
import { HelpCircle } from 'lucide-react';

export default function FaqSection() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const faqs = [
    {
      q: 'How does Gokul Vivaham verify profiles?',
      a: 'We verify every profile through Aadhaar/Govt ID verification, email verification, and a mandatory phone call confirmation. Checked profiles receive a "Verified Profile" badge.'
    },
    {
      q: 'Can I upload and match horoscopes?',
      a: 'Yes! Step 5 of our registration includes a horoscope PDF/Image upload. In the dashboard, you can view matched horoscopes and use our automated rasi/star match indicators.'
    },
    {
      q: 'Is my data secure?',
      a: 'Absolutely. We utilize state-of-the-art encryption, secure Supabase authentication, and strict Row Level Security (RLS). You can control who views your photos and contact details in your settings.'
    },
    {
      q: 'What is the AI Compatibility Score?',
      a: 'It is a proprietary algorithm that parses Star, Rasi, Gothram, age gap, education compatibility, and personal expectations to generate a compatibility percentage.'
    }
  ];

  return (
    <section className="w-full py-16 bg-white dark:bg-zinc-950 border-t border-sandal-200/40 dark:border-zinc-800/50 transition-colors">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col gap-10">
        
        <div className="text-center flex flex-col items-center gap-3">
          <h2 className="text-3xl font-serif font-bold text-zinc-900 dark:text-zinc-50">
            Frequently Asked Questions
          </h2>
          <div className="w-16 h-1 luxury-gradient rounded-full" />
        </div>

        <div className="flex flex-col gap-4">
          {faqs.map((faq, index) => (
            <div 
              key={index}
              className="rounded-2xl border border-sandal-200 dark:border-zinc-800 bg-sandal-50/20 dark:bg-zinc-900/20 overflow-hidden transition-all"
            >
              <button
                type="button"
                onClick={() => setOpenFaq(openFaq === index ? null : index)}
                className="w-full px-6 py-5 flex justify-between items-center text-left hover:bg-sandal-100/30 dark:hover:bg-zinc-800/30 transition-colors cursor-pointer"
              >
                <span className="font-serif font-bold text-zinc-850 dark:text-zinc-200 flex items-center gap-2">
                  <HelpCircle className="h-4 w-4 text-maroon-550 shrink-0" />
                  {faq.q}
                </span>
                <span className="text-xl text-maroon-500 font-light pl-2">
                  {openFaq === index ? '−' : '+'}
                </span>
              </button>

              {openFaq === index && (
                <div className="px-6 pb-5 text-sm text-zinc-600 dark:text-zinc-400 font-light leading-relaxed animate-in fade-in duration-200 text-left">
                  {faq.a}
                </div>
              )}
            </div>
          ))}
        </div>

      </div>
    </section>
  );
}
