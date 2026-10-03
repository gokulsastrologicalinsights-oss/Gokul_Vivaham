'use client';

import { useSuccessStories } from '@/hooks/useSuccessStories';
import { Heart, Loader2 } from 'lucide-react';

const fallbackStories = [
  {
    id: 'fallback-1',
    name: 'Arvind & Soundarya',
    date: 'Married Nov 2025',
    compatibility: 'Simham Rasi & Simham Rasi (92% Score)',
    text: '"We found each other within two weeks of registering. The Rasi matching tool gave us a confidence boost, and once our families met, everything clicked seamlessly. Highly recommend Gokul Vivaham!"',
    image_url: null
  },
  {
    id: 'fallback-2',
    name: 'Sathish & Priya',
    date: 'Married Feb 2026',
    compatibility: 'Kanni Rasi & Rishabham Rasi (88% Score)',
    text: '"Education and work location compatibility was extremely important for both of us. The search filters on Gokul Vivaham allowed us to find matching profiles instantly. Thank you so much!"',
    image_url: null
  },
  {
    id: 'fallback-3',
    name: 'Karthik & Deepa',
    date: 'Married Apr 2026',
    compatibility: 'Viruchigam Rasi & Kadagam Rasi (95% Score)',
    text: '"Finding someone who matches your values is rare. Gokul Vivaham\'s detailed personal, family, and horoscope matching was accurate. We are happily married and credit this premium platform."',
    image_url: null
  }
];

export default function SuccessStories() {
  const { data: dbStories = [], isLoading: loading, error } = useSuccessStories();

  // Combine DB approved stories and append fallbacks if total is less than 3
  const displayStories = [...dbStories];
  if (displayStories.length < 3) {
    fallbackStories.forEach(fs => {
      if (displayStories.length < 3) {
        // Avoid adding duplicate placeholder names if they somehow match
        if (!displayStories.some(s => s.name === fs.name)) {
          displayStories.push(fs);
        }
      }
    });
  }

  return (
    <section className="w-full py-16 bg-sandal-100/40 dark:bg-zinc-900/20 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center flex flex-col gap-12">
        
        <div className="flex flex-col items-center gap-3">
          <h2 className="text-3xl font-serif font-bold text-zinc-900 dark:text-zinc-50">
            Gokul Success Stories
          </h2>
          <div className="w-16 h-1 luxury-gradient rounded-full" />
          <p className="text-sm text-zinc-655 dark:text-zinc-400 max-w-xl font-light">
            Couples who discovered their perfect compatibility through our platform.
          </p>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center p-12 text-zinc-500 text-xs font-mono gap-2">
            <Loader2 className="h-6 w-6 text-maroon-600 animate-spin" />
            <span>Loading stories...</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {displayStories.map((story, i) => (
              <div key={i} className="bg-white dark:bg-zinc-900 p-6 rounded-2xl shadow-md border border-sandal-200 dark:border-zinc-800 text-left flex flex-col gap-4 hover:scale-[1.01] hover:shadow-lg transition-all duration-300 animate-fade-in animate-in duration-200">
                <div className="w-full h-48 rounded-xl bg-gradient-to-tr from-rose-100 to-amber-100 dark:from-zinc-850 dark:to-zinc-800 flex items-center justify-center relative overflow-hidden border border-zinc-100 dark:border-zinc-800/80">
                  {story.image_url ? (
                    <img src={story.image_url} alt={story.name} className="w-full h-full object-cover" />
                  ) : (
                    <Heart className="h-16 w-16 text-maroon-500/30 animate-pulse" />
                  )}
                  <span className="absolute bottom-4 left-4 bg-white/95 dark:bg-zinc-900/95 px-3 py-1 rounded-full text-xs font-semibold text-zinc-700 dark:text-zinc-300 shadow-sm">
                    {story.date}
                  </span>
                </div>
                <div>
                  <h4 className="text-lg font-serif font-bold text-zinc-805 dark:text-zinc-200 truncate">
                    {story.name}
                  </h4>
                  <p className="text-xs text-gold-650 dark:text-gold-450 font-semibold mb-2">{story.compatibility}</p>
                  <p className="text-sm text-zinc-600 dark:text-zinc-400 font-light leading-relaxed line-clamp-4">
                    {story.text}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}

      </div>
    </section>
  );
}
