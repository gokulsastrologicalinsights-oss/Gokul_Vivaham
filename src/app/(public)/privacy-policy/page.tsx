'use client';

import { ShieldCheck, Database, Key, HelpCircle } from 'lucide-react';
import { contactConfig } from '@/config/contact.config';

export default function PrivacyPolicyPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-12 md:py-16 text-left flex flex-col gap-10">
      
      {/* Header */}
      <div className="flex flex-col items-center text-center gap-3">
        <h1 className="text-3xl md:text-4xl font-serif font-bold text-zinc-900 dark:text-zinc-50">
          Privacy Policy
        </h1>
        <span className="text-xs font-semibold text-gold-600 dark:text-gold-400 uppercase tracking-widest leading-none">
          Gokul Vivaham • DPDP Act Compliance
        </span>
        <div className="w-16 h-0.5 bg-gold-500 rounded-full mt-2" />
      </div>

      {/* Main Content */}
      <div className="bg-white dark:bg-zinc-900 p-6 md:p-8 rounded-3xl border border-sandal-200 dark:border-zinc-800 shadow-md flex flex-col gap-6 font-light text-sm text-zinc-650 dark:text-zinc-400 leading-relaxed">
        
        <div className="flex items-center gap-2 text-maroon-700 dark:text-gold-400 font-serif font-bold text-lg border-b border-zinc-100 dark:border-zinc-850 pb-2">
          <Database className="h-5 w-5" /> 1. Data Collection &amp; Minimization
        </div>
        <p>
          We collect personal data required for matchmaking, including your name, contact information, photos, birth details, education, and astrological parameters (Rasi/Star/Gothram). Identity document uploads are processed securely and deleted immediately following verification checks.
        </p>
 
        <div className="flex items-center gap-2 text-maroon-700 dark:text-gold-400 font-serif font-bold text-lg border-b border-zinc-100 dark:border-zinc-850 pb-2">
          <Key className="h-5 w-5" /> 2. Consent-Based Processing (DPDP Act)
        </div>
        <p>
          Your data is processed only with your explicit, revocable consent. We maintain digital logs recording your consent timestamps, IP addresses, and accepted policies. You have the right to withdraw your consent at any time, which will result in account suspension and deletion.
        </p>
 
        <div className="flex items-center gap-2 text-maroon-700 dark:text-gold-400 font-serif font-bold text-lg border-b border-zinc-100 dark:border-zinc-850 pb-2">
          <ShieldCheck className="h-5 w-5" /> 3. Data Protection &amp; Security Controls
        </div>
        <p>
          All profile details, photos, and horoscope files are protected by PostgreSQL Row Level Security (RLS) policies. Photos are watermarked to prevent screenshot extraction, and your contact phone/email remains hidden from public views until you give explicit consent or accept a connection request.
        </p>
 
        <div className="flex items-center gap-2 text-maroon-700 dark:text-gold-400 font-serif font-bold text-lg border-b border-zinc-100 dark:border-zinc-850 pb-2">
          <HelpCircle className="h-5 w-5" /> 4. User Rights &amp; Grievance Officer
        </div>
        <p>
          You have the right to access, export, correct, or erase your data. For inquiries, data deletion requests, or complaints, please reach out to our designated Grievance Officer:
          <br />
          <strong>Grievance Redressal Officer:</strong> Relationship Manager
          <br />
          <strong>Email:</strong> <a href={contactConfig.email.link} className="underline font-semibold hover:text-maroon-700 dark:hover:text-gold-400">{contactConfig.email.support}</a>
          <br />
          <strong>Office Address:</strong> {contactConfig.address.display}
        </p>
      </div>

    </div>
  );
}
