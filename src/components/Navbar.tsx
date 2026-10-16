'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, X, User, LogOut, ShieldAlert, Phone } from 'lucide-react';
import ThemeToggle from './ThemeToggle';
import BrandLogo from './BrandLogo';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import { contactConfig } from '@/config/contact.config';
import { useAuth } from '@/hooks/useAuth';
import { getAuthenticatedLandingPath } from '@/lib/auth/navigation';

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [user, setUser] = useState<any>(null);
  const pathname = usePathname();
  const { role, loading: authLoading } = useAuth();

  useEffect(() => {
    // Listen for auth state changes
    const fetchSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user || null);
    };

    fetchSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const handleSignOut = async () => {
    try {
      await useAuthStore.getState().logout();
    } catch (e) {
      console.error('Logout error:', e);
      window.location.href = '/login';
    }
  };

  // Do not show main navbar inside any admin route
  if (pathname?.startsWith('/admin')) {
    return null;
  }

  const navLinks = [
    ...(!user ? [{ name: 'Home', href: '/' }] : []),
    { name: 'Matches', href: '/dashboard/matches' },
    { name: 'Preferences', href: '/dashboard/preferences' },
    ...(user ? [{ name: 'Chat', href: '/dashboard/chat' }] : []),
    { name: 'Support', href: '/contact' },
  ];
  const homeHref = user && !authLoading
    ? getAuthenticatedLandingPath({ role })
    : '/';

  return (
    <nav className="brand-surface brand-navbar sticky top-0 z-50 w-full border-b border-border shadow-sm">
      <div className="site-container">
        <div className="flex min-h-20 items-center justify-between gap-3 py-2">
          {/* Logo & Branding */}
          <div className="flex min-w-0 items-center">
            <Link href={homeHref} className="brand-home-link" aria-label="Gokul Vivaham home">
              <BrandLogo />
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden min-w-0 xl:flex items-center gap-4">
            {navLinks.map((link) => (
              <Link
                key={link.name}
                href={link.href}
                className={`text-sm font-semibold tracking-wide transition-colors duration-200 hover:text-primary ${
                  pathname === link.href
                    ? 'text-primary border-b-2 border-primary pb-1'
                    : 'text-foreground/80'
                }`}
              >
                {link.name}
              </Link>
            ))}

            <div className="h-6 w-px bg-border" />

            <a
              href={contactConfig.whatsapp.link}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden 2xl:inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-600/10 hover:bg-emerald-600/20 text-emerald-200 rounded-full text-xs font-bold transition-all border border-emerald-500/25 shrink-0"
              aria-label="Connect with us on WhatsApp"
            >
              <Phone className="h-3.5 w-3.5 shrink-0 text-emerald-300" />
              <span>Support: {contactConfig.phone.display}</span>
            </a>

            <ThemeToggle />

            {user ? (
            <div className="flex min-w-0 items-center gap-4">
                <Link
                  href="/dashboard"
                  className="flex items-center gap-1.5 text-sm font-semibold text-foreground hover:text-primary transition-colors"
                >
                  <User className="h-4 w-4" />
                  Dashboard
                </Link>
                <button
                  onClick={handleSignOut}
                  className="flex items-center gap-1.5 px-4 h-10 rounded-full border border-border text-foreground hover:bg-surface text-xs font-bold uppercase tracking-wider transition-all duration-200 cursor-pointer"
                >
                  <LogOut className="h-4 w-4" />
                  Logout
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <Link
                  href="/login"
                  className="text-sm font-bold text-foreground hover:text-primary px-3 py-2 transition-colors"
                >
                  Login
                </Link>
                <Link
                  href="/register"
                  onClick={() => {
                    if (typeof window !== 'undefined') {
                      localStorage.removeItem('gokul_matrimony_register_draft');
                    }
                  }}
                  className="flex items-center justify-center px-5 h-10 rounded-full brand-register bg-brand-red text-white text-xs font-bold uppercase tracking-widest hover:bg-brand-red-light hover:shadow-lg transition-all duration-200"
                >
                  Register
                </Link>
              </div>
            )}
          </div>

          {/* Mobile/Tablet menu button */}
          <div className="xl:hidden flex items-center gap-1 sm:gap-3 shrink-0">
            <a
              href={contactConfig.phone.link}
              className="p-2 rounded-full border border-border text-primary hover:bg-surface hidden sm:flex items-center justify-center shrink-0 touch-target"
              title="Call Support"
              aria-label="Call Support"
            >
              <Phone className="h-4.5 w-4.5" />
            </a>
            <div className="hidden sm:block"><ThemeToggle /></div>
            {user && (
              <Link
                href="/dashboard/profile"
                className="p-2 rounded-full border border-border text-primary hover:bg-surface hidden sm:flex items-center justify-center shrink-0 touch-target"
                title="View Profile"
              >
                <User className="h-4.5 w-4.5" />
              </Link>
            )}
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="p-2 rounded-lg text-foreground hover:bg-surface focus:outline-none touch-target"
              aria-label="Toggle menu"
              aria-expanded={isOpen}
              aria-controls="primary-mobile-menu"
            >
              {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile/Tablet Menu */}
      {isOpen && (
        <div id="primary-mobile-menu" className="xl:hidden border-t border-border shadow-lg animate-in fade-in slide-in-from-top duration-300">
          <div className="px-2 pt-2 pb-4 space-y-1 sm:px-3">
            <div className="sm:hidden flex items-center justify-between gap-4 px-3 py-2">
              <a href={contactConfig.phone.link} className="inline-flex items-center gap-2 text-sm text-primary min-h-11">
                <Phone className="h-4 w-4" /> Call Support
              </a>
              <ThemeToggle />
            </div>
            {navLinks.map((link) => (
              <Link
                key={link.name}
                href={link.href}
                onClick={() => setIsOpen(false)}
                className={`block px-3 py-2 rounded-md text-base font-medium transition-colors ${
                  pathname === link.href
                    ? 'bg-primary/10 text-primary font-semibold'
                    : 'text-foreground hover:bg-surface'
                }`}
              >
                {link.name}
              </Link>
            ))}

            <div className="h-px bg-border my-2" />

            {user ? (
              <>
                <Link
                  href="/dashboard/profile"
                  onClick={() => setIsOpen(false)}
                  className="sm:hidden flex items-center gap-2 px-3 py-2 rounded-md text-base font-medium text-foreground hover:bg-surface"
                >
                  <User className="h-5 w-5" />
                  View Profile
                </Link>
                <Link
                  href="/dashboard"
                  onClick={() => setIsOpen(false)}
                  className="flex items-center gap-2 px-3 py-2 rounded-md text-base font-medium text-foreground hover:bg-surface"
                >
                  <User className="h-5 w-5" />
                  Dashboard
                </Link>
                <button
                  onClick={() => {
                    setIsOpen(false);
                    handleSignOut();
                  }}
                  className="flex w-full items-center gap-2 px-3 py-2 rounded-md text-base font-medium text-primary hover:bg-primary/5 text-left cursor-pointer"
                >
                  <LogOut className="h-5 w-5" />
                  Logout
                </button>
              </>
            ) : (
              <div className="flex flex-col gap-2 p-2">
                <Link
                  href="/login"
                  onClick={() => setIsOpen(false)}
                  className="flex items-center justify-center w-full px-4 py-2 border border-border text-foreground font-bold rounded-full hover:bg-surface"
                >
                  Login
                </Link>
                <Link
                  href="/register"
                  onClick={() => {
                    setIsOpen(false);
                    if (typeof window !== 'undefined') {
                      localStorage.removeItem('gokul_matrimony_register_draft');
                    }
                  }}
                  className="flex items-center justify-center w-full px-4 py-2 brand-register bg-brand-red text-white font-bold rounded-full hover:bg-brand-red-light shadow-md"
                >
                  Register
                </Link>
              </div>
            )}

            <div className="h-px bg-border my-2" />

            {/* Admin entry point in mobile menu */}
            <Link
              href="/admin/login"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-2 px-3 py-2 text-xs font-semibold text-muted hover:text-primary"
            >
              <ShieldAlert className="h-4 w-4" />
              Admin Portal
            </Link>
          </div>
        </div>
      )}
    </nav>
  );
}
