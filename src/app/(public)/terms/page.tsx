'use client';

import { BookOpen, ShieldAlert, Scale, HelpCircle } from 'lucide-react';

export default function TermsPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-12 md:py-16 text-left flex flex-col gap-10">
      
      {/* Header */}
      <div className="flex flex-col items-center text-center gap-3">
        <h1 className="text-3xl md:text-4xl font-serif font-bold text-zinc-900 dark:text-zinc-50">
          Terms &amp; Conditions
        </h1>
        <span className="text-xs font-semibold text-gold-600 dark:text-gold-400 uppercase tracking-widest leading-none">
          Gokul Vivaham • Service Agreement
        </span>
        <div className="w-16 h-0.5 bg-gold-500 rounded-full mt-2" />
      </div>

      {/* Main Content */}
      <div className="bg-white dark:bg-zinc-900 p-6 md:p-8 rounded-3xl border border-sandal-200 dark:border-zinc-800 shadow-md flex flex-col gap-6 font-light text-sm text-zinc-650 dark:text-zinc-400 leading-relaxed">
        
        <div className="flex items-center gap-2 text-maroon-700 dark:text-gold-400 font-serif font-bold text-lg border-b border-zinc-100 dark:border-zinc-850 pb-2">
          <Scale className="h-5 w-5" /> 1. Marriage Eligibility (Indian Law)
        </div>
        <p>
          By creating an account on Gokul Vivaham, you confirm that you are legally eligible for marriage under the laws of India. Specifically, you certify that you are at least **18 years of age** (for female registrants) or **21 years of age** (for male registrants), and that you are either single, legally divorced, or widowed.
        </p>

        <div className="flex items-center gap-2 text-maroon-700 dark:text-gold-400 font-serif font-bold text-lg border-b border-zinc-100 dark:border-zinc-850 pb-2">
          <ShieldAlert className="h-5 w-5" /> 2. Matchmaking Disclaimer
        </div>
        <p className="bg-amber-50/50 dark:bg-amber-950/10 border border-amber-250/20 p-4 rounded-xl text-zinc-700 dark:text-zinc-350 italic">
          “Gokul Vivaham acts only as a matchmaking platform and does not guarantee marriage, compatibility, profile authenticity, or relationship outcomes. Astrology and horoscope matching are provided only as traditional guidance.”
        </p>

        <div className="flex items-center gap-2 text-maroon-700 dark:text-gold-400 font-serif font-bold text-lg border-b border-zinc-100 dark:border-zinc-850 pb-2">
          <BookOpen className="h-5 w-5" /> 3. Account Safety &amp; Moderation
        </div>
        <p>
          We reserve the right to review, moderate, watermark, or delete profile photos and information. Accounts containing vulgar, offensive, or false information will be suspended without refund. You are solely responsible for verifying the character and background of profiles you connect with.
        </p>

        <div className="flex items-center gap-2 text-maroon-700 dark:text-gold-400 font-serif font-bold text-lg border-b border-zinc-100 dark:border-zinc-850 pb-2">
          <HelpCircle className="h-5 w-5" /> 4. Jurisdiction &amp; Dispute Resolution
        </div>
        <p>
          This service agreement is governed in accordance with the laws of India, including the Information Technology Act, 2000. Any dispute, claim, or controversy arising out of this agreement will be subject to the exclusive jurisdiction of the courts located in **Chennai, Tamil Nadu**.
        </p>
      </div>

    </div>
  );
}
