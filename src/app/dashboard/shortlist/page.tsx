'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import MatchComparison from '@/components/matchmaking/MatchComparison';

export default function Shortlist() {
  const [unlockedProfiles, setUnlockedProfiles] = useState<Set<string>>(new Set());

  useEffect(() => {
    const fetchUnlockedProfiles = async () => {
      try {
        const res = await fetch('/api/profile/contact-unlocks');
        const data = await res.json();
        if (res.ok && data.success) {
          const ids = new Set((data.unlocks || []).map((u: any) => u.profile?.profile_id).filter(Boolean) as string[]);
          setUnlockedProfiles(ids);
        }
      } catch (e) {
        console.error('Error fetching unlocked profiles:', e);
      }
    };
    fetchUnlockedProfiles();
  }, []);
  
  // Shortlisted Candidates List
  const [shortlisted, setShortlisted] = useState([
    {
      id: 'GVV-089',
      name: 'Gokulakrishnan M.',
      age: 28,
      height: '178 cm',
      education: 'MBA Project Manager',
      location: 'Bangalore',
      rasi: 'Dhanusu',
      star: 'Pooradam',
      caste: 'Iyer',
      score: 95
    },
    {
      id: 'GVV-112',
      name: 'Karthik N.',
      age: 27,
      height: '180 cm',
      education: 'B.Tech Tech Lead',
      location: 'Singapore',
      rasi: 'Simham',
      star: 'Pooram',
      caste: 'Iyer',
      score: 91
    }
  ]);

  const handleRemove = (id: string, name: string) => {
    setShortlisted(prev => prev.filter(item => item.id !== id));
    alert(`Removed ${name} from your shortlist.`);
  };

  return (
    <div className="flex flex-col gap-6 text-left">
      
      {/* Header */}
      <div className="flex justify-between items-center border-b border-zinc-100 dark:border-zinc-850 pb-4 gap-4 flex-wrap">
        <div className="flex flex-col gap-1.5 text-left">
          <h1 className="text-2xl md:text-3xl font-serif font-bold text-zinc-900 dark:text-zinc-50">
            Shortlisted Profiles
          </h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-450 font-light">
            Review and compare profiles you have bookmarked for future reference.
          </p>
        </div>
      </div>

      {shortlisted.length > 0 ? (
        <MatchComparison shortlisted={shortlisted} onRemove={handleRemove} unlockedProfiles={unlockedProfiles} />
      ) : (
        <div className="p-16 text-center text-zinc-500 font-mono text-xs border border-dashed border-zinc-200 dark:border-zinc-850 rounded-3xl bg-white dark:bg-zinc-900 shadow">
          Your bookmark list is empty. Go explore compatible profiles!
        </div>
      )}

      {/* Quick Search Redirect */}
      <Link
        href="/dashboard/matches"
        className="self-center mt-4 px-6 py-2.5 rounded-full border border-maroon-500/20 text-maroon-700 dark:text-gold-450 text-xs font-bold uppercase tracking-wider hover:bg-maroon-500/5 transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
      >
        Search Matrimony Matches <ArrowRight className="h-4 w-4" />
      </Link>

    </div>
  );
}
