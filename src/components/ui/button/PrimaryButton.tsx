'use client';

import { ButtonHTMLAttributes, ReactNode } from 'react';

interface PrimaryButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  loading?: boolean;
  icon?: ReactNode;
}

export default function PrimaryButton({
  children,
  loading = false,
  icon,
  className = '',
  ...props
}: PrimaryButtonProps) {
  return (
    <button
      disabled={loading || props.disabled}
      className={`h-11 px-6 rounded-full bg-brand-red text-white text-xs font-bold uppercase tracking-widest hover:bg-brand-red-light hover:shadow-lg active:scale-98 transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
      {...props}
    >
      {loading ? (
        <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
      ) : (
        <>
          {children}
          {icon && <span className="shrink-0">{icon}</span>}
        </>
      )}
    </button>
  );
}
