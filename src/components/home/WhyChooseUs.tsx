'use client';

import { Shield, Compass, Sparkles } from 'lucide-react';

export default function WhyChooseUs() {
  return (
    <section className="w-full py-16 bg-white dark:bg-zinc-950 border-y border-sandal-200/50 dark:border-zinc-800/80 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center flex flex-col gap-12">
        
        <div className="flex flex-col items-center gap-3">
          <h2 className="text-3xl md:text-4xl font-serif font-bold text-zinc-900 dark:text-zinc-50">
            Why Choose Gokul Vivaham?
          </h2>
          <div className="w-20 h-1 luxury-gradient rounded-full" />
          <p className="text-base text-zinc-650 dark:text-zinc-400 max-w-xl font-light">
            Crafted specifically for the South Indian community, combining deep-rooted traditions with modern interface convenience.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Feature 1 */}
          <div className="flex flex-col items-center p-6 rounded-2xl bg-sandal-50/50 dark:bg-zinc-900/40 border border-sandal-200/30 dark:border-zinc-800/50 hover:shadow-md transition-shadow">
            <div className="w-12 h-12 rounded-full bg-maroon-500/10 flex items-center justify-center text-maroon-600 dark:text-gold-450 mb-4">
              <Shield className="h-6 w-6" />
            </div>
            <h3 className="text-xl font-serif font-bold text-zinc-800 dark:text-zinc-200 mb-2">100% Verified Profiles</h3>
            <p className="text-sm text-zinc-600 dark:text-zinc-450 font-light leading-relaxed">
              Zero fake profiles. Mandatory ID verification and phone checks ensure security, giving you peace of mind throughout your search.
            </p>
          </div>

          {/* Feature 2 */}
          <div className="flex flex-col items-center p-6 rounded-2xl bg-sandal-50/50 dark:bg-zinc-900/40 border border-sandal-200/30 dark:border-zinc-800/50 hover:shadow-md transition-shadow">
            <div className="w-12 h-12 rounded-full bg-maroon-500/10 flex items-center justify-center text-maroon-600 dark:text-gold-450 mb-4">
              <Compass className="h-6 w-6" />
            </div>
            <h3 className="text-xl font-serif font-bold text-zinc-850 dark:text-zinc-200 mb-2">AI-Driven Compatibility</h3>
            <p className="text-sm text-zinc-600 dark:text-zinc-455 font-light leading-relaxed">
              Matches suggested based on lifestyle, values, interests, and Astro data. We evaluate compatibility comprehensively before proposing connections.
            </p>
          </div>

          {/* Feature 3 */}
          <div className="flex flex-col items-center p-6 rounded-2xl bg-sandal-50/50 dark:bg-zinc-900/40 border border-sandal-200/30 dark:border-zinc-800/50 hover:shadow-md transition-shadow">
            <div className="w-12 h-12 rounded-full bg-maroon-500/10 flex items-center justify-center text-maroon-600 dark:text-gold-455 mb-4">
              <Sparkles className="h-6 w-6" />
            </div>
            <h3 className="text-xl font-serif font-bold text-zinc-850 dark:text-zinc-200 mb-2">Horoscope Match System</h3>
            <p className="text-sm text-zinc-600 dark:text-zinc-455 font-light leading-relaxed">
              Integrated Rasi, Star, Nakshatra, and Gothram checks. Easily download, view, and match horoscopes directly from candidates' profiles.
            </p>
          </div>
        </div>

      </div>
    </section>
  );
}
