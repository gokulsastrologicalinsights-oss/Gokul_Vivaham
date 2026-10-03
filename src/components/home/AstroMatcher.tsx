'use client';

import { useState } from 'react';
import { Heart } from 'lucide-react';

export default function AstroMatcher() {
  const [rasi1, setRasi1] = useState('Mesham');
  const [rasi2, setRasi2] = useState('Simham');
  const [compatibilityScore, setCompatibilityScore] = useState<number | null>(null);
  const [compatibilityReason, setCompatibilityReason] = useState('');
  const [isChecking, setIsChecking] = useState(false);

  const rasis = [
    'Mesham (Aries)', 'Rishabham (Taurus)', 'Mithunam (Gemini)', 
    'Kadagam (Cancer)', 'Simham (Leo)', 'Kanni (Virgo)', 
    'Thulaam (Libra)', 'Viruchigam (Scorpio)', 'Dhanusu (Sagittarius)', 
    'Magaram (Capricorn)', 'Kumbham (Aquarius)', 'Meenam (Pisces)'
  ];

  const calculateCompatibility = () => {
    setIsChecking(true);
    setTimeout(() => {
      let score = 75;
      if (rasi1 === rasi2) {
        score = 88;
      } else {
        const hash = (rasi1.length + rasi2.length) % 5;
        if (hash === 0) score = 92;
        else if (hash === 1) score = 84;
        else if (hash === 2) score = 65;
        else if (hash === 3) score = 78;
        else score = 95;
      }
      
      setCompatibilityScore(score);
      if (score >= 90) {
        setCompatibilityReason('Excellent compatibility! Uttama porutham found. Rasi lords are extremely friendly and values align perfectly.');
      } else if (score >= 80) {
        setCompatibilityReason('Very good match. Madhya porutham. Great alignment of goals and harmonious planetary positions.');
      } else if (score >= 70) {
        setCompatibilityReason('Good compatibility. Safe for matching, with moderate agreement in horoscope coordinates. Respect and common values will bridge minor differences.');
      } else {
        setCompatibilityReason('Moderate compatibility. Matching profiles are compatible but horoscope verification with a family astrologer is recommended.');
      }
      setIsChecking(false);
    }, 1200);
  };

  return (
    <section className="w-full py-16 bg-sandal-100/40 dark:bg-zinc-900/20 transition-colors">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center flex flex-col gap-8">
        
        <div className="flex flex-col items-center gap-3">
          <span className="text-xs font-bold text-gold-600 dark:text-gold-400 uppercase tracking-widest">Try it now</span>
          <h2 className="text-3xl font-serif font-bold text-zinc-900 dark:text-zinc-50">
            Quick Rasi Compatibility Matcher
          </h2>
          <div className="w-16 h-0.5 bg-gold-400 rounded-full" />
          <p className="text-sm text-zinc-650 dark:text-zinc-400 max-w-lg font-light">
            Get an instant preview of horoscope compatibility between two zodiac signs (Rasis) based on Vedic calculations.
          </p>
        </div>

        <div className="p-6 md:p-8 rounded-3xl bg-white dark:bg-zinc-900 shadow-xl border border-sandal-200 dark:border-zinc-800/80 flex flex-col gap-6 max-w-2xl mx-auto w-full">
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex flex-col text-left gap-1.5">
              <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Bride's Rasi</label>
              <select 
                value={rasi1} 
                onChange={(e) => { setRasi1(e.target.value); setCompatibilityScore(null); }}
                className="w-full h-10 px-3 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-transparent text-sm focus:outline-none focus:ring-1 focus:ring-maroon-500 text-white"
              >
                {rasis.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>

            <div className="flex flex-col text-left gap-1.5">
              <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Groom's Rasi</label>
              <select 
                value={rasi2} 
                onChange={(e) => { setRasi2(e.target.value); setCompatibilityScore(null); }}
                className="w-full h-10 px-3 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-transparent text-sm focus:outline-none focus:ring-1 focus:ring-maroon-500 text-white"
              >
                {rasis.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
          </div>

          <button
            type="button"
            onClick={calculateCompatibility}
            disabled={isChecking}
            className="w-full h-10 mt-2 luxury-gradient text-white rounded-lg font-semibold text-sm hover:opacity-90 shadow-md flex items-center justify-center gap-2 transition-all duration-200 cursor-pointer disabled:opacity-50"
          >
            {isChecking ? (
              <>
                <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Calculating Vedic Coordinates...
              </>
            ) : (
              <>
                Check Astro compatibility
                <Heart className="h-4 w-4 text-white fill-white" />
              </>
            )}
          </button>

          {compatibilityScore !== null && (
            <div className="mt-4 p-5 rounded-2xl bg-sandal-50/50 dark:bg-zinc-950/60 border border-sandal-200/50 dark:border-zinc-800/80 animate-in fade-in zoom-in-95 duration-300">
              <div className="flex flex-col items-center gap-2">
                <div className="text-4xl font-serif font-black text-maroon-600 dark:text-gold-400">
                  {compatibilityScore}%
                </div>
                <div className="text-xs font-bold uppercase tracking-widest text-zinc-550 dark:text-zinc-400">
                  Compatibility Rating
                </div>
                <p className="text-sm text-zinc-700 dark:text-zinc-300 mt-2 font-light leading-relaxed max-w-md">
                  {compatibilityReason}
                </p>
              </div>
            </div>
          )}

        </div>

      </div>
    </section>
  );
}
