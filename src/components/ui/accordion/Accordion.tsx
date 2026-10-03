'use client';
import { ReactNode } from 'react';

export default function Accordion({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="border border-zinc-200 rounded-xl overflow-hidden">
      <div className="p-4 bg-zinc-50 font-semibold text-xs cursor-pointer">{title}</div>
      <div className="p-4 border-t border-zinc-200 text-xs font-light">{children}</div>
    </div>
  );
}
