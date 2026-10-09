'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { CheckCircle2, ExternalLink, Mail, Phone, ShieldCheck } from 'lucide-react';
import Link from 'next/link';
import { normalizeVerificationPhone } from '@/lib/verification/phone';

type VerificationData = {
  profile: { profile_id?: string; first_name?: string | null; last_name?: string | null } | null;
  mobile: { status: 'not_verified' | 'requested' | 'verified'; value: string | null };
  email: { status: 'not_verified' | 'verified'; value: string | null };
  request: { requested_at?: string; rejection_reason?: string | null } | null;
  fullyVerified: boolean;
};

export default function ProfileVerificationBanner({ buttonLabel = 'Verify My Profile' }: { buttonLabel?: string }) {
  const [data, setData] = useState<VerificationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [opening, setOpening] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [mobileValue, setMobileValue] = useState('');
  const mobileInputRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    try {
      const response = await fetch('/api/verification/profile', { cache: 'no-store' });
      if (response.status === 401) return;
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Verification status unavailable.');
      setData(result);
      setMobileValue(result.mobile?.value || '');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Verification status unavailable.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const openWhatsApp = async () => {
    if (!mobileValue.trim()) {
      window.alert('Please enter your phone number.');
      setError('Please enter your phone number.');
      mobileInputRef.current?.focus();
      return;
    }

    let phone: string;
    try {
      phone = normalizeVerificationPhone(mobileValue);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Enter a valid phone number with country code.');
      mobileInputRef.current?.focus();
      return;
    }

    setOpening(true);
    setError('');
    setSuccess('');
    try {
      const response = await fetch('/api/verification/whatsapp', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ phone }) });
      const result = await response.json();
      if (!response.ok || !result.whatsappUrl) throw new Error(result.error || 'Verification request could not be started.');
      setData(current => current ? { ...current, mobile: { ...current.mobile, status: 'requested' }, request: { requested_at: new Date().toISOString() } } : current);
      setSuccess('Verification request submitted successfully. WhatsApp will open next; opening it does not prove that the message was sent.');
      const whatsappWindow = window.open(result.whatsappUrl, '_blank', 'noopener,noreferrer');
      if (!whatsappWindow) window.location.assign(result.whatsappUrl);
    } catch (err) {
      setSuccess('');
      setError(err instanceof Error ? err.message : 'Verification request could not be started.');
    } finally {
      setOpening(false);
    }
  };

  if (loading || !data) return error ? <p role="alert" className="rounded-2xl border border-red-300 bg-red-50 p-4 text-sm text-red-700">{error}</p> : null;

  if (data.fullyVerified) {
    return (
      <div className="flex items-center justify-between gap-4 rounded-3xl border border-emerald-500/25 bg-emerald-500/10 p-5">
        <div className="flex items-center gap-3">
          <CheckCircle2 className="h-6 w-6 shrink-0 text-emerald-600" />
          <div><h2 className="font-serif text-lg font-bold text-foreground">Verified Profile</h2><p className="text-sm text-muted">Your mobile number and email address are verified.</p></div>
        </div>
        <ShieldCheck className="hidden h-8 w-8 text-emerald-600 sm:block" />
      </div>
    );
  }

  return (
    <section className="rounded-3xl border border-primary/25 bg-primary/5 p-5 shadow-sm" aria-labelledby="verify-profile-heading">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="min-w-0">
          <div className="mb-1 flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-primary" /><h2 id="verify-profile-heading" className="font-serif text-xl font-bold text-foreground">Verify Your Profile</h2></div>
          <p className="max-w-2xl text-sm leading-relaxed text-muted">Complete your mobile number and email verification to build trust and help other members identify your profile as verified.</p>
          <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold">
            <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 ${data.mobile.status === 'verified' ? 'bg-emerald-500/15 text-emerald-700' : data.mobile.status === 'requested' ? 'bg-amber-500/15 text-amber-700' : 'bg-surface text-muted'}`}><Phone className="h-3.5 w-3.5" />{data.mobile.status === 'verified' ? 'Mobile Verified' : data.mobile.status === 'requested' ? 'Verification Requested' : 'Mobile Not Verified'}</span>
            <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 ${data.email.status === 'verified' ? 'bg-emerald-500/15 text-emerald-700' : 'bg-surface text-muted'}`}><Mail className="h-3.5 w-3.5" />{data.email.status === 'verified' ? 'Email Verified' : 'Email Not Verified'}</span>
          </div>
        </div>
        <div className="flex shrink-0 flex-col gap-2 sm:flex-row md:flex-col">
          <label htmlFor="profile-verification-phone" className="text-xs font-semibold text-foreground">Registered phone number</label>
          <input ref={mobileInputRef} id="profile-verification-phone" type="tel" value={mobileValue} onChange={event => setMobileValue(event.target.value)} placeholder="+91 9876543210" autoComplete="tel" className="rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary" aria-describedby="profile-verification-phone-help" />
          <button type="button" onClick={() => void openWhatsApp()} disabled={opening || data.mobile.status === 'verified'} className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-xs font-bold uppercase tracking-wider text-primary-foreground shadow transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60">{opening ? 'Opening WhatsApp…' : buttonLabel}<ExternalLink className="h-4 w-4" /></button>
          <Link href="/dashboard/verification" className="text-center text-xs font-semibold text-primary hover:underline">View verification options</Link>
        </div>
      </div>
      <p id="profile-verification-phone-help" className="mt-2 text-[11px] text-muted">Use the registered number with its country code. We will not mark it verified until an administrator confirms it.</p>
      <p className="mt-4 text-[11px] leading-relaxed text-muted">Opening WhatsApp does not prove that your message was sent or received. An authorized administrator will verify the registered details before approval.</p>
      {error && <p role="alert" className="mt-3 text-xs text-red-600">{error}</p>}
      {success && <p role="status" className="mt-3 text-xs text-emerald-700">{success}</p>}
    </section>
  );
}
