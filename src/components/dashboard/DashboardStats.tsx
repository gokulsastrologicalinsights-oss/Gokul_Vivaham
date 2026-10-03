'use client';

import { Phone, FileText, Star, CalendarDays } from 'lucide-react';
import { useEntitlements } from '@/hooks/useEntitlements';

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  used: number;
  limit: number;
  limitLabel: string;
  accentClass: string;
}

function StatCard({ icon, label, used, limit, limitLabel, accentClass }: StatCardProps) {
  const pct = limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : 0;
  const remaining = limit - used;
  const exhausted = limit > 0 && remaining <= 0;
  const nearLimit = limit > 0 && remaining <= Math.ceil(limit * 0.2) && !exhausted;

  return (
    <div className="bg-white dark:bg-zinc-900 p-5 rounded-2xl shadow-sm border border-sandal-200 dark:border-zinc-800/80 flex flex-col justify-between text-left gap-3">
      {/* Label row */}
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 rounded-lg bg-sandal-50 dark:bg-zinc-800 flex items-center justify-center">
          {icon}
        </div>
        <span className="text-xs font-bold text-zinc-400 uppercase tracking-widest">{label}</span>
      </div>

      {/* Value */}
      {limit === 0 ? (
        <div className="flex flex-col gap-0.5">
          <span className="text-zinc-400 dark:text-zinc-600 text-base font-mono font-bold">—</span>
          <span className="text-[10px] text-zinc-400 dark:text-zinc-600">Not in your plan</span>
        </div>
      ) : (
        <div className="flex flex-col gap-1">
          <div className="flex items-baseline gap-1">
            <span
              className={`text-3xl font-mono font-black ${
                exhausted
                  ? 'text-red-500'
                  : nearLimit
                  ? 'text-amber-500'
                  : 'text-foreground'
              }`}
            >
              {remaining}
            </span>
            <span className="text-xs text-zinc-400 dark:text-zinc-500 font-light">/ {limit} {limitLabel}</span>
          </div>

          {/* Mini progress bar */}
          <div className="w-full h-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                exhausted ? 'bg-red-500' : nearLimit ? 'bg-amber-500' : accentClass
              }`}
              style={{ width: `${pct}%` }}
            />
          </div>

          {exhausted && (
            <span className="text-[10px] font-bold text-red-500 uppercase tracking-wide">
              Credits exhausted · Upgrade
            </span>
          )}
          {nearLimit && (
            <span className="text-[10px] font-bold text-amber-500 uppercase tracking-wide">
              Running low
            </span>
          )}
        </div>
      )}
    </div>
  );
}

export default function DashboardStats() {
  const { entitlements, loading } = useEntitlements();

  if (loading) {
    return (
      <div className="grid grid-cols-2 gap-4">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="bg-white dark:bg-zinc-900 p-5 rounded-2xl shadow-sm border border-sandal-200 dark:border-zinc-800/80 h-28 animate-pulse"
          />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-4">
      <StatCard
        icon={<Phone className="h-3.5 w-3.5 text-maroon-600 dark:text-gold-400" />}
        label="Contact Views"
        used={entitlements.contacts_used}
        limit={entitlements.contacts_limit}
        limitLabel="total"
        accentClass="luxury-gradient"
      />
      <StatCard
        icon={<Star className="h-3.5 w-3.5 text-emerald-500" />}
        label="Horoscope Reports"
        used={entitlements.horoscope_used}
        limit={entitlements.horoscope_limit}
        limitLabel="reports"
        accentClass="bg-emerald-500"
      />
      <StatCard
        icon={<FileText className="h-3.5 w-3.5 text-sky-500" />}
        label="Consultations"
        used={entitlements.consultations_used}
        limit={entitlements.consultations_limit}
        limitLabel="sessions"
        accentClass="bg-sky-500"
      />
      <div className="bg-white dark:bg-zinc-900 p-5 rounded-2xl shadow-sm border border-sandal-200 dark:border-zinc-800/80 flex flex-col justify-between text-left gap-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-sandal-50 dark:bg-zinc-800 flex items-center justify-center">
            <CalendarDays className="h-3.5 w-3.5 text-gold-500" />
          </div>
          <span className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Plan Validity</span>
        </div>
        <div className="flex flex-col gap-0.5">
          <span className="text-3xl font-mono font-black text-amber-600 dark:text-amber-400">
            {entitlements.days_remaining > 0 ? `${entitlements.days_remaining}d` : '—'}
          </span>
          <span className="text-[11px] text-zinc-400 dark:text-zinc-500">
            {entitlements.plan_name}
          </span>
        </div>
      </div>
    </div>
  );
}
