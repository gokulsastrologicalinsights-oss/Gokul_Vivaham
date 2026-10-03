'use client';

import { CheckCircle2 } from 'lucide-react';

export default function VerificationBadge({ className = '' }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-600/90 text-[10px] font-bold text-white uppercase tracking-wider shadow select-none ${className}`}>
      <CheckCircle2 className="h-3 w-3" />
      Verified
    </span>
  );
}
