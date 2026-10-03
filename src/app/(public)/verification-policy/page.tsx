'use client';

import { ShieldCheck, UserCheck, AlertTriangle, FileCheck } from 'lucide-react';

export default function VerificationPolicy() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-12 md:py-16 text-left flex flex-col gap-10">
      
      {/* Header */}
      <div className="flex flex-col items-center text-center gap-3">
        <h1 className="text-3xl md:text-4xl font-serif font-bold text-zinc-900 dark:text-zinc-50">
          User Verification Policy
        </h1>
        <span className="text-xs font-semibold text-gold-600 dark:text-gold-400 uppercase tracking-widest leading-none">
          Gokul Vivaham • Integrity &amp; Transparency
        </span>
        <div className="w-16 h-0.5 bg-gold-500 rounded-full mt-2" />
      </div>

      {/* Main Info */}
      <div className="bg-white dark:bg-zinc-900 p-6 md:p-8 rounded-3xl border border-sandal-200 dark:border-zinc-800 shadow-md flex flex-col gap-6 font-light text-sm text-zinc-650 dark:text-zinc-400 leading-relaxed">
        
        <div className="flex items-center gap-2 text-maroon-700 dark:text-gold-400 font-serif font-bold text-lg border-b border-zinc-100 dark:border-zinc-850 pb-2">
          <UserCheck className="h-5 w-5" /> 1. Verification Levels
        </div>
        <p>
          To maintain a safe environment, Gokul Vivaham employs a multi-tiered verification framework:
          * **Phone Verification**: All members must verify their active mobile number via SMS OTP code during registration.
          * **Government ID Verification**: Members can upload a copy of an approved Government ID (Aadhaar Card, Passport, or PAN) to receive a verified profile badge.
        </p>

        <div className="flex items-center gap-2 text-maroon-700 dark:text-gold-400 font-serif font-bold text-lg border-b border-zinc-100 dark:border-zinc-850 pb-2">
          <FileCheck className="h-5 w-5" /> 2. Uploading Verification Documents
        </div>
        <p>
          Verification documents can be uploaded securely under account settings. All uploaded documents are stored in an encrypted private storage bucket, are accessible ONLY by designated security administrators, and are permanently deleted once verification is approved or rejected.
        </p>

        <div className="flex items-center gap-2 text-maroon-700 dark:text-gold-400 font-serif font-bold text-lg border-b border-zinc-100 dark:border-zinc-850 pb-2">
          <ShieldCheck className="h-5 w-5" /> 3. Verification Badge Award
        </div>
        <p>
          Once verified, a **Verified badge (✓)** is displayed on your public profile card, enhancing match trust. Verification does not guarantee compatibility, character authenticity, or background honesty; it simply confirms the owner's legal identity documents match the registered registration name.
        </p>

        <div className="flex items-center gap-2 text-maroon-700 dark:text-gold-400 font-serif font-bold text-lg border-b border-zinc-100 dark:border-zinc-850 pb-2">
          <AlertTriangle className="h-5 w-5" /> 4. Disclaimer on Identity checks
        </div>
        <p>
          Gokul Vivaham does not conduct physical home visits or full criminological background checks. Verification status is an online check. We strongly urge members to perform independent background checks prior to finalized matches.
        </p>
      </div>

    </div>
  );
}
