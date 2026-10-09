'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Search, Heart, MessageSquare, User } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { getAuthenticatedLandingPath } from '@/lib/auth/navigation';

export default function MobileBottomNav() {
  const pathname = usePathname();
  const { isAuthenticated, loading: authLoading, role } = useAuth();

  // Hide mobile bottom navigation in admin views
  if (pathname?.startsWith('/admin') || pathname === '/admin/login') {
    return null;
  }

  const homeHref = isAuthenticated && !authLoading
    ? getAuthenticatedLandingPath({ role })
    : '/';
  const tabs = [
    { name: 'Home', href: homeHref, icon: Home },
    { name: 'Search', href: '/search', icon: Search },
    { name: 'Matches', href: '/dashboard/matches', icon: Heart },
    { name: 'Chat', href: '/dashboard/chat', icon: MessageSquare },
    { name: 'Profile', href: '/dashboard/profile', icon: User },
  ];

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 pb-[env(safe-area-inset-bottom)] lg:hidden glass-panel border-t border-sandal-200/30 dark:border-zinc-800/60 shadow-[0_-4px_20px_rgba(0,0,0,0.08)] backdrop-blur-md transition-all duration-300">
      <div className="mx-auto flex h-16 max-w-md items-center justify-around px-4">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = tab.name === 'Home'
            ? pathname === tab.href
            : pathname === tab.href || (tab.href !== '/' && pathname?.startsWith(tab.href));

          return (
            <Link
              key={tab.name}
              href={tab.href}
              className="relative flex flex-col items-center justify-center flex-1 h-full py-1 text-zinc-500 hover:text-maroon-600 dark:hover:text-gold-400 transition-colors group touch-target"
            >
              <div
                className={`flex items-center justify-center p-1.5 rounded-xl transition-all duration-300 ${
                  isActive
                    ? 'text-maroon-650 dark:text-gold-400 bg-maroon-500/10 dark:bg-gold-500/10 scale-105'
                    : 'group-hover:scale-105'
                }`}
              >
                <Icon className="h-5 w-5" />
              </div>
              <span
                className={`text-[10px] mt-0.5 font-semibold tracking-wider transition-all ${
                  isActive
                    ? 'text-maroon-700 dark:text-gold-400 font-bold'
                    : 'text-zinc-400 dark:text-zinc-500'
                }`}
              >
                {tab.name}
              </span>
              {isActive && (
                <span className="absolute bottom-1 w-1.5 h-1.5 rounded-full bg-maroon-600 dark:bg-gold-400 animate-pulse" />
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
