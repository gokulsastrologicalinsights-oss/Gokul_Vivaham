'use client';

export default function Spinner({
  size = 'md',
  color = 'maroon',
  className = '',
}: {
  size?: 'sm' | 'md' | 'lg';
  color?: 'maroon' | 'gold' | 'white';
  className?: string;
}) {
  const sizeClasses = {
    sm: 'h-4 w-4 border-2',
    md: 'h-8 w-8 border-3',
    lg: 'h-12 w-12 border-4',
  };

  const colorClasses = {
    maroon: 'border-maroon-600 dark:border-gold-450 border-t-transparent',
    gold: 'border-gold-550 border-t-transparent',
    white: 'border-white border-t-transparent',
  };

  return (
    <div
      className={`rounded-full animate-spin ${sizeClasses[size]} ${colorClasses[color]} ${className}`}
      role="status"
      aria-label="loading"
    />
  );
}
