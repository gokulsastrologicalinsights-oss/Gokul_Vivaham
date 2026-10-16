'use client';

import BrandLogo from '@/components/BrandLogo';
import Link from 'next/link';
import LoginForm from '@/components/auth/LoginForm';

export default function Login() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden bg-black">
      {/* Background Image with Overlay */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ 
          backgroundImage: 'url("https://images.unsplash.com/photo-1583939000140-5e206ab6d418?q=80&w=2070&auto=format&fit=crop")',
        }}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-black/40 backdrop-blur-[2px]" />

      {/* Decorative Glows */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-gold-500/20 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-maroon-600/30 rounded-full blur-[100px] pointer-events-none" />

      {/* Floating decorative elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
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

      <div className="relative z-10 w-full max-w-md px-4 flex flex-col items-center">
        {/* Branding */}
        <Link href="/" className="brand-home-link brand-plaque mb-8" aria-label="Gokul Vivaham home">
          <BrandLogo size="large" />
        </Link>

        <LoginForm />

        {/* Trust Indicators at bottom */}
        <div className="mt-8 flex items-center justify-center gap-6">
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
