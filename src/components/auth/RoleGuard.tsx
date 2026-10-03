'use client';

import { ReactNode } from 'react';
import { useAuth } from '@/hooks/useAuth';

import { UserRole } from '@/lib/auth/permissions';
import { isAllowed } from '@/lib/auth/role-guards';
import Link from 'next/link';

export default function RoleGuard({ 
  children, 
  allowedRoles 
}: { 
  children: ReactNode; 
  allowedRoles: UserRole[] 
}) {
  const { role, loading, isAuthenticated } = useAuth();

  if (loading) {
    return (
      <div className="min-h-[400px] flex items-center justify-center flex-col gap-3">
        <div className="h-8 w-8 border-4 border-maroon-600 border-t-transparent rounded-full animate-spin" />
        <span className="text-xs text-zinc-500 font-medium animate-pulse">Verifying authorization...</span>
      </div>
    );
  }

  // Check if role satisfies any of the allowed roles using our RBAC helpers
  const hasAccess = allowedRoles.some(reqRole => isAllowed(role, reqRole));

  if (!isAuthenticated || !hasAccess) {
    return (
      <div className="min-h-[400px] flex flex-col items-center justify-center text-center p-8 bg-white dark:bg-zinc-900 border border-sandal-200 dark:border-zinc-800/85 rounded-3xl max-w-md mx-auto my-12 shadow-xl animate-in fade-in zoom-in-95 duration-350">
        <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-950/20 flex items-center justify-center text-red-600 dark:text-red-400 mb-4">
          <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m0-6v2m0-6h.01M12 3a9 9 0 110 18 9 9 0 010-18z" />
          </svg>
        </div>
        
        <h2 className="text-2xl font-serif font-bold text-zinc-900 dark:text-zinc-50 mb-2">
          Access Restricted
        </h2>
        
        <p className="text-xs text-zinc-500 dark:text-zinc-400 font-light max-w-sm mb-6 leading-relaxed">
          You do not have the required permissions to access this page. This page requires <span className="font-semibold text-maroon-650 dark:text-gold-450">{allowedRoles.join(' / ')}</span> access.
        </p>

        <div className="flex flex-col gap-2 w-full">
          <Link
            href="/dashboard"
            className="w-full py-2.5 rounded-full luxury-gradient text-white text-xs font-semibold uppercase tracking-wider text-center hover:opacity-90 shadow"
          >
            Back to Dashboard
          </Link>
          <Link
            href="/pricing"
            className="w-full py-2.5 rounded-full border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-350 text-xs font-semibold uppercase tracking-wider text-center"
          >
            Upgrade Account
          </Link>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

