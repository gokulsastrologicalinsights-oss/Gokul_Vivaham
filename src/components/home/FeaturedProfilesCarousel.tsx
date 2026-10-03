'use client';

import { useState } from 'react';
import { useFeaturedProfiles } from '@/hooks/useFeaturedProfiles';
import { Star, Sparkles, MapPin, Award, User, ChevronLeft, ChevronRight, Heart } from 'lucide-react';
import Link from 'next/link';

export default function FeaturedProfilesCarousel() {
  const { data: featured = [], isLoading: loading, error } = useFeaturedProfiles();
  const [currentSlide, setCurrentSlide] = useState(0);

  const nextSlide = () => {
    if (featured.length <= 1) return;
    setCurrentSlide((prev) => (prev + 1) % Math.ceil(featured.length / getCardsPerView()));
  };

  const prevSlide = () => {
    if (featured.length <= 1) return;
    setCurrentSlide((prev) => (prev - 1 + Math.ceil(featured.length / getCardsPerView())) % Math.ceil(featured.length / getCardsPerView()));
  };

  const getCardsPerView = () => {
    if (typeof window === 'undefined') return 3;
    if (window.innerWidth < 640) return 1;
    if (window.innerWidth < 1024) return 2;
    return 3;
  };

  if (loading) {
    return (
      <div className="w-full py-12 flex flex-col items-center justify-center gap-3 text-xs text-zinc-500 font-mono">
        <div className="h-6 w-6 border-2 border-gold-500 border-t-transparent rounded-full animate-spin" />
        <span>Loading featured members...</span>
      </div>
    );
  }

  if (error || featured.length === 0) {
    return null;
  }

  return (
    <section className="w-full py-16 bg-gradient-to-b from-sandal-100/20 to-white dark:from-zinc-900/10 dark:to-zinc-950 border-t border-sandal-200/40 dark:border-zinc-800/50 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center flex flex-col gap-10">
        
        {/* Header Block */}
        <div className="flex justify-between items-end">
          <div className="flex flex-col items-start text-left gap-2">
            <span className="text-[10px] font-bold text-gold-600 dark:text-gold-400 uppercase tracking-widest leading-none flex items-center gap-1">
              <Sparkles className="h-3 w-3 fill-gold-500" /> Premium Spotlights
            </span>
            <h2 className="text-2xl md:text-3xl font-serif font-bold text-zinc-900 dark:text-zinc-50">
              Featured Members
            </h2>
            <div className="w-12 h-1 luxury-gradient rounded-full mt-0.5" />
          </div>

          {/* Navigation Controls */}
          {featured.length > getCardsPerView() && (
            <div className="flex gap-2">
              <button 
                onClick={prevSlide}
                className="p-2 rounded-xl border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-900 text-zinc-650 dark:text-zinc-455 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors cursor-pointer focus:outline-none"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button 
                onClick={nextSlide}
                className="p-2 rounded-xl border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-900 text-zinc-650 dark:text-zinc-455 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors cursor-pointer focus:outline-none"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>

        {/* Carousel Slide Area */}
        <div className="overflow-hidden w-full">
          <div 
            className="flex transition-transform duration-500 ease-out gap-6"
            style={{ 
              transform: `translateX(-${currentSlide * (100 / Math.ceil(featured.length / getCardsPerView()))}%)`,
              width: `${Math.ceil(featured.length / getCardsPerView()) * 100}%`
            }}
          >
            {featured.map((member, index) => (
              <div 
                key={member.id}
                className="bg-white dark:bg-zinc-900 border border-sandal-200 dark:border-zinc-800 rounded-3xl p-5 shadow-md flex flex-col justify-between text-left hover:scale-[1.01] hover:shadow-lg transition-all relative overflow-hidden"
                style={{ width: `calc(${100 / featured.length}% - 16px)` }}
              >
                {/* Featured Accent Tag */}
                <div className="absolute top-0 right-6 transform -translate-y-1/2 bg-gradient-to-r from-amber-500 to-gold-550 px-2.5 py-0.5 rounded-full text-[8px] font-black text-zinc-950 uppercase tracking-widest shadow flex items-center gap-0.5 z-10 border border-gold-450">
                  <Star className="h-2 w-2 fill-zinc-950 text-zinc-950" /> Featured
                </div>

                <div className="flex flex-col gap-4">
                  {/* Photo Frame */}
                  {member.photoUrl ? (
                    <div className="w-full h-44 rounded-2xl overflow-hidden relative border border-zinc-100 dark:border-zinc-850">
                      <img 
                        src={member.photoUrl} 
                        alt={member.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ) : (
                    <div className="w-full h-44 rounded-2xl bg-gradient-to-tr from-sandal-100 to-amber-50 dark:from-zinc-800 dark:to-zinc-850 flex flex-col items-center justify-center relative text-zinc-400 dark:text-zinc-500 font-serif border border-zinc-100 dark:border-zinc-855">
                      <User className="h-12 w-12 text-maroon-500/20 dark:text-gold-500/10 mb-1" />
                      <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-widest">Photo Locked</span>
                    </div>
                  )}

                  {/* Member info details */}
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center justify-between">
                      <h4 className="text-base font-serif font-bold text-zinc-855 dark:text-zinc-100 truncate max-w-[70%]">
                        {member.name}
                      </h4>
                      <span className="text-[9px] text-zinc-400 font-mono">{member.id}</span>
                    </div>
                    <p className="text-xs font-semibold text-gold-650 dark:text-gold-450 uppercase tracking-wider mt-0.5">{member.occupation}</p>
                    
                    <ul className="text-xs text-zinc-500 dark:text-zinc-400 font-light mt-1.5 space-y-1">
                      <li className="flex items-center gap-1">
                        <MapPin className="h-3 w-3 text-zinc-400" /> {member.city}
                      </li>
                      <li className="flex items-center gap-1 text-[10px] font-semibold text-zinc-650 dark:text-zinc-450">
                        <Award className="h-3 w-3 text-zinc-400" /> {member.rasi} Rasi • {member.nakshatra}
                      </li>
                    </ul>
                  </div>
                </div>

                <div className="mt-5 pt-3.5 border-t border-zinc-100 dark:border-zinc-850 flex justify-between items-center gap-2.5">
                  <Link
                    href={`/dashboard/matches?id=${member.id}`}
                    className="flex-1 py-2 text-center rounded-lg border border-zinc-200 dark:border-zinc-855 text-xs font-semibold text-zinc-650 dark:text-zinc-355 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
                  >
                    View Details
                  </Link>
                  <button
                    onClick={() => alert(`Connect request sent to ${member.name}!`)}
                    className="px-4 py-2 rounded-lg luxury-gradient text-white text-xs font-semibold hover:opacity-90 shadow transition-all cursor-pointer flex items-center justify-center gap-1"
                  >
                    <Heart className="h-3.5 w-3.5 fill-white shrink-0" /> Connect
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </section>
  );
}
