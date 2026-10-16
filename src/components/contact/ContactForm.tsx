'use client';

import { useState } from 'react';
import {supabase} from '@/lib/supabase';
import {syncServerSession} from '@/lib/auth/session-client';
import { CheckCircle2 } from 'lucide-react';
import Link from 'next/link';
import { supportSchema } from '@/validations/support.schema';

export function ContactForm() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [mobile, setMobile] = useState('');
  const [subject, setSubject] = useState('General Inquiry');
  const [message, setMessage] = useState('');
  const [website, setWebsite] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setSubmitting(true); setSuccess(''); setError('');
    try {
      const payload = supportSchema.safeParse({ name, email, mobile, subject, message, website });
      if (!payload.success) throw new Error('Enter a valid name (2–100 characters), email, optional phone and message (10–5000 characters).');
      const {data:{session}} = await supabase.auth.getSession();
      if(session) await syncServerSession(session.access_token);
      const response=await fetch('/api/support',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload.data)});
      const data=await response.json().catch(() => null);
      if(!response.ok || !data?.id)throw new Error(data?.error || 'The request could not be confirmed. Please retry or use our published support email.');
      setSuccess('Request saved. Reference: '+data.id+'. You can read the reply under My support requests.');
      setMessage('');
    }catch(error){setError(error instanceof Error?error.message:'Unable to save request');}
    finally{setSubmitting(false);}
  };
  return (
    <div className="bg-white dark:bg-zinc-950 p-6 md:p-8 rounded-2xl shadow-xl border border-sandal-300/40 dark:border-zinc-800/80">
      {error && <p role="alert" className="mb-4 text-red-600">{error}</p>}
      {success && (
        <div role="status" className="mb-6 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-sm text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-2 break-words">
          <CheckCircle2 className="h-5 w-5 shrink-0 animate-bounce" />
          {success}
        </div>
      )}

      <form onSubmit={handleSubmit} aria-busy={submitting} aria-describedby="support-help" className="flex flex-col gap-5">
        <h2 className="text-lg font-serif font-bold text-maroon-700 dark:text-gold-400 border-b border-sandal-200/50 dark:border-zinc-850 pb-3">
          Send a Message
        </h2>
        <p id="support-help" className="text-sm leading-6 text-muted">Please <Link className="underline" href="/login?returnTo=/contact">sign in</Link> to save a support request and view replies here. You can also contact us without an account using the published email, phone or WhatsApp. Submitting this form saves a ticket; it does not send an email or SMS. Up to five inquiries per hour are accepted.</p>
        <div hidden aria-hidden="true"><label htmlFor="support-website">Website</label><input id="support-website" value={website} onChange={e => setWebsite(e.target.value)} tabIndex={-1} autoComplete="off" /></div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex flex-col gap-1 md:col-span-2">
            <label className="text-[11px] font-bold text-zinc-550 dark:text-zinc-400 uppercase tracking-wider" htmlFor="support-name">Full Name</label>
            <input
              id="support-name" type="text" minLength={2} maxLength={100} autoComplete="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your full name"
              required
              className="h-11 px-3.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-transparent text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-maroon-500"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-bold text-zinc-550 dark:text-zinc-400 uppercase tracking-wider" htmlFor="support-email">Email Address</label>
            <input
              id="support-email" type="email" maxLength={254} autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. name@domain.com"
              required
              className="h-11 px-3.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-transparent text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-maroon-500"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-bold text-zinc-550 dark:text-zinc-400 uppercase tracking-wider" htmlFor="support-mobile">Mobile Number (Optional)</label>
            <input
              id="support-mobile" type="tel" maxLength={30} autoComplete="tel"
              value={mobile}
              onChange={(e) => setMobile(e.target.value)}
              placeholder="e.g. +91 93423 66513"
              className="h-11 px-3.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-transparent text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-maroon-500"
            />
          </div>

          <div className="flex flex-col gap-1 md:col-span-2">
            <label className="text-[11px] font-bold text-zinc-550 dark:text-zinc-400 uppercase tracking-wider" htmlFor="support-subject">Subject Of Inquiry</label>
            <select id="support-subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="h-11 px-3 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-maroon-500"
            >
              <option value="General Inquiry">General Inquiry / Welcome Info</option>
              <option value="Profile Verification">Profile Verification Badges</option>
              <option value="Horoscope Match Help">Horoscope Matching Queries</option>
              <option value="Premium Plans Support">Premium Package Billing</option>
              <option value="Report Bug">Technical Problem</option>
              <option value="Refund Request">Refund / Duplicate Payment</option>
              <option value="Privacy Request">Privacy / Account Deletion</option>
            </select>
          </div>

          <div className="flex flex-col gap-1 md:col-span-2">
            <label className="text-[11px] font-bold text-zinc-550 dark:text-zinc-400 uppercase tracking-wider" htmlFor="support-message">Message Details</label>
            <textarea id="support-message"
              rows={4} minLength={10} maxLength={5000}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Describe your issue or question in detail..."
              required
              className="p-3.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-transparent text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-650 focus:outline-none focus:ring-1 focus:ring-maroon-500 resize-none"
            />
          </div>
        </div>
        <p className="text-xs leading-6 text-muted">Include a payment or profile reference if relevant. Never send passwords, OTPs, card details or identity documents. See our <Link className="underline" href="/privacy-policy">Privacy Policy</Link> for how support information is used.</p>

        {/* Submit Trigger */}
        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={submitting}
            className="w-full sm:w-auto px-8 h-11 rounded-full bg-maroon-700 hover:bg-maroon-800 dark:bg-gold-500 dark:hover:bg-gold-600 text-white dark:text-zinc-950 text-xs font-semibold uppercase tracking-widest shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 transition-all"
          >
            {submitting ? (
              <span>Saving request…</span>
            ) : (
              'Send Inquiry Message'
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
