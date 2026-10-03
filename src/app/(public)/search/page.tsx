'use client';
import FeaturedProfilesCarousel from '@/components/home/FeaturedProfilesCarousel';

export default function SearchPage() {
  return (
    <div className="p-8 max-w-7xl mx-auto text-left flex flex-col gap-4">
      <h1 className="text-2xl font-serif font-bold text-zinc-900 dark:text-zinc-50">Search Candidates</h1>
      <p className="text-xs text-zinc-500 font-light">Custom database query checks.</p>
      
      <div className="mt-4">
        <FeaturedProfilesCarousel />
      </div>
    </div>
  );
}
