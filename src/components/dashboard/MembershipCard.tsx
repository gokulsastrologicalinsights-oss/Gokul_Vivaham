'use client';

import Link from 'next/link';
import { Shield, Crown, Gem, Zap, ArrowUpRight, Clock } from 'lucide-react';
import { useEntitlements } from '@/hooks/useEntitlements';

/** Animated credit usage bar */
function CreditBar({
  label,
  used,
  limit,
  color,
}: {
  label: string;
  used: number;
  limit: number;
  color: string;
}) {
  const pct = limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : 0;
  const remaining = limit - used;
  const exhausted = limit > 0 && remaining <= 0;

  return (
    <div className="flex flex-col gap-1">
      <div className="flex justify-between items-center text-[11px]">
        <span className="font-semibold text-zinc-600 dark:text-zinc-400">{label}</span>
        {limit === 0 ? (
          <span className="text-zinc-400 dark:text-zinc-600 font-mono">Not included</span>
        ) : (
          <span
            className={`font-mono font-bold ${
              exhausted
                ? 'text-red-500'
                : remaining <= Math.ceil(limit * 0.2)
                ? 'text-amber-500'
                : 'text-emerald-600 dark:text-emerald-400'
            }`}
          >
            {remaining} / {limit} remaining
          </span>
        )}
      </div>
      <div className="w-full h-2 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
        {limit > 0 && (
          <div
            className={`h-full rounded-full transition-all duration-700 ${
              exhausted ? 'bg-red-500' : remaining <= Math.ceil(limit * 0.2) ? 'bg-amber-500' : color
            }`}
            style={{ width: `${pct}%` }}
          />
        )}
      </div>
    </div>
  );
}

const PLAN_STYLE: Record<
  string,
  { icon: React.ReactNode; badge: string; ring: string; label: string }
> = {
  FREE: {
    icon: <Shield className="h-5 w-5 text-zinc-400" />,
    badge: 'bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-400',
    ring: 'border-zinc-200 dark:border-zinc-800',
    label: 'Startup',
  },
  SILVER: {
    icon: <Zap className="h-5 w-5 text-slate-500" />,
    badge: 'bg-slate-200 text-slate-700 dark:bg-slate-900 dark:text-slate-300',
    ring: 'border-slate-300 dark:border-slate-700',
    label: 'Silver',
  },
  GOLD: {
    icon: <Crown className="h-5 w-5 text-gold-500" />,
    badge: 'bg-gold-100 text-gold-800 dark:bg-gold-900/40 dark:text-gold-400',
    ring: 'border-gold-400 dark:border-gold-700',
    label: 'Gold',
  },
  DIAMOND: {
    icon: <Gem className="h-5 w-5 text-sky-500" />,
    badge: 'bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-300',
    ring: 'border-sky-400 dark:border-sky-700',
    label: 'Diamond',
  },
};

export default function MembershipCard() {
  const { entitlements, loading } = useEntitlements();

  const planKey = entitlements.plan_key || 'FREE';
  const style = PLAN_STYLE[planKey] || PLAN_STYLE.FREE;
  const isPaid = planKey !== 'FREE';

  if (loading) {
    return (
      <div className="bg-white dark:bg-zinc-900 p-6 rounded-3xl shadow-md border border-sandal-200 dark:border-zinc-800/80 animate-pulse h-48" />
    );
  }

  return (
    <div
      className={`relative bg-white dark:bg-zinc-900 p-6 rounded-3xl shadow-md border ${style.ring} flex flex-col gap-5 overflow-hidden`}
    >
      {/* Subtle luxury glow for paid plans */}
      {isPaid && (
        <div className="pointer-events-none absolute inset-0 opacity-[0.04] luxury-gradient rounded-3xl" />
      )}

      {/* Header Row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-sandal-50 dark:bg-zinc-800 flex items-center justify-center">
            {style.icon}
          </div>
          <div>
            <p className="text-xs text-zinc-400 dark:text-zinc-500 font-medium uppercase tracking-widest">
              Active Membership
            </p>
            <h3 className="text-base font-serif font-bold text-foreground leading-tight">
              {entitlements.plan_name}
            </h3>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span
            className={`text-[9px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full ${style.badge}`}
          >
            {style.label}
          </span>
          {isPaid && (
            <div className="flex items-center gap-1 text-[11px] text-zinc-500 dark:text-zinc-400 font-mono">
              <Clock className="h-3.5 w-3.5" />
              <span>{entitlements.days_remaining}d left</span>
            </div>
          )}
        </div>
      </div>

      {/* Credit Bars */}
      <div className="flex flex-col gap-3">
        <CreditBar
          label="Contact Views"
          used={entitlements.contacts_used}
          limit={entitlements.contacts_limit}
          color="luxury-gradient"
        />
        <CreditBar
          label="Horoscope Reports"
          used={entitlements.horoscope_used}
          limit={entitlements.horoscope_limit}
          color="bg-emerald-500"
        />
        <CreditBar
          label="Free Consultations"
          used={entitlements.consultations_used}
          limit={entitlements.consultations_limit}
          color="bg-sky-500"
        />
      </div>

      {/* Upgrade CTA for free users OR exhausted credit CTA */}
      {!isPaid && (
        <Link
          href="/pricing"
          id="membership-card-upgrade"
          className="flex items-center justify-center gap-1.5 w-full py-2.5 rounded-2xl luxury-gradient text-white text-xs font-bold uppercase tracking-wider hover:opacity-90 shadow transition-all cursor-pointer"
        >
          Upgrade Plan <ArrowUpRight className="h-3.5 w-3.5" />
        </Link>
      )}
    </div>
  );
}
