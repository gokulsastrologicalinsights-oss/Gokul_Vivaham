'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Mail, ArrowLeft, CheckCircle2, Heart } from 'lucide-react';
import { SupportSection } from '@/components/contact/SupportSection';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setError('Please enter your email address.');
      return;
    }

    setLoading(true);
    setError('');
    
    // Simulate reset request
    setTimeout(() => {
      setLoading(false);
      setSuccess('If this email is registered, a password recovery link has been sent to it. Please check your inbox.');
      setEmail('');
    }, 1200);
  };

  return (
    <div className="flex-grow flex flex-col gap-6 items-center justify-center p-6 bg-sandal-50/20 dark:bg-zinc-950/20 min-h-[calc(100vh-80px)] animate-in fade-in duration-300">
      <div className="w-full max-w-md bg-white dark:bg-zinc-900 p-8 rounded-3xl shadow-xl border border-sandal-200 dark:border-zinc-800/80">
        
        <div className="flex flex-col items-center text-center gap-2 mb-6">
          <div className="w-12 h-12 rounded-full bg-maroon-500/10 flex items-center justify-center text-maroon-600 dark:text-gold-400 mb-2">
            <Heart className="h-6 w-6 text-maroon-600 fill-maroon-650" />
          </div>
          <h1 className="text-xl md:text-2xl font-serif font-bold text-zinc-900 dark:text-zinc-50">
            Forgot Password
          </h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 font-light">
            Enter your registered email address to receive password reset instructions.
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-xs text-red-600 dark:text-red-400 font-semibold text-left">
            {error}
          </div>
        )}

        {success ? (
          <div className="flex flex-col gap-4 text-left">
            <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-600 dark:text-emerald-400 font-semibold flex items-start gap-1.5 leading-relaxed">
              <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
              {success}
            </div>
            <Link
              href="/login"
              className="mt-2 w-full py-2.5 rounded-full luxury-gradient text-white text-center text-xs font-bold uppercase tracking-wider shadow-md hover:scale-[1.01] transition-transform"
            >
              Back to Login
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1 text-left">
              <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 transform -translate-y-1/2 h-4 w-4 text-zinc-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. name@domain.com"
                  className="w-full h-11 pl-11 pr-3.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-transparent text-sm focus:outline-none focus:ring-1 focus:ring-maroon-500"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full h-11 mt-2 luxury-gradient text-white rounded-lg font-semibold text-sm hover:opacity-90 shadow-md flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
            >
              {loading ? (
                <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                'Send Recovery Link'
              )}
            </button>

            <Link
              href="/login"
              className="mt-2 flex items-center justify-center gap-1 text-xs text-zinc-500 hover:text-maroon-600 font-semibold"
            >
              <ArrowLeft className="h-4 w-4" /> Back to Login
            </Link>
          </form>
        )}

      </div>
      <div className="w-full max-w-md">
        <SupportSection compact />
      </div>
    </div>
  );
}
