'use client';
import { ReactNode } from 'react';

export default function RegistrationLayout({ children }: { children: ReactNode }) {
  return <div className="max-w-2xl mx-auto py-8">{children}</div>;
}
