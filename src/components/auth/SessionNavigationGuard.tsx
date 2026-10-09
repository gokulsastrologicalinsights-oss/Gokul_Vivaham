'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import {
  getAuthenticatedLandingPath,
  isAdminRoute,
  isProtectedRoute,
} from '@/lib/auth/navigation';

function SessionLoader() {
  return (
    <div className="flex min-h-screen flex-1 items-center justify-center bg-background px-6 text-foreground">
      <div className="flex flex-col items-center gap-3 text-center">
        <div className="h-9 w-9 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        <span className="text-xs font-medium text-muted">Checking your session...</span>
      </div>
    </div>
  );
}

export default function SessionNavigationGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || '/';
  const router = useRouter();
  const { isAuthenticated, loading, role } = useAuth();
  const isHomepage = pathname === '/';
  const isProtected = isProtectedRoute(pathname);

  useEffect(() => {
    if (loading) return;

    if (isHomepage && isAuthenticated) {
      router.replace(getAuthenticatedLandingPath({ role }));
      return;
    }

    if (isProtected && !isAuthenticated) {
      router.replace(isAdminRoute(pathname) ? '/admin/login' : '/login');
    }
  }, [isAuthenticated, isHomepage, isProtected, loading, pathname, role, router]);

  if (loading || (isHomepage && isAuthenticated) || (isProtected && !isAuthenticated)) {
    return <SessionLoader />;
  }

  return <>{children}</>;
}
