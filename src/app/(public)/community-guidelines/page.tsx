'use client';

import { Users, AlertCircle, HeartHandshake, CheckCircle } from 'lucide-react';
import { contactConfig } from '@/config/contact.config';

export default function CommunityGuidelines() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-12 md:py-16 text-left flex flex-col gap-10">
      
      {/* Header */}
      <div className="flex flex-col items-center text-center gap-3">
        <h1 className="text-3xl md:text-4xl font-serif font-bold text-zinc-900 dark:text-zinc-50">
          Community Guidelines
        </h1>
        <span className="text-xs font-semibold text-gold-600 dark:text-gold-400 uppercase tracking-widest leading-none">
          Gokul Vivaham • Integrity &amp; Respect
        </span>
        <div className="w-16 h-0.5 bg-gold-500 rounded-full mt-2" />
      </div>

      {/* Main Info */}
      <div className="bg-white dark:bg-zinc-900 p-6 md:p-8 rounded-3xl border border-sandal-200 dark:border-zinc-800 shadow-md flex flex-col gap-6 font-light text-sm text-zinc-650 dark:text-zinc-400 leading-relaxed">
        
        <div className="flex items-center gap-2 text-maroon-700 dark:text-gold-400 font-serif font-bold text-lg border-b border-zinc-100 dark:border-zinc-850 pb-2">
          <HeartHandshake className="h-5 w-5" /> 1. Mutual Respect &amp; Dignity
        </div>
        <p>
          Gokul Vivaham is a family-oriented matchmaking platform. All communications, whether via chat, call, or meetings, must be conducted with dignity, respect, and courtesy. Abusive language, harassment, discrimination, or threats will result in immediate profile suspension and potential legal referral under applicable Indian penal codes.
        </p>

        <div className="flex items-center gap-2 text-maroon-700 dark:text-gold-400 font-serif font-bold text-lg border-b border-zinc-100 dark:border-zinc-850 pb-2">
          <CheckCircle className="h-5 w-5" /> 2. Accuracy of Profile Information
        </div>
        <p>
          Members must submit only true, accurate, and current information regarding their age, marital status, education, occupation, and family background. Intentionally falsifying profiles, hosting fake photos, or uploading wrong birth details is strictly prohibited.
        </p>

        <div className="flex items-center gap-2 text-maroon-700 dark:text-gold-400 font-serif font-bold text-lg border-b border-zinc-100 dark:border-zinc-850 pb-2">
          <AlertCircle className="h-5 w-5" /> 3. No Commercial Activities
        </div>
        <p>
          This website is exclusively for individual personal matchmaking. You may not use the portal for commercial advertisements, soliciting money, promoting other services, or scraping database records. Doing so violates data privacy rights and our service agreement.
        </p>

        <div className="flex items-center gap-2 text-maroon-700 dark:text-gold-400 font-serif font-bold text-lg border-b border-zinc-100 dark:border-zinc-850 pb-2">
          <Users className="h-5 w-5" /> 4. Reporting Misbehavior
        </div>
        <p>
          If you encounter any profile violating these guidelines, please click the **Report Profile** button or email <a href={contactConfig.email.link} className="font-semibold text-maroon-600 dark:text-gold-450 hover:underline">{contactConfig.email.support}</a> immediately. All reports are investigated within 24 hours.
        </p>
      </div>

    </div>
  );
}
