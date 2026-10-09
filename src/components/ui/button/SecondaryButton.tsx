'use client';

import { ButtonHTMLAttributes, ReactNode } from 'react';

interface SecondaryButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  loading?: boolean;
  icon?: ReactNode;
}

export default function SecondaryButton({
  children,
  loading = false,
  icon,
  className = '',
  ...props
}: SecondaryButtonProps) {
  return (
    <button
      disabled={loading || props.disabled}
      className={`min-h-11 h-auto max-w-full px-6 py-2 text-center leading-tight rounded-full bg-brand-gold text-zinc-950 text-xs font-bold uppercase tracking-widest hover:bg-brand-gold-soft hover:shadow-lg active:scale-98 transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
      {...props}
    >
      {loading ? (
        <div className="h-4 w-4 border-2 border-zinc-950 border-t-transparent rounded-full animate-spin" />
      ) : (
        <>
          {children}
          {icon && <span className="shrink-0">{icon}</span>}
        </>
      )}
    </button>
  );
}
