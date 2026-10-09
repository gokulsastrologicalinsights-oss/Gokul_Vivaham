'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Mail, Lock, ArrowRight, Eye, EyeOff } from 'lucide-react';
import { authService } from '@/services/auth.service';
import { syncServerSession } from '@/lib/auth/session-client';
import { getAuthenticatedLandingPath } from '@/lib/auth/navigation';
import { supabase } from '@/lib/supabase';

export default function LoginForm() {
  // Fields State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Status states
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [factorId, setFactorId] = useState('');
  const [authenticatorCode, setAuthenticatorCode] = useState('');
  const [unconfirmedEmail, setUnconfirmedEmail] = useState('');
  const [resending, setResending] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  useEffect(() => {
    if (!resendCooldown) return;
    const timer = setTimeout(() => setResendCooldown(value => Math.max(0, value - 1)), 1000);
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  const resendConfirmation = async () => {
    if (!unconfirmedEmail || resending || resendCooldown) return;
    setResending(true);
    setErrorMessage('');
    setSuccessMessage('');
    try {
      const { error } = await supabase.auth.resend({ type: 'signup', email: unconfirmedEmail,
        options: { emailRedirectTo: `${window.location.origin}/login` } });
      if (error) throw error;
      setSuccessMessage('Confirmation email requested. Check your inbox and spam folder, confirm your email, then sign in.');
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : '';
      setErrorMessage(/rate|too many/i.test(message)
        ? 'Too many email requests. Please wait before requesting another confirmation email.'
        : 'Unable to resend the confirmation email. Please try again later or contact support.');
    } finally { setResending(false); setResendCooldown(60); }
  };

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setErrorMessage('Please fill in all fields.');
      return;
    }

    setLoading(true);
    setErrorMessage('');

    try {
      const { data, error } = await authService.signInWithPassword(email, password);

      if (error) {
        if ((error as { code?: string }).code === 'email_not_confirmed' || /email not confirmed/i.test(error.message)) {
          setUnconfirmedEmail(email.trim());
          setErrorMessage('Please confirm your email before signing in. Request a new confirmation email below.');
        } else setErrorMessage(error.message);
      } else {
        if (!data?.session) throw new Error('Sign-in did not create a session.');
        const access = await syncServerSession(data.session.access_token);
        if (access.mfa_required) {
          const { data: factors, error: factorError } = await supabase.auth.mfa.listFactors();
          if (factorError) throw factorError;
          const factor = factors.totp.find(f => f.status === 'verified');
          if (!factor) {
            window.location.href = '/admin/login';
            return;
          }
          setFactorId(factor.id);
          setSuccessMessage('Enter the six-digit code from your authenticator app.');
          return;
        }
        setSuccessMessage('Login successful!');
        setTimeout(() => {
          window.location.href = getAuthenticatedLandingPath({
            role: access.role,
            isAdmin: access.isAdmin,
            mfaRequired: access.mfa_required,
          });
        }, 1500);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };

  const handleAuthenticatorLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^\d{6}$/.test(authenticatorCode)) {
      setErrorMessage('Enter a six-digit authenticator code.');
      return;
    }
    setLoading(true);
    setErrorMessage('');
    try {
      const { data, error } = await supabase.auth.mfa.challengeAndVerify({ factorId, code: authenticatorCode });
      if (error) throw error;
      const access = await syncServerSession(data.access_token);
      if (access.mfa_required) throw new Error('Authenticator verification is required.');
      window.location.href = access.isAdmin ? '/admin/dashboard' : '/dashboard';
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Verification failed.');
    } finally { setLoading(false); }
  };

  return (
    <div className="w-full glass-panel p-8 sm:p-10 rounded-[2rem] shadow-xl text-left relative overflow-hidden">

      <div className="flex flex-col items-center text-center gap-2 mb-8">
        <h1 className="text-2xl md:text-3xl font-serif font-bold text-zinc-900 dark:text-zinc-50">
          Welcome Back
        </h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 font-light">
          Enter your credentials to access your dashboard
        </p>
      </div>

      {/* Feedback Messages */}
      {errorMessage && (
        <div className="mb-6 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-400 rounded-xl text-sm text-center">
          {errorMessage}
        </div>
      )}
      {successMessage && (
        <div className="mb-6 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-900/50 text-green-600 dark:text-green-400 rounded-xl text-sm text-center">
          {successMessage}
        </div>
      )}

      {unconfirmedEmail && (
        <button type="button" onClick={resendConfirmation}
          disabled={resending || loading || resendCooldown > 0}
          className="mb-6 w-full rounded-xl border border-maroon-500 px-4 py-3 text-sm font-semibold text-maroon-600 dark:text-gold-400 disabled:opacity-50">
          {resending ? 'Sending confirmation email…' : resendCooldown ? `Resend available in ${resendCooldown}s` : 'Resend confirmation email'}
        </button>
      )}
      {/* EMAIL / PASSWORD LOGIN FORM */}
      {factorId ? (
        <form onSubmit={handleAuthenticatorLogin} className="flex flex-col gap-5">
          <label htmlFor="member-authenticator" className="text-sm">Authenticator code</label>
          <input id="member-authenticator" inputMode="numeric" autoComplete="one-time-code" maxLength={6}
            value={authenticatorCode} onChange={e => setAuthenticatorCode(e.target.value)}
            className="h-11 px-4 rounded-lg border border-border bg-background text-foreground" />
          <button disabled={loading} className="h-11 rounded-full bg-[#B71C1C] text-white disabled:opacity-50">Verify and sign in</button>
        </form>
      ) : <form onSubmit={handlePasswordLogin} className="flex flex-col gap-5">
        
        {/* Email Input */}
        <div className="space-y-1.5 w-full">
          <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider ml-1" htmlFor="login-email">Email Address</label>
          <div className="relative group w-full">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-zinc-400 group-focus-within:text-maroon-500 transition-colors">
              <Mail className="h-4 w-4" />
            </div>
            <input
              id="login-email" type="email" autoComplete="email" required
              value={email}
              onChange={(e) => { setEmail(e.target.value); setUnconfirmedEmail(''); setErrorMessage(''); setSuccessMessage(''); }}
              placeholder="name@example.com"
              className="block w-full pl-11 pr-4 h-11 bg-white/50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-lg text-zinc-800 dark:text-zinc-150 placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-maroon-500 focus:border-maroon-500 transition-all text-sm"
            />
          </div>
        </div>

        {/* Password Input */}
        <div className="space-y-1.5 w-full">
          <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider ml-1" htmlFor="login-password">Password</label>
          <div className="relative group w-full">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-zinc-400 group-focus-within:text-maroon-500 transition-colors">
              <Lock className="h-4 w-4" />
            </div>
            <input
              id="login-password" autoComplete="current-password" required type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              className="block w-full pl-11 pr-12 h-11 bg-white/50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-lg text-zinc-800 dark:text-zinc-150 placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-maroon-500 focus:border-maroon-500 transition-all text-sm"
            />
            <button
              type="button"
              aria-label={showPassword ? 'Hide password' : 'Show password'} onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 right-0 pr-4 flex items-center text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {/* Options */}
        <div className="flex items-center justify-between mt-2">
          <label className="flex items-center gap-2 cursor-pointer group">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="h-4.5 w-4.5 text-maroon-600 rounded border-zinc-300 accent-maroon-600"
            />
            <span className="text-xs text-zinc-500">Remember Me</span>
          </label>
          
          <Link href="/forgot-password" className="text-xs font-semibold text-maroon-600 dark:text-gold-400 hover:underline">
            Forgot Password?
          </Link>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={loading}
          className="h-11 w-full mt-4 rounded-full bg-[#B71C1C] text-white text-xs font-bold uppercase tracking-widest hover:bg-[#D32F2F] hover:shadow-lg active:scale-95 transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? (
            <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <>
              Sign In
              <ArrowRight className="h-4 w-4" />
            </>
          )}
        </button>
      </form>}

      <div className="mt-8 text-center text-sm text-zinc-600 dark:text-zinc-400 font-light">
        New to Gokul Vivaham?{' '}
        <Link 
          href="/register" 
          onClick={() => {
            if (typeof window !== 'undefined') {
              localStorage.removeItem('gokul_matrimony_register_draft');
            }
          }}
          className="font-bold text-maroon-600 dark:text-gold-400 hover:underline transition-colors"
        >
          Create New Account
        </Link>
      </div>

    </div>
  );
}
