'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  ShieldAlert, Lock, Mail, Key, ShieldCheck, 
  Terminal, ArrowRight, Server, Radio
} from 'lucide-react';

import { supabase } from '@/lib/supabase';
import ThemeToggle from '@/components/ThemeToggle';
import { syncServerSession } from '@/lib/auth/session-client';

export default function AdminLogin() {
  const router = useRouter();
  
  // Fields State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [factorId, setFactorId] = useState('');
  const [enrollmentQr, setEnrollmentQr] = useState('');
  
  // States
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [twoFactorRequired, setTwoFactorRequired] = useState(false);

  // Simulated Console Logs
  const [consoleLogs, setConsoleLogs] = useState<string[]>([
    'SYSTEM: Admin portal initialized.',
    'AUTH: Supabase authentication required.',
    'GATEWAY: Ready for credentials.'
  ]);

  const addLog = (msg: string) => {
    setConsoleLogs(prev => [...prev.slice(-3), `SYS: ${msg}`]);
  };

  const handleInitialSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage('');
    try {
      const response = await fetch('/api/admin/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: email, password }) });
      const login = await response.json();
      if (!response.ok) throw new Error(login.error || 'Sign-in failed.');
      const { data, error } = await supabase.auth.setSession(login);
      if (error || !data.session || !data.user) throw error || new Error('Sign-in failed.');
      const { data: member, error: memberError } = await supabase.from('admin_users')
        .select('id').eq('auth_user_id', data.user.id).maybeSingle();
      if (memberError || !member) {
        await supabase.auth.signOut();
        throw new Error('Access denied: administrator membership is required.');
      }
      const access = await syncServerSession(data.session.access_token);
      if (access.isAdmin) { router.push('/admin/users'); router.refresh(); return; }
      const { data: factors, error: factorError } = await supabase.auth.mfa.listFactors();
      if (factorError) throw factorError;
      const verified = factors.totp.find(factor => factor.status === 'verified');
      if (verified) {
        setFactorId(verified.id);
        setEnrollmentQr('');
        setSuccessMessage('Enter the six-digit code from your authenticator app.');
      } else {
        for (const factor of factors.all.filter(f => f.status === 'unverified' && f.factor_type === 'totp')) {
          const { error: removeError } = await supabase.auth.mfa.unenroll({ factorId: factor.id });
          if (removeError) throw removeError;
        }
        const { data: enrollment, error: enrollmentError } = await supabase.auth.mfa.enroll({
          factorType: 'totp', friendlyName: 'Gokul Vivaham Admin',
        });
        if (enrollmentError) throw enrollmentError;
        setFactorId(enrollment.id);
        setEnrollmentQr(enrollment.totp.qr_code);
        setSuccessMessage('Scan the QR code with your authenticator app, then enter its six-digit code.');
      }
      setTwoFactorRequired(true);
      addLog('MFA: Real authenticator verification required.');
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Sign-in failed.');
    } finally { setLoading(false); }
  };

  const handleTwoFactorSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^\d{6}$/.test(twoFactorCode)) {
      setErrorMessage('Enter the six-digit code from your authenticator app.');
      return;
    }
    setLoading(true);
    setErrorMessage('');
    try {
      const { data, error } = await supabase.auth.mfa.challengeAndVerify({ factorId, code: twoFactorCode });
      if (error) throw error;
      const access = await syncServerSession(data.access_token);
      if (!access.isAdmin) throw new Error('Administrator access could not be verified.');
      setSuccessMessage('Authenticator verified.');
      router.push('/admin/dashboard');
      router.refresh();
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Verification failed.');
    } finally { setLoading(false); }
  };
  return (
    <div className="flex-1 min-h-[calc(100vh-80px)] w-full bg-background flex flex-col justify-center items-center p-6 text-foreground transition-colors relative overflow-hidden">
      
      {/* Theme Toggle floating in top corner */}
      <div className="absolute top-6 right-6 z-20">
        <ThemeToggle />
      </div>

      {/* Decorative Server grid animation lines */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,var(--border)_1px,transparent_1px),linear-gradient(to_bottom,var(--border)_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-10 pointer-events-none" />
      
      <div className="w-full max-w-md bg-card/90 border border-border rounded-2xl shadow-2xl p-8 z-10 relative">
        
        {/* Security Indicator */}
        <div className="absolute -top-3.5 right-6 bg-destructive/10 border border-destructive/20 text-destructive px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 shadow-md">
          <Radio className="h-3 w-3 animate-pulse text-destructive" />
          ADMIN ACCESS
        </div>

        {/* Admin Branding */}
        <div className="flex flex-col items-center gap-4 mb-8 text-center">
          <div className="w-16 h-16 rounded-2xl bg-surface border border-border flex items-center justify-center text-primary shadow-inner">
            <ShieldAlert className="h-8 w-8 text-primary" />
          </div>
          <div className="flex flex-col gap-0.5">
            <h1 className="text-xl font-mono font-bold tracking-widest uppercase text-foreground">
              Gokul Vivaham Admin
            </h1>
            <span className="text-[10px] font-mono text-muted uppercase tracking-wider">
              Control Panel Portal v3.1
            </span>
          </div>
        </div>

        {/* System logs simulator */}
        <div className="mb-6 p-3 bg-background/80 rounded-lg border border-border font-mono text-[10px] text-muted flex flex-col gap-1 select-none">
          <div className="flex items-center justify-between text-muted border-b border-border pb-1.5 mb-1">
            <span className="flex items-center gap-1"><Terminal className="h-3.5 w-3.5" /> SYSTEM LOGS</span>
            <span className="flex items-center gap-1 text-success"><Server className="h-3 w-3" /> ONLINE</span>
          </div>
          {consoleLogs.map((log, idx) => (
            <div key={idx} className="truncate">{log}</div>
          ))}
        </div>

        {/* Notifications */}
        {errorMessage && (
          <div className="mb-5 p-3.5 rounded-lg bg-red-950/50 border border-red-900/50 text-xs text-red-400 font-mono font-bold">
            [ERROR] {errorMessage}
          </div>
        )}

        {successMessage && (
          <div className="mb-5 p-3.5 rounded-lg bg-emerald-950/50 border border-emerald-900/50 text-xs text-emerald-400 font-mono font-bold flex items-center gap-1.5">
            <ShieldCheck className="h-4 w-4 shrink-0" /> [STATUS] {successMessage}
          </div>
        )}

        {/* INITIAL CREDENTIALS FORM */}
        {!twoFactorRequired ? (
          <form onSubmit={handleInitialSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <label htmlFor="admin-email" className="text-[10px] font-mono font-bold text-muted uppercase tracking-widest">Admin ID or Email</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted" />
                <input
                  type="text"
                  id="admin-email"
                  autoComplete="username"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Admin ID"
                  className="w-full h-11 pl-11 pr-3.5 rounded-lg border border-border bg-background text-sm font-mono focus:outline-none focus:border-primary/50 text-foreground"
                />
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <div className="flex justify-between items-center">
                <label htmlFor="admin-password" className="text-[10px] font-mono font-bold text-muted uppercase tracking-widest">Password</label>
                <a href="/forgot-password" className="text-[10px] font-mono text-muted hover:text-primary">
                  Forgot Password?
                </a>
              </div>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted" />
                <input
                  type="password"
                  id="admin-password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full h-11 pl-11 pr-3.5 rounded-lg border border-border bg-background text-sm font-mono focus:outline-none focus:border-primary/50 text-foreground"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full h-11 mt-2 bg-primary hover:brightness-110 text-primary-foreground rounded-lg font-mono text-xs uppercase tracking-widest flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50 shadow-md border-none"
            >
              {loading ? (
                <div className="h-4 w-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  Authenticate
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>
        ) : (
          /* 2FA VERIFICATION FORM */
          <form onSubmit={handleTwoFactorSubmit} className="flex flex-col gap-4">
            {enrollmentQr && <img src={enrollmentQr} alt="Scan to set up your admin authenticator" className="w-48 h-48 mx-auto bg-white p-2 rounded-lg" />}
            <div className="flex flex-col gap-1">
              <label htmlFor="admin-authenticator" className="text-[10px] font-mono font-bold text-muted uppercase tracking-widest">
                2FA Verification Token
              </label>
              <div className="relative">
                <Key className="absolute left-3.5 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted" />
                <input
                  type="text"
                  id="admin-authenticator"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  value={twoFactorCode}
                  onChange={(e) => setTwoFactorCode(e.target.value)}
                  placeholder="Enter 6-digit code"
                  className="w-full h-11 pl-11 pr-3.5 rounded-lg border border-border bg-background text-sm font-mono focus:outline-none focus:border-primary/50 text-foreground text-center tracking-widest font-black"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full h-11 mt-2 bg-primary hover:brightness-110 text-primary-foreground rounded-lg font-mono text-xs uppercase tracking-widest flex items-center justify-center gap-2 transition-all cursor-pointer font-bold disabled:opacity-50 border-none"
            >
              {loading ? (
                <div className="h-4 w-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  Verify Token &amp; Enter
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => {
                setTwoFactorRequired(false);
                setTwoFactorCode('');
                setSuccessMessage('');
                addLog('RESET: Retrying credentials.');
              }}
              className="text-[10px] font-mono text-muted hover:text-foreground text-center uppercase tracking-wider mt-1 border-none bg-transparent cursor-pointer"
            >
              Back to credentials
            </button>
          </form>
        )}

      </div>
    </div>
  );
}
