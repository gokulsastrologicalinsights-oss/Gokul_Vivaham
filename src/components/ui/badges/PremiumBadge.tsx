'use client';

import { Star } from 'lucide-react';

export default function PremiumBadge({
  tier = 'Gold',
  className = '',
}: {
  tier?: 'Gold' | 'Diamond';
  className?: string;
}) {
  const isDiamond = tier === 'Diamond';

  return (
    <span
      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold text-white uppercase tracking-wider shadow select-none ${
        isDiamond
          ? 'bg-gradient-to-r from-cyan-600 to-blue-600'
          : 'bg-amber-600'
      } ${className}`}
    >
      <Star className="h-3 w-3 fill-white" />
      {tier}
    </span>
  );
}
