'use client';

import { useState } from 'react';
import {supabase} from '@/lib/supabase';
import {syncServerSession} from '@/lib/auth/session-client';
import { CheckCircle2 } from 'lucide-react';

export function ContactForm() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [mobile, setMobile] = useState('');
  const [subject, setSubject] = useState('General Inquiry');
  const [message, setMessage] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setSubmitting(true); setSuccess(''); setError('');
    try {
      const {data:{session}} = await supabase.auth.getSession();
      if(session) await syncServerSession(session.access_token);
      const response=await fetch('/api/support',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name,email,mobile,subject,message})});
      const data=await response.json();
      if(!response.ok)throw new Error(data.error);
      setSuccess('Request saved. Reference: '+data.id+'. You can read the reply under My support requests.');
      setMessage('');
    }catch(error){setError(error instanceof Error?error.message:'Unable to save request');}
    finally{setSubmitting(false);}
  };
  return (
    <div className="bg-white dark:bg-zinc-950 p-6 md:p-8 rounded-2xl shadow-xl border border-sandal-300/40 dark:border-zinc-800/80">
      {error && <p role="alert" className="mb-4 text-red-600">{error}</p>}
      {success && (
        <div className="mb-6 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-sm text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-2">
          <CheckCircle2 className="h-5 w-5 shrink-0 animate-bounce" />
          {success}
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        <h2 className="text-lg font-serif font-bold text-maroon-700 dark:text-gold-400 border-b border-sandal-200/50 dark:border-zinc-850 pb-3">
          Send a Message
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex flex-col gap-1 md:col-span-2">
            <label className="text-[11px] font-bold text-zinc-550 dark:text-zinc-400 uppercase tracking-wider" htmlFor="support-name">Full Name</label>
            <input
              id="support-name" type="text"
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
              id="support-email" type="email"
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
              id="support-mobile" type="tel"
              value={mobile}
              onChange={(e) => setMobile(e.target.value)}
              placeholder="e.g. +91 94445 59071"
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
            </select>
          </div>

          <div className="flex flex-col gap-1 md:col-span-2">
            <label className="text-[11px] font-bold text-zinc-550 dark:text-zinc-400 uppercase tracking-wider" htmlFor="support-message">Message Details</label>
            <textarea id="support-message"
              rows={4}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Describe your issue or question in detail..."
              required
              className="p-3.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-transparent text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-650 focus:outline-none focus:ring-1 focus:ring-maroon-500 resize-none"
            />
          </div>
        </div>

        {/* Submit Trigger */}
        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={submitting}
            className="w-full sm:w-auto px-8 h-11 rounded-full bg-maroon-700 hover:bg-maroon-800 dark:bg-gold-500 dark:hover:bg-gold-600 text-white dark:text-zinc-950 text-xs font-semibold uppercase tracking-widest shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 transition-all"
          >
            {submitting ? (
              <div className="h-4 w-4 border-2 border-white dark:border-zinc-950 border-t-transparent rounded-full animate-spin" />
            ) : (
              'Send Inquiry Message'
            )}
          </button>
        </div>
      </form>
    </div>
  );
}



