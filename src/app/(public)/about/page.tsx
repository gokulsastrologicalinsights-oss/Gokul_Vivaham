'use client';

import Link from 'next/link';
import { Heart, ShieldCheck, Star, Users, CheckCircle2, Sparkles } from 'lucide-react';

export default function About() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-12 md:py-16 text-left flex flex-col gap-10">
      
      {/* Title */}
      <div className="flex flex-col items-center text-center gap-3">
        <h1 className="text-3xl md:text-4xl font-serif font-bold text-zinc-900 dark:text-zinc-50">
          About Gokul Vivaham
        </h1>
        <span className="text-xs font-semibold text-gold-600 dark:text-gold-400 uppercase tracking-widest leading-none">
          கோகுல் விவாஹம் • Where Matches Begin with Compatibility
        </span>
        <div className="w-16 h-0.5 bg-gold-500 rounded-full mt-2" />
      </div>

      {/* Intro section */}
      <div className="flex flex-col md:flex-row gap-8 items-center bg-white dark:bg-zinc-900 p-6 md:p-8 rounded-3xl border border-sandal-200 dark:border-zinc-800 shadow-md">
        <div className="flex-1 flex flex-col gap-4">
          <h2 className="text-xl md:text-2xl font-serif font-bold text-maroon-700 dark:text-gold-400">
            Our Noble Mission
          </h2>
          <p className="text-sm text-zinc-655 dark:text-zinc-400 leading-relaxed font-light">
            Founded with a vision to simplify candidate matchmaking while keeping culture intact, **Gokul Vivaham** has grown into one of the most trusted matrimonial portals for South Indian communities. We believe a marriage is not just the union of two individuals, but the coming together of two families with shared values, respect, and compatibility.
          </p>
          <p className="text-sm text-zinc-655 dark:text-zinc-400 leading-relaxed font-light">
            By blending traditional horoscope checking methods with smart digital filtering, we allow members to discover their life partners securely and efficiently.
          </p>
        </div>
        <div className="w-48 h-48 shrink-0 rounded-2xl bg-gradient-to-tr from-sandal-100 to-gold-100 dark:from-zinc-850 dark:to-maroon-950/20 flex items-center justify-center relative overflow-hidden">
          <Heart className="h-16 w-16 text-maroon-500/20" />
          <Sparkles className="absolute top-4 right-4 h-5 w-5 text-gold-500 animate-pulse" />
        </div>
      </div>

      {/* Core Values */}
      <div className="flex flex-col gap-6">
        <h3 className="text-xl font-serif font-bold text-zinc-900 dark:text-zinc-100 text-center">
          Our Foundation Pillars
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-5 rounded-2xl bg-sandal-50/30 dark:bg-zinc-900/50 border border-sandal-200/40 dark:border-zinc-800/80 flex flex-col gap-3">
            <div className="w-10 h-10 rounded-lg bg-maroon-500/10 flex items-center justify-center text-maroon-600 dark:text-gold-400">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <h4 className="text-base font-serif font-bold text-zinc-800 dark:text-zinc-200">100% Verification</h4>
            <p className="text-xs text-zinc-600 dark:text-zinc-400 font-light leading-relaxed">
              Every registration must verify their mobile details and submit identity verification prior to receiving visibility.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-sandal-50/30 dark:bg-zinc-900/50 border border-sandal-200/40 dark:border-zinc-800/80 flex flex-col gap-3">
            <div className="w-10 h-10 rounded-lg bg-maroon-500/10 flex items-center justify-center text-maroon-600 dark:text-gold-400">
              <Users className="h-5 w-5" />
            </div>
            <h4 className="text-base font-serif font-bold text-zinc-800 dark:text-zinc-200">Cultural Focus</h4>
            <p className="text-xs text-zinc-600 dark:text-zinc-400 font-light leading-relaxed">
              Tailored for Tamil, Telugu, and other South Indian communities with built-in filters for Stars, Nakshatras, Gothrams, and Rasis.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-sandal-50/30 dark:bg-zinc-900/50 border border-sandal-200/40 dark:border-zinc-800/80 flex flex-col gap-3">
            <div className="w-10 h-10 rounded-lg bg-maroon-500/10 flex items-center justify-center text-maroon-600 dark:text-gold-400">
              <Star className="h-5 w-5" />
            </div>
            <h4 className="text-base font-serif font-bold text-zinc-800 dark:text-zinc-200">Astro Match Checking</h4>
            <p className="text-xs text-zinc-600 dark:text-zinc-400 font-light leading-relaxed">
              Instantly review Rasi coordinates and download candidate horoscopes for a detailed evaluation with your family astrologer.
            </p>
          </div>
        </div>
      </div>

      {/* Trust Call to Action */}
      <div className="p-8 rounded-3xl bg-maroon-700 text-white text-center flex flex-col items-center gap-5 shadow-lg relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 rounded-full bg-white/5 translate-x-10 -translate-y-10" />
        <h3 className="text-2xl font-serif font-bold">Ready to find your companion?</h3>
        <p className="text-sm text-maroon-100 max-w-md font-light leading-relaxed">
          Create your account today and unlock compatible recommendations matching your education, location, and astrology profile.
        </p>
        <Link
          href="/register"
          onClick={() => {
            if (typeof window !== 'undefined') {
              localStorage.removeItem('gokul_matrimony_register_draft');
            }
          }}
          className="px-6 py-2.5 rounded-full bg-white text-maroon-700 text-xs font-semibold uppercase tracking-wider hover:bg-zinc-50 hover:scale-105 transition-all shadow-md"
        >
          Register Free Now
        </Link>
      </div>

    </div>
  );
}
