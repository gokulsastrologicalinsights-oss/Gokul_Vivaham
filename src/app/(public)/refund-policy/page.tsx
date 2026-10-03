'use client';

import { ShieldCheck, Receipt, RotateCcw, AlertTriangle } from 'lucide-react';
import { contactConfig } from '@/config/contact.config';

export default function RefundPolicy() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-12 md:py-16 text-left flex flex-col gap-10">
      
      {/* Header */}
      <div className="flex flex-col items-center text-center gap-3">
        <h1 className="text-3xl md:text-4xl font-serif font-bold text-zinc-900 dark:text-zinc-50">
          Refund &amp; Cancellation Policy
        </h1>
        <span className="text-xs font-semibold text-gold-600 dark:text-gold-400 uppercase tracking-widest leading-none">
          Gokul Vivaham • Transparency &amp; Trust
        </span>
        <div className="w-16 h-0.5 bg-gold-500 rounded-full mt-2" />
      </div>

      {/* Main Info */}
      <div className="bg-white dark:bg-zinc-900 p-6 md:p-8 rounded-3xl border border-sandal-200 dark:border-zinc-800 shadow-md flex flex-col gap-6 font-light text-sm text-zinc-650 dark:text-zinc-400 leading-relaxed">
        
        <div className="flex items-center gap-2 text-maroon-700 dark:text-gold-400 font-serif font-bold text-lg border-b border-zinc-100 dark:border-zinc-850 pb-2">
          <RotateCcw className="h-5 w-5" /> 1. No Refund Policy
        </div>
        <p>
          Gokul Vivaham (கோகுல் விவாஹம்) provides online matchmaking services, including profile database access, automated matchmaking recommendations, and contact unlocking features. Once a premium package is purchased, the service is deemed rendered instantly. Therefore, **all payments made to Gokul Vivaham are non-refundable and non-transferable**.
        </p>

        <div className="flex items-center gap-2 text-maroon-700 dark:text-gold-400 font-serif font-bold text-lg border-b border-zinc-100 dark:border-zinc-850 pb-2">
          <Receipt className="h-5 w-5" /> 2. Cancellation of Subscriptions
        </div>
        <p>
          You may choose to delete or deactivate your profile at any time. However, cancelling your subscription or deleting your account does not entitle you to a refund for the unused duration of your current billing period. All active premium privileges will immediately cease upon account deletion.
        </p>

        <div className="flex items-center gap-2 text-maroon-700 dark:text-gold-400 font-serif font-bold text-lg border-b border-zinc-100 dark:border-zinc-850 pb-2">
          <AlertTriangle className="h-5 w-5" /> 3. Duplicate Payments
        </div>
        <p>
          In the event of double billing or duplicate transactions caused by payment gateway failures, users must report the issue to our support team at <a href={contactConfig.email.link} className="font-semibold text-maroon-600 dark:text-gold-450 hover:underline">{contactConfig.email.support}</a> within **7 days** of transaction completion. After verifying the transaction log, any duplicate payment will be refunded to the original payment source within 5–7 working days.
        </p>

        <div className="flex items-center gap-2 text-maroon-700 dark:text-gold-400 font-serif font-bold text-lg border-b border-zinc-100 dark:border-zinc-850 pb-2">
          <ShieldCheck className="h-5 w-5" /> 4. Service Failures
        </div>
        <p>
          Refunds will not be issued for matching outcomes, lack of responses from other members, profile deactivations by admins due to terms violations, or natural compatibility variations. We act solely as a matchmaking directory.
        </p>
      </div>

    </div>
  );
}
