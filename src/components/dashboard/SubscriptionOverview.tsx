'use client';

import Link from 'next/link';
import { Crown, Gem, Shield, Zap, ArrowUpRight } from 'lucide-react';
import { useEntitlements } from '@/hooks/useEntitlements';

const PLAN_ICON: Record<string, React.ReactNode> = {
  FREE: <Shield className="h-4 w-4 text-zinc-400" />,
  SILVER: <Zap className="h-4 w-4 text-slate-500" />,
  GOLD: <Crown className="h-4 w-4 text-gold-500" />,
  DIAMOND: <Gem className="h-4 w-4 text-sky-500" />,
};

export default function SubscriptionOverview() {
  const { entitlements, loading } = useEntitlements();

  if (loading) {
    return (
      <div className="p-4 border rounded-xl bg-zinc-50 dark:bg-zinc-900 dark:border-zinc-800 animate-pulse h-16" />
    );
  }

  const isPaid = entitlements.plan_key !== 'FREE';

  return (
    <div className="p-4 border rounded-xl bg-zinc-50 dark:bg-zinc-900/60 border-sandal-200 dark:border-zinc-800 flex items-center justify-between gap-3">
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg bg-white dark:bg-zinc-800 border border-sandal-200 dark:border-zinc-700 flex items-center justify-center shadow-sm">
          {PLAN_ICON[entitlements.plan_key] || PLAN_ICON.FREE}
        </div>
        <div>
          <p className="text-xs text-zinc-400 dark:text-zinc-500 font-medium">Active Plan</p>
          <p className="text-sm font-serif font-bold text-zinc-850 dark:text-zinc-100">
            {entitlements.plan_name}
          </p>
        </div>
      </div>

      {isPaid ? (
        <span className="text-xs text-zinc-500 dark:text-zinc-400 font-mono shrink-0">
          {entitlements.days_remaining}d left
        </span>
      ) : (
        <Link
          href="/pricing"
          className="flex items-center gap-1 text-xs font-bold text-maroon-600 dark:text-gold-400 hover:underline shrink-0 cursor-pointer"
        >
          Upgrade <ArrowUpRight className="h-3 w-3" />
        </Link>
      )}
    </div>
  );
}
