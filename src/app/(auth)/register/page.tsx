'use client';

import { Heart } from 'lucide-react';
import RegisterStepper from '@/components/register/RegisterStepper';
import { SupportSection } from '@/components/contact/SupportSection';
import Link from 'next/link';

export default function RegisterPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden bg-black py-12">
      {/* Background Image with Overlay */}
      <div 
        className="fixed inset-0 bg-cover bg-center bg-no-repeat"
        style={{ 
          backgroundImage: 'url("https://images.unsplash.com/photo-1583939000140-5e206ab6d418?q=80&w=2070&auto=format&fit=crop")',
        }}
      />
      <div className="fixed inset-0 bg-gradient-to-t from-black via-black/60 to-black/40 backdrop-blur-[2px]" />

      {/* Decorative Glows */}
      <div className="fixed top-1/4 left-1/4 w-96 h-96 bg-gold-500/20 rounded-full blur-[100px] pointer-events-none" />
      <div className="fixed bottom-1/4 right-1/4 w-96 h-96 bg-maroon-600/30 rounded-full blur-[100px] pointer-events-none" />

      {/* Floating decorative elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className="absolute text-gold-500/10 text-6xl select-none"
            style={{
              top: `${15 + i * 14}%`,
              left: `${5 + (i % 3) * 35}%`,
              transform: `rotate(${i * 30}deg)`,
              animationDelay: `${i * 0.5}s`,
            }}
          >
            ❋
          </div>
        ))}
      </div>

      <div className="relative z-10 w-full max-w-4xl px-4 flex flex-col items-center">
        {/* Branding */}
        <div className="flex flex-col items-center justify-center mb-8 gap-2">
          <Link href="/" className="flex flex-col items-center justify-center gap-2 group">
            <div className="w-14 h-14 rounded-full bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center shadow-lg group-hover:border-white/40 transition-colors">
              <Heart className="w-6 h-6 text-[#B71C1C] fill-[#B71C1C]" />
            </div>
            <div className="text-center">
              <div className="font-serif font-bold text-3xl text-white tracking-tight drop-shadow-md">
                Gokul Vivaham
              </div>
              <div className="text-[10px] font-semibold text-[#D4AF37] tracking-[0.2em] uppercase mt-1 font-sans drop-shadow-md">
                கோகுல் விவாஹம்
              </div>
            </div>
          </Link>
        </div>

        {/* Stepper Card wrapped in Glassmorphism */}
        <div className="w-full glass-panel p-4 sm:p-8 rounded-[2rem] shadow-xl text-left relative overflow-hidden mb-8">
           {/* Card Top Border Accent */}
           <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#D4AF37]/50 to-transparent" />
           <RegisterStepper />
        </div>

        <div className="w-full max-w-2xl glass-panel p-4 sm:p-6 rounded-[2rem] shadow-xl relative overflow-hidden">
           <SupportSection compact />
        </div>

        {/* Trust Indicators at bottom */}
        <div className="mt-8 flex items-center justify-center gap-6 pb-8">
          <span className="text-xs text-zinc-400 flex items-center gap-1.5 opacity-80 hover:opacity-100 transition-opacity">
            🔒 256-bit SSL
          </span>
          <span className="text-zinc-600">|</span>
          <span className="text-xs text-zinc-400 flex items-center gap-1.5 opacity-80 hover:opacity-100 transition-opacity">
            🛡️ Privacy Protected
          </span>
        </div>
      </div>
    </div>
  );
}
