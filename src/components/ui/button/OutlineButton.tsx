'use client';

import { ButtonHTMLAttributes, ReactNode } from 'react';

interface OutlineButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  loading?: boolean;
  icon?: ReactNode;
}

export default function OutlineButton({
  children,
  loading = false,
  icon,
  className = '',
  ...props
}: OutlineButtonProps) {
  return (
    <button
      disabled={loading || props.disabled}
      className={`min-h-11 h-auto max-w-full px-6 py-2 text-center leading-tight rounded-full border border-border bg-transparent text-foreground text-xs font-bold uppercase tracking-widest hover:bg-surface hover:shadow-sm active:scale-98 transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
      {...props}
    >
      {loading ? (
        <div className="h-4 w-4 border-2 border-foreground border-t-transparent rounded-full animate-spin" />
      ) : (
        <>
          {children}
          {icon && <span className="shrink-0">{icon}</span>}
        </>
      )}
    </button>
  );
}
