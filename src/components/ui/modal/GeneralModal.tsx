'use client';
import { ReactNode } from 'react';

export default function GeneralModal({ isOpen, onClose, children }: { isOpen: boolean; onClose: () => void; children: ReactNode }) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white p-6 rounded-3xl shadow-xl max-w-md w-full relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-zinc-400 text-xs font-bold">Close</button>
        <div className="mt-2">{children}</div>
      </div>
    </div>
  );
}
