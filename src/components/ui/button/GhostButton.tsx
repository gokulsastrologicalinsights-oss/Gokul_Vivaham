'use client';

import { ButtonHTMLAttributes, ReactNode } from 'react';

interface GhostButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  loading?: boolean;
  icon?: ReactNode;
}

export default function GhostButton({
  children,
  loading = false,
  icon,
  className = '',
  ...props
}: GhostButtonProps) {
  return (
    <button
      disabled={loading || props.disabled}
      className={`h-11 px-4 rounded-lg bg-transparent text-zinc-650 dark:text-zinc-350 text-xs font-semibold uppercase tracking-widest hover:bg-zinc-100 dark:hover:bg-zinc-800 flex items-center justify-center gap-1.5 transition-all duration-200 cursor-pointer disabled:opacity-50 ${className}`}
      {...props}
    >
      {loading ? (
        <div className="h-4 w-4 border-2 border-zinc-400 border-t-transparent rounded-full animate-spin" />
      ) : (
        <>
          {children}
          {icon && <span className="shrink-0">{icon}</span>}
        </>
      )}
    </button>
  );
}
