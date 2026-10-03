'use client';
import { ReactNode } from 'react';

export default function MatchGrid({ children }: { children: ReactNode }) {
  return <div className="grid grid-cols-1 md:grid-cols-3 gap-6">{children}</div>;
}
