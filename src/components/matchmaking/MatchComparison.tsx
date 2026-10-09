'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Heart, HeartOff, Table, ArrowRight, Unlock } from 'lucide-react';

interface ShortlistedProfile {
  id: string;
  name: string;
  age: number;
  height: string;
  education: string;
  location: string;
  rasi: string;
  star: string;
  caste: string;
  score: number;
}

interface MatchComparisonProps {
  shortlisted: ShortlistedProfile[];
  onRemove: (id: string, name: string) => void;
  unlockedProfiles?: Set<string>;
}

export default function MatchComparison({ shortlisted, onRemove, unlockedProfiles = new Set() }: MatchComparisonProps) {
  // Comparison State
  const [compareMode, setCompareMode] = useState(false);

  return (
    <div className="flex flex-col gap-6 text-left w-full">
      {/* Compare Mode Toggle Bar */}
      {shortlisted.length > 1 && (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => setCompareMode(!compareMode)}
            className="flex items-center gap-1.5 px-4 h-9 rounded-lg border border-maroon-500/20 text-maroon-700 dark:text-gold-450 text-xs font-bold uppercase tracking-wider hover:bg-maroon-500/5 transition-all cursor-pointer"
          >
            <Table className="h-4 w-4" />
            {compareMode ? 'Show Cards List' : 'Compare Side-by-Side'}
          </button>
        </div>
      )}

      {compareMode ? (
        /* COMPARISON TABLE VIEW */
        <div className="bg-white dark:bg-zinc-900 rounded-3xl p-6 shadow-xl border border-sandal-200 dark:border-zinc-800/80 overflow-x-auto animate-in fade-in duration-300">
          <table className="w-full text-xs text-left text-zinc-700 dark:text-zinc-350 border-collapse">
            <thead>
              <tr className="border-b border-zinc-200 dark:border-zinc-850 font-serif text-sm font-bold text-zinc-900 dark:text-white">
                <th className="py-4 pr-4">Criteria</th>
                {shortlisted.map(p => (
                  <th key={p.id} className="py-4 px-4 text-center border-l border-zinc-100 dark:border-zinc-850">
                    {p.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-150 dark:divide-zinc-850 font-light">
              <tr>
                <td className="py-3 font-semibold text-zinc-900 dark:text-zinc-200">Profile ID</td>
                {shortlisted.map(p => (
                  <td key={p.id} className="py-3 text-center border-l border-zinc-100 dark:border-zinc-850 font-mono text-[10px]">
                    {p.id}
                  </td>
                ))}
              </tr>
              <tr>
                <td className="py-3 font-semibold text-zinc-900 dark:text-zinc-200">Compatibility Score</td>
                {shortlisted.map(p => (
                  <td key={p.id} className="py-3 text-center border-l border-zinc-100 dark:border-zinc-850 font-bold text-maroon-600 dark:text-gold-450">
                    {p.score}% Match
                  </td>
                ))}
              </tr>
              <tr>
                <td className="py-3 font-semibold text-zinc-900 dark:text-zinc-200">Contact Status</td>
                {shortlisted.map(p => (
                  <td key={p.id} className="py-3 text-center border-l border-zinc-100 dark:border-zinc-850 font-medium">
                    {unlockedProfiles.has(p.id) ? (
                      <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-450 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded inline-flex items-center gap-0.5">
                        <Unlock className="h-2.5 w-2.5" /> Unlocked
                      </span>
                    ) : (
                      <span className="text-[10px] text-zinc-400 font-light italic">Locked</span>
                    )}
                  </td>
                ))}
              </tr>
              <tr>
                <td className="py-3 font-semibold text-zinc-900 dark:text-zinc-200">Age / Height</td>
                {shortlisted.map(p => (
                  <td key={p.id} className="py-3 text-center border-l border-zinc-100 dark:border-zinc-850">
                    {p.age} yrs / {p.height}
                  </td>
                ))}
              </tr>
              <tr>
                <td className="py-3 font-semibold text-zinc-900 dark:text-zinc-200">Star / Rasi</td>
                {shortlisted.map(p => (
                  <td key={p.id} className="py-3 text-center border-l border-zinc-100 dark:border-zinc-850">
                    {p.star} / {p.rasi} Rasi
                  </td>
                ))}
              </tr>
              <tr>
                <td className="py-3 font-semibold text-zinc-900 dark:text-zinc-200">Caste / Sub-caste</td>
                {shortlisted.map(p => (
                  <td key={p.id} className="py-3 text-center border-l border-zinc-100 dark:border-zinc-850">
                    {p.caste}
                  </td>
                ))}
              </tr>
              <tr>
                <td className="py-3 font-semibold text-zinc-900 dark:text-zinc-200">Profession Details</td>
                {shortlisted.map(p => (
                  <td key={p.id} className="py-3 text-center border-l border-zinc-100 dark:border-zinc-850 font-medium">
                    {p.education}
                  </td>
                ))}
              </tr>
              <tr>
                <td className="py-3 font-semibold text-zinc-900 dark:text-zinc-200">Work Location</td>
                {shortlisted.map(p => (
                  <td key={p.id} className="py-3 text-center border-l border-zinc-100 dark:border-zinc-850">
                    {p.location}
                  </td>
                ))}
              </tr>
              <tr className="border-t border-zinc-200 dark:border-zinc-800">
                <td className="py-4 font-semibold text-zinc-900 dark:text-zinc-200">Actions</td>
                {shortlisted.map(p => (
                  <td key={p.id} className="py-4 px-4 text-center border-l border-zinc-100 dark:border-zinc-850">
                    <div className="flex flex-col gap-2 max-w-xs mx-auto">
                      <Link
                        href={`/dashboard/matches?id=${p.id}`}
                        className="py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-55 dark:hover:bg-zinc-800 text-[10px] uppercase font-bold tracking-wider text-center"
                      >
                        Full Profile
                      </Link>
                      <button
                        type="button"
                        onClick={() => onRemove(p.id, p.name)}
                        className="py-1.5 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500/15 text-[10px] uppercase font-bold tracking-wider cursor-pointer"
                      >
                        Remove Bookmark
                      </button>
                    </div>
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      ) : (
        /* CARD DECK LIST VIEW */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in duration-300">
          {shortlisted.map((profile) => (
            <div
              key={profile.id}
              className="bg-white dark:bg-zinc-900 rounded-3xl p-5 shadow-md border border-sandal-200 dark:border-zinc-800/80 hover:shadow-lg transition-shadow flex flex-col justify-between"
            >
              <div className="flex flex-col gap-3 text-left">
                {/* Photo place */}
                <div className="w-full h-32 rounded-2xl bg-gradient-to-tr from-sandal-100 to-amber-50 dark:from-zinc-850 dark:to-zinc-800 flex items-center justify-center relative">
                  <Heart className="h-8 w-8 text-maroon-500/10" />
                  <div className="absolute bottom-2.5 right-2.5 px-2.5 py-0.5 rounded bg-white/95 dark:bg-zinc-900/95 text-xs font-semibold text-maroon-700 dark:text-gold-450">
                    {profile.score}% Score
                  </div>
                </div>

                <div className="flex flex-col text-left">
                  <h3 className="text-base font-serif font-bold text-zinc-900 dark:text-zinc-50 flex items-center justify-between gap-1.5 flex-wrap">
                    <span>{profile.name}</span>
                    {unlockedProfiles.has(profile.id) && (
                      <span className="text-[9px] font-bold text-emerald-700 dark:text-emerald-450 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                        <Unlock className="h-2.5 w-2.5" /> Unlocked
                      </span>
                    )}
                  </h3>
                  <span className="text-[10px] text-zinc-400 font-mono mt-0.5">{profile.id}</span>
                </div>

                <ul className="space-y-1 text-xs text-zinc-650 dark:text-zinc-400 font-light text-left">
                  <li>{profile.age} yrs • {profile.height}</li>
                  <li className="truncate">{profile.education}</li>
                  <li>{profile.location}</li>
                  <li className="font-semibold text-gold-600 dark:text-gold-400 mt-1.5 uppercase text-[9px] tracking-wider">
                    {profile.rasi} Rasi • {profile.star}
                  </li>
                </ul>
              </div>

              <div className="mt-5 pt-3.5 border-t border-zinc-100 dark:border-zinc-850 flex justify-between items-center gap-2">
                <button
                  type="button"
                  onClick={() => onRemove(profile.id, profile.name)}
                  className="p-2 rounded-lg border border-red-500/10 text-red-500 hover:bg-red-500/5 transition-colors cursor-pointer"
                  title="Remove Bookmark"
                >
                  <HeartOff className="h-4.5 w-4.5" />
                </button>
                <Link
                  href={`/dashboard/matches?id=${profile.id}`}
                  className="flex-1 py-2 text-center rounded-lg border border-zinc-200 dark:border-zinc-850 text-xs font-semibold text-zinc-600 dark:text-zinc-350 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
                >
                  View details
                </Link>
                <Link
                  href={`/dashboard/matches?id=${profile.id}`}
                  className="flex-1 rounded-lg luxury-gradient py-2 text-center text-xs font-semibold text-white shadow transition-all hover:opacity-90"
                >
                  Connect from Profile
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
