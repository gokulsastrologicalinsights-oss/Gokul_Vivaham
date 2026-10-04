'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Sparkles, ArrowRight, CheckCircle2, Shield, Heart } from 'lucide-react';

export default function HeroSection() {
  const router = useRouter();
  
  // Search state
  const [gender, setGender] = useState('Male');
  const [ageMin, setAgeMin] = useState('21');
  const [ageMax, setAgeMax] = useState('30');
  const [religion, setReligion] = useState('Hindu');
  const [caste, setCaste] = useState('');

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    router.push(`/dashboard/matches?gender=${gender}&ageMin=${ageMin}&ageMax=${ageMax}&religion=${religion}&caste=${caste}`);
  };

  return (
    <section className="relative w-full overflow-hidden py-16 md:py-24 bg-gradient-to-br from-sandal-50 via-white to-gold-50/30 dark:from-zinc-950 dark:via-zinc-900 dark:to-zinc-900/60 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
        
        {/* Hero text and search widget */}
        <div className="lg:col-span-7 flex flex-col gap-6 text-left">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-maroon-55 dark:bg-maroon-950/20 border border-maroon-100 dark:border-maroon-900/30 text-maroon-700 dark:text-gold-450 text-xs font-semibold tracking-wider uppercase max-w-max">
            <Sparkles className="h-3.5 w-3.5 animate-pulse text-gold-500" />
            Premium South Indian Matrimony
          </div>

          <h1 className="text-4xl md:text-5xl lg:text-6xl font-serif font-black tracking-tight text-zinc-900 dark:text-zinc-50 leading-[1.15]">
            Where Matches Begin with <span className="text-maroon-600 dark:text-gold-400 underline decoration-gold-400/50 decoration-wavy underline-offset-4">Compatibility</span>
          </h1>
          
          <p className="text-lg md:text-xl text-zinc-650 dark:text-zinc-400 font-light leading-relaxed max-w-xl">
            Connecting modern hearts with traditional roots. Discover verified profiles matching your caste, star, profession, and compatibility ideals.
          </p>

          {/* Quick Search Widget */}
          <form 
            onSubmit={handleSearch}
            className="mt-4 p-5 md:p-6 rounded-2xl bg-white dark:bg-zinc-900 shadow-xl border border-sandal-200/60 dark:border-zinc-800/80 grid grid-cols-2 md:grid-cols-4 gap-4 max-w-3xl"
          >
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Looking for</label>
              <select 
                value={gender} 
                onChange={(e) => setGender(e.target.value)}
                className="w-full h-10 px-3 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-transparent text-sm focus:outline-none focus:ring-1 focus:ring-maroon-500 text-white"
              >
                <option value="Male">Groom (Bride-to-be)</option>
                <option value="Female">Bride (Groom-to-be)</option>
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Age Range</label>
              <div className="flex items-center gap-1">
                <select 
                  value={ageMin} 
                  onChange={(e) => setAgeMin(e.target.value)}
                  className="w-full h-10 px-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-transparent text-sm focus:outline-none focus:ring-1 focus:ring-maroon-500 text-white"
                >
                  {[...Array(53)].map((_, i) => (
                    <option key={i + 18} value={i + 18}>{i + 18}</option>
                  ))}
                </select>
                <span className="text-zinc-400 text-xs">to</span>
                <select 
                  value={ageMax} 
                  onChange={(e) => setAgeMax(e.target.value)}
                  className="w-full h-10 px-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-transparent text-sm focus:outline-none focus:ring-1 focus:ring-maroon-500 text-white"
                >
                  {[...Array(53)].map((_, i) => (
                    <option key={i + 18} value={i + 18}>{i + 18}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex flex-col gap-1.5 col-span-2 md:col-span-1">
              <label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Religion</label>
              <select 
                value={religion} 
                onChange={(e) => setReligion(e.target.value)}
                className="w-full h-10 px-3 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-transparent text-sm focus:outline-none focus:ring-1 focus:ring-maroon-500 text-white"
              >
                <option value="Hindu">Hindu</option>
                <option value="Christian">Christian</option>
                <option value="Muslim">Muslim</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <button 
              type="submit"
              className="col-span-2 md:col-span-1 h-10 self-end luxury-gradient text-white rounded-lg font-semibold text-sm hover:opacity-90 shadow-md flex items-center justify-center gap-1.5 transition-all duration-200 cursor-pointer"
            >
              Find Matches
              <ArrowRight className="h-4 w-4" />
            </button>
          </form>

          <div className="flex flex-wrap items-center gap-6 mt-4 text-sm text-zinc-500 dark:text-zinc-405">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
              100% Mobile Verified Profiles
            </span>
            <span className="flex items-center gap-1.5">
              <Shield className="h-4 w-4 text-emerald-600 shrink-0" />
              Data Privacy Ensured
            </span>
          </div>
        </div>

        {/* Hero Illustration / Visual Mockup */}
        <div className="lg:col-span-5 flex justify-center relative mt-12 lg:mt-0">
          <div className="relative w-72 h-[560px] sm:w-80 sm:h-[580px] md:w-96 md:h-[600px]">

            
            {/* Background gold ring */}
            <div className="absolute inset-0 rounded-full border-4 border-dashed border-gold-300/40 animate-[spin_100s_linear_infinite]" />
            
            {/* Profile Card Mock 1 */}
            <div className="absolute top-8 -left-4 w-64 p-4 rounded-2xl glass-panel shadow-lg border border-sandal-200/50 hover:translate-y-[-4px] transition-transform duration-300">
              <div className="w-full h-64 rounded-xl bg-gradient-to-tr from-sandal-200 to-rose-100/50 dark:from-zinc-800 dark:to-maroon-950/20 relative overflow-hidden flex items-center justify-center">
                <img src="/hero-portraits/bride.png" alt="AI-generated fictional bride in a wedding silk saree" width={224} height={336} className="w-full h-full object-cover object-top" />
                <div className="absolute top-2.5 right-2.5 px-2 py-0.5 rounded-full bg-emerald-600/90 text-[10px] font-bold text-white flex items-center gap-1 uppercase tracking-wide">
                  Sample · AI
                </div>
              </div>
              <div className="mt-3 flex flex-col text-left">
                <span className="text-base font-serif font-bold text-zinc-800 dark:text-zinc-200">Revathi S. (26)</span>
                <span className="text-xs text-zinc-500 dark:text-zinc-400">B.Tech Software Engineer • Chennai</span>
                <div className="mt-2.5 pt-2 border-t border-zinc-100 dark:border-zinc-800 flex justify-between items-center">
                  <span className="text-[10px] font-bold text-gold-600 uppercase tracking-widest">Simha Rasi • Pooram</span>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded bg-maroon-500/15 text-maroon-700 dark:text-gold-450">92% Match</span>
                </div>
              </div>
            </div>

            {/* Profile Card Mock 2 */}
            <div className="absolute bottom-6 -right-6 w-64 p-4 rounded-2xl glass-panel shadow-xl border border-gold-400/20 hover:translate-y-[-4px] transition-transform duration-300">
              <div className="w-full h-64 rounded-xl bg-gradient-to-tr from-sandal-200 to-amber-100/50 dark:from-zinc-800 dark:to-gold-950/10 relative overflow-hidden flex items-center justify-center">
                <img src="/hero-portraits/groom.png" alt="AI-generated fictional groom in traditional wedding attire" width={224} height={336} className="w-full h-full object-cover object-top" />
                <div className="absolute top-2.5 right-2.5 px-2 py-0.5 rounded-full bg-emerald-600/90 text-[10px] font-bold text-white flex items-center gap-1 uppercase tracking-wide">
                  Sample · AI
                </div>
              </div>
              <div className="mt-3 flex flex-col text-left">
                <span className="text-base font-serif font-bold text-zinc-800 dark:text-zinc-200">Gokulakrishnan M. (28)</span>
                <span className="text-xs text-zinc-500 dark:text-zinc-400">MBA Project Manager • Bangalore</span>
                <div className="mt-2.5 pt-2 border-t border-zinc-100 dark:border-zinc-800 flex justify-between items-center">
                  <span className="text-[10px] font-bold text-gold-600 uppercase tracking-widest">Dhanusu Rasi • Pooradam</span>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded bg-gold-500/20 text-gold-700 dark:text-gold-450">95% Match</span>
                </div>
              </div>
            </div>

            {/* Decorative compatibility center circle */}
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-16 h-16 rounded-full bg-white dark:bg-zinc-800 shadow-lg border border-gold-400 flex items-center justify-center animate-bounce">
              <Heart className="h-8 w-8 text-maroon-600 fill-maroon-600" />
            </div>

          </div>
        </div>

      </div>
    </section>
  );
}


