'use client';
import { ReactNode } from 'react';

export default function AuthLayout({ children }: { children: ReactNode }) {
  return <div className="flex min-h-screen w-full items-center justify-center bg-zinc-50 px-4 py-8">{children}</div>;
}
