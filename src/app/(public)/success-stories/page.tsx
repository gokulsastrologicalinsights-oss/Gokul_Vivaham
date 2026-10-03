'use client';

import Link from 'next/link';
import { Heart, Sparkles, CheckCircle2 } from 'lucide-react';

export default function SuccessStories() {
  const stories = [
    {
      groom: 'Arvind S.',
      bride: 'Soundarya S.',
      weddingDate: 'Nov 12, 2025',
      rasiMatch: 'Simham & Simham',
      score: 92,
      story: 'We were introduced through Gokul Vivaham in September. The alignment of our values and career directions made things very easy. The Rasi matching score was highly reassuring for our parents, and once they met, the marriage was finalized with everyone’s blessing. We are extremely thankful to the platform!',
      quote: 'A perfect match is when values, goals, and stars align.'
    },
    {
      groom: 'Sathish Kumar M.',
      bride: 'Priya Narayanan',
      weddingDate: 'Feb 18, 2026',
      rasiMatch: 'Kanni & Rishabham',
      score: 88,
      story: 'Education and location compatibility were my top priorities. Priya was working as a Bank Manager in Madurai, and our preferences aligned perfectly. Once we matched, we connect over the platform chat and later shared contacts. We celebrated our wedding with family in a beautiful traditional ceremony.',
      quote: 'Simplified searching, clean interfaces, and verified contacts made our search quick!'
    },
    {
      groom: 'Karthik N.',
      bride: 'Deepa V.',
      weddingDate: 'Apr 05, 2026',
      rasiMatch: 'Viruchigam & Kadagam',
      score: 95,
      story: 'Living in Singapore, I was looking for someone willing to relocate. Deepa’s profile matched all my partner criteria. The Gothram, Rasi, and educational parameters were exactly what my family was searching for. We spoke on phone calls, and within 3 months, our families met. Gokul Vivaham was a godsend!',
      quote: 'Distance was never a barrier once the compatibility score check gave us confidence.'
    },
    {
      groom: 'Ramesh K.',
      bride: 'Abirami M.',
      weddingDate: 'May 02, 2026',
      rasiMatch: 'Thulaam & Mithunam',
      score: 90,
      story: 'We found each other through the automated recommendation list. The verified contact support helped my father initiate contact with Abirami’s family directly. They matched horoscopes, which turned out to be an excellent porutham, and the rest is history.',
      quote: 'Thank you Gokul Vivaham for a transparent, secure, and helpful experience.'
    }
  ];

  return (
    <div className="max-w-6xl mx-auto px-4 py-12 md:py-16 text-left flex flex-col gap-10">
      
      {/* Title */}
      <div className="flex flex-col items-center text-center gap-3">
        <h1 className="text-3xl md:text-4xl font-serif font-bold text-zinc-900 dark:text-zinc-50">
          Happy Marriages
        </h1>
        <span className="text-xs font-semibold text-gold-600 dark:text-gold-400 uppercase tracking-widest leading-none">
          Gokul Vivaham Success Stories • கோகுல் விவாஹம்
        </span>
        <div className="w-16 h-0.5 bg-gold-500 rounded-full mt-2" />
      </div>

      {/* Stories Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-6">
        {stories.map((story, index) => (
          <div
            key={index}
            className="bg-white dark:bg-zinc-900 rounded-3xl p-6 md:p-8 border border-sandal-200 dark:border-zinc-800 shadow-md hover:shadow-lg transition-shadow flex flex-col justify-between gap-6"
          >
            <div className="flex flex-col gap-4">
              
              {/* Couple Photo Placeholder */}
              <div className="w-full h-56 rounded-2xl bg-gradient-to-tr from-sandal-100 to-rose-50 dark:from-zinc-800 dark:to-zinc-850 flex items-center justify-center relative overflow-hidden">
                <Heart className="h-16 w-16 text-maroon-500/20" />
                <Sparkles className="absolute top-4 right-4 h-6 w-6 text-gold-500 animate-pulse" />
                
                <div className="absolute bottom-4 left-4 bg-white/95 dark:bg-zinc-900/95 px-3 py-1 rounded-full text-xs font-semibold text-zinc-700 dark:text-zinc-300 shadow">
                  Married {story.weddingDate}
                </div>
                
                <div className="absolute bottom-4 right-4 bg-maroon-500/90 text-white px-3 py-1 rounded-full text-xs font-bold shadow flex items-center gap-1">
                  <CheckCircle2 className="h-3.5 w-3.5" /> {story.score}% Match
                </div>
              </div>

              <div className="flex flex-col">
                <h3 className="text-xl font-serif font-bold text-zinc-900 dark:text-zinc-50">
                  {story.groom} &amp; {story.bride}
                </h3>
                <span className="text-xs text-gold-600 dark:text-gold-400 font-semibold uppercase mt-0.5 tracking-wider">
                  {story.rasiMatch} Rasi Match
                </span>
              </div>

              <blockquote className="border-l-2 border-gold-400 pl-4 italic text-sm text-zinc-500 dark:text-zinc-400 font-light leading-relaxed">
                "{story.quote}"
              </blockquote>

              <p className="text-sm text-zinc-650 dark:text-zinc-400 leading-relaxed font-light">
                {story.story}
              </p>
            </div>

            <div className="h-px bg-zinc-100 dark:bg-zinc-850" />
          </div>
        ))}
      </div>

      {/* Share your story Callout */}
      <div className="p-8 rounded-3xl bg-sandal-50/50 dark:bg-zinc-900/50 border border-sandal-200/40 dark:border-zinc-800/80 text-center flex flex-col items-center gap-4">
        <h3 className="text-xl font-serif font-bold text-zinc-900 dark:text-zinc-100">Found your match on Gokul Vivaham?</h3>
        <p className="text-xs text-zinc-600 dark:text-zinc-400 font-light max-w-sm leading-relaxed">
          We would love to hear your story and celebrate with you! Send us your wedding photo and story details to get highlighted.
        </p>
        <Link
          href="/contact"
          className="px-6 py-2.5 rounded-full border border-maroon-500/20 text-maroon-700 dark:text-gold-400 text-xs font-bold uppercase tracking-wider hover:bg-maroon-500/5 transition-all shadow-sm"
        >
          Share Your Story
        </Link>
      </div>

    </div>
  );
}
