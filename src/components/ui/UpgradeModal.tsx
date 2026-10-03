'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { X, Zap, Phone, FileText, Star } from 'lucide-react';

interface UpgradeModalProps {
  /** What triggered the modal: 'contact' | 'horoscope' | 'consultation' */
  feature?: 'contact' | 'horoscope' | 'consultation';
  /** Optional message from the API error */
  message?: string;
  onClose: () => void;
}

const FEATURE_COPY = {
  contact: {
    icon: <Phone className="h-7 w-7 text-maroon-600 dark:text-gold-400" />,
    title: 'Contact Credits Exhausted',
    desc: "You've used all your contact views for this subscription period. Upgrade to unlock more.",
    plans: [
      { key: 'Silver', contacts: 15, price: '₹1,499', basePrice: '₹1,270', gst: '₹229' },
      { key: 'Gold', contacts: 30, price: '₹2,999', basePrice: '₹2,542', gst: '₹457' },
      { key: 'Diamond', contacts: 60, price: '₹5,999', basePrice: '₹5,084', gst: '₹915' },
    ],
    stat_label: 'Contact Views',
  },
  horoscope: {
    icon: <Star className="h-7 w-7 text-maroon-600 dark:text-gold-400" />,
    title: 'Horoscope Report Credits Exhausted',
    desc: "You've used all your detailed horoscope match report credits. Upgrade for more reports.",
    plans: [
      { key: 'Silver', contacts: 1, price: '₹1,499', basePrice: '₹1,270', gst: '₹229' },
      { key: 'Gold', contacts: 5, price: '₹2,999', basePrice: '₹2,542', gst: '₹457' },
      { key: 'Diamond', contacts: 10, price: '₹5,999', basePrice: '₹5,084', gst: '₹915' },
    ],
    stat_label: 'Reports',
  },
  consultation: {
    icon: <FileText className="h-7 w-7 text-maroon-600 dark:text-gold-400" />,
    title: 'Consultation Credits Exhausted',
    desc: 'Your free consultation credits have been used. Upgrade to a higher plan for more consultations.',
    plans: [
      { key: 'Gold', contacts: 1, price: '₹2,999', basePrice: '₹2,542', gst: '₹457' },
      { key: 'Diamond', contacts: 5, price: '₹5,999', basePrice: '₹5,084', gst: '₹915' },
    ],
    stat_label: 'Consultations',
  },
};

export default function UpgradeModal({ feature = 'contact', message, onClose }: UpgradeModalProps) {
  const copy = FEATURE_COPY[feature];

  // Close on Escape key
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  // Prevent body scroll while modal open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="upgrade-modal-title"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal Panel */}
      <div className="relative z-10 w-full max-w-md bg-white dark:bg-zinc-900 rounded-3xl shadow-2xl border border-sandal-200 dark:border-zinc-800 overflow-hidden animate-in fade-in zoom-in-95 duration-200">

        {/* Decorative gradient top bar */}
        <div className="h-1.5 w-full luxury-gradient" />

        {/* Close button */}
        <button
          onClick={onClose}
          id="upgrade-modal-close"
          className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
          aria-label="Close"
        >
          <X className="h-4 w-4 text-zinc-500" />
        </button>

        <div className="p-7 flex flex-col gap-5">
          {/* Header */}
          <div className="flex flex-col items-center text-center gap-3">
            <div className="w-14 h-14 rounded-2xl bg-sandal-100/60 dark:bg-zinc-800 flex items-center justify-center">
              {copy.icon}
            </div>
            <div>
              <h2
                id="upgrade-modal-title"
                className="text-lg font-serif font-bold text-zinc-900 dark:text-zinc-55"
              >
                {copy.title}
              </h2>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1 font-light leading-relaxed">
                {message || copy.desc}
              </p>
            </div>
          </div>

          {/* Plan comparison mini table */}
          <div className="flex flex-col gap-2">
            {copy.plans.map((plan) => (
              <div
                key={plan.key}
                className="flex items-center justify-between px-4 py-3 rounded-xl bg-sandal-50/50 dark:bg-zinc-800/60 border border-sandal-200 dark:border-zinc-800"
              >
                <div className="flex flex-col gap-0.5">
                  <div className="flex items-center gap-2">
                    <Zap className="h-3.5 w-3.5 text-gold-500" />
                    <span className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
                      {plan.key} Plan
                    </span>
                  </div>
                  <span className="text-[10px] text-zinc-500 dark:text-zinc-450 pl-5 leading-none">
                    Base: {plan.basePrice} + GST: {plan.gst}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-xs">
                  <span className="text-zinc-500 dark:text-zinc-400">
                    {plan.contacts} {copy.stat_label}
                  </span>
                  <div className="flex flex-col items-end">
                    <span className="font-bold text-maroon-600 dark:text-gold-400 leading-none">
                      {plan.price}
                    </span>
                    <span className="text-[8px] text-zinc-400 dark:text-zinc-500 font-light mt-0.5 leading-none">
                      (incl. GST)
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* CTA */}
          <Link
            href="/pricing"
            onClick={onClose}
            id="upgrade-modal-cta"
            className="w-full py-3 rounded-2xl luxury-gradient text-white text-sm font-bold text-center uppercase tracking-wider hover:opacity-90 shadow-md transition-all cursor-pointer"
          >
            View Pricing & Upgrade
          </Link>

          <button
            onClick={onClose}
            className="text-xs text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 text-center cursor-pointer transition-colors"
          >
            Continue browsing
          </button>
        </div>
      </div>
    </div>
  );
}
