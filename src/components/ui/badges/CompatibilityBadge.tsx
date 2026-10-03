'use client';

export default function CompatibilityBadge({
  percentage,
  className = '',
}: {
  percentage: number;
  className?: string;
}) {
  const getColors = (pct: number) => {
    if (pct >= 90) return 'bg-maroon-600 text-white';
    if (pct >= 75) return 'bg-gold-600 text-white';
    return 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300';
  };

  return (
    <span
      className={`inline-flex items-center px-2 py-1 rounded-lg text-[10px] font-extrabold uppercase tracking-wider shadow select-none ${getColors(
        percentage
      )} ${className}`}
    >
      {percentage}% Match
    </span>
  );
}
