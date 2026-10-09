'use client';

import { MessageCircle } from 'lucide-react';
import { contactConfig } from '@/config/contact.config';
import { usePathname } from 'next/navigation';

export function WhatsAppFloatingButton() {
  const pathname = usePathname();

  if (pathname?.startsWith('/admin') || pathname?.startsWith('/dashboard/chat')) {
    return null;
  }

  return (
    <a
      href={contactConfig.whatsapp.link}
      target="_blank"
      rel="noopener noreferrer"
      className="fixed bottom-[calc(5rem+env(safe-area-inset-bottom))] right-4 z-50 flex items-center justify-center rounded-full border border-emerald-500/20 bg-emerald-600 p-3.5 text-white shadow-2xl transition-all duration-300 group hover:scale-110 hover:bg-emerald-700 active:scale-95 cursor-pointer lg:bottom-6 lg:right-6"
      aria-label="Chat with us on WhatsApp"
    >
      <span className="absolute inset-0 rounded-full bg-emerald-600 animate-ping opacity-20 group-hover:animate-none pointer-events-none" />
      
      <MessageCircle className="h-6 w-6 sm:h-6.5 sm:w-6.5 fill-current shrink-0" />
      
      <span className="max-w-0 overflow-hidden group-hover:max-w-xs group-hover:ml-2 whitespace-nowrap text-xs font-bold tracking-wide transition-all duration-300 ease-in-out font-sans uppercase">
        Support
      </span>
    </a>
  );
}
