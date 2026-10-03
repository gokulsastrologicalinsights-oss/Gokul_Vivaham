'use client';

import { ReactNode } from 'react';

export default function Alert({ title, children, type = 'info' }: { title: string; children: ReactNode; type?: 'info' | 'warning' | 'error' }) {
  const colors = {
    info: 'bg-surface border-border text-foreground',
    warning: 'bg-warning/10 border-warning/25 text-warning',
    error: 'bg-destructive/10 border-destructive/25 text-destructive'
  };
  return (
    <div className={`p-4 border rounded-2xl ${colors[type]} transition-colors duration-200`}>
      <h4 className="font-bold text-xs uppercase tracking-wider">{title}</h4>
      <div className="mt-1.5 text-[11px] font-light leading-relaxed">{children}</div>
    </div>
  );
}
