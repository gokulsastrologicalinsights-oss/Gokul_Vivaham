'use client';

import { Trash2, Shield, Calendar, RefreshCw } from 'lucide-react';

export default function DataDeletionPolicy() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-12 md:py-16 text-left flex flex-col gap-10">
      
      {/* Header */}
      <div className="flex flex-col items-center text-center gap-3">
        <h1 className="text-3xl md:text-4xl font-serif font-bold text-zinc-900 dark:text-zinc-50">
          Data Deletion Policy
        </h1>
        <span className="text-xs font-semibold text-gold-600 dark:text-gold-400 uppercase tracking-widest leading-none">
          Gokul Vivaham • Your Privacy Rights
        </span>
        <div className="w-16 h-0.5 bg-gold-500 rounded-full mt-2" />
      </div>

      {/* Main Info */}
      <div className="bg-white dark:bg-zinc-900 p-6 md:p-8 rounded-3xl border border-sandal-200 dark:border-zinc-800 shadow-md flex flex-col gap-6 font-light text-sm text-zinc-650 dark:text-zinc-400 leading-relaxed">
        
        <div className="flex items-center gap-2 text-maroon-700 dark:text-gold-400 font-serif font-bold text-lg border-b border-zinc-100 dark:border-zinc-850 pb-2">
          <Trash2 className="h-5 w-5" /> 1. Right to be Forgotten (DPDP Act)
        </div>
        <p>
          In accordance with the India Digital Personal Data Protection (DPDP) Act, members have the right to request complete erasure of their personal database records. You can withdraw consent and initiate profile deletion directly from your account settings page.
        </p>

        <div className="flex items-center gap-2 text-maroon-700 dark:text-gold-400 font-serif font-bold text-lg border-b border-zinc-100 dark:border-zinc-850 pb-2">
          <Calendar className="h-5 w-5" /> 2. Soft-Delete and Grace Period
        </div>
        <p>
          To prevent accidental deletions or fraudulent activity, Gokul Vivaham implements a **30-day grace period** upon receiving a deletion request:
          * Your profile is immediately hidden and deactivated from all search indices and matching systems.
          * If you log back into the account within the 30-day grace period, the deletion request is cancelled, and your profile is restored.
        </p>

        <div className="flex items-center gap-2 text-maroon-700 dark:text-gold-400 font-serif font-bold text-lg border-b border-zinc-100 dark:border-zinc-850 pb-2">
          <Shield className="h-5 w-5" /> 3. Permanent Deletion &amp; Data Erasure
        </div>
        <p>
          After the 30-day grace period expires:
          * Your user login records, profile fields, partner preferences, uploaded photos, and horoscope files are **permanently and irreversibly deleted** from our primary databases.
          * Backup files are overwritten within standard cycle times (up to 90 days).
        </p>

        <div className="flex items-center gap-2 text-maroon-700 dark:text-gold-400 font-serif font-bold text-lg border-b border-zinc-100 dark:border-zinc-850 pb-2">
          <RefreshCw className="h-5 w-5" /> 4. Exceptions
        </div>
        <p>
          Gokul Vivaham will retain transaction logs, invoice data, and billing records as required by Indian taxation authorities and regulatory mandates. Additionally, if an account was suspended or banned for severe safety breaches or harassment, a cryptographic hash of the phone number and email will be retained to prevent re-registration.
        </p>
      </div>

    </div>
  );
}
