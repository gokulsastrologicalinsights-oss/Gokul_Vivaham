'use client';
import { ReactNode } from 'react';

export default function Dropdown({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="relative inline-block text-left">
      <button className="px-4 py-2 bg-white border rounded-lg text-xs font-semibold">{label}</button>
      <div className="absolute right-0 mt-2 w-56 rounded-md shadow-lg bg-white hidden">{children}</div>
    </div>
  );
}
