'use client';

import { ButtonHTMLAttributes, ReactNode } from 'react';

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  loading?: boolean;
}

export default function IconButton({
  children,
  loading = false,
  className = '',
  ...props
}: IconButtonProps) {
  return (
    <button
      disabled={loading || props.disabled}
      className={`w-10 h-10 rounded-full border border-zinc-200 dark:border-zinc-800 flex items-center justify-center text-zinc-600 dark:text-zinc-350 hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-all duration-200 cursor-pointer disabled:opacity-50 touch-target ${className}`}
      {...props}
    >
      {loading ? (
        <div className="h-4 w-4 border-2 border-zinc-400 border-t-transparent rounded-full animate-spin" />
      ) : (
        children
      )}
    </button>
  );
}
