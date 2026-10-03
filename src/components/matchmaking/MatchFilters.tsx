'use client';

import { Filter } from 'lucide-react';
import RasiStarDropdowns from '../ui/input/RasiStarDropdowns';
import ReligionCommunityDropdowns from '../ui/input/ReligionCommunityDropdowns';

interface MatchFiltersProps {
  gender: string;
  setGender: (v: string) => void;
  ageMin: number;
  setAgeMin: (v: number) => void;
  ageMax: number;
  setAgeMax: (v: number) => void;
  religion: string;
  setReligion: (v: string) => void;
  caste: string;
  setCaste: (v: string) => void;
  rasi: string;
  setRasi: (v: string) => void;
  star: string;
  setStar: (v: string) => void;
  padam: string;
  setPadam: (v: string) => void;
  location: string;
  setLocation: (v: string) => void;
  profession: string;
  setProfession: (v: string) => void;
  onClearAll: () => void;
  isPremium?: boolean;
  onUpgradePrompt?: () => void;
}

export default function MatchFilters({
  gender,
  setGender,
  ageMin,
  setAgeMin,
  ageMax,
  setAgeMax,
  religion,
  setReligion,
  caste,
  setCaste,
  rasi,
  setRasi,
  star,
  setStar,
  padam,
  setPadam,
  location,
  setLocation,
  profession,
  setProfession,
  onClearAll,
  isPremium = false,
  onUpgradePrompt
}: MatchFiltersProps) {
  return (
    <aside className="bg-white dark:bg-zinc-900 p-5 rounded-3xl shadow-md border border-sandal-200 dark:border-zinc-800/80 flex flex-col gap-5 lg:col-span-4 sticky top-24 text-left">
      <div className="flex justify-between items-center border-b border-zinc-100 dark:border-zinc-850 pb-3">
        <span className="text-sm font-serif font-bold text-zinc-855 dark:text-zinc-200 flex items-center gap-1.5">
          <Filter className="h-4.5 w-4.5 text-maroon-600 dark:text-gold-450" />
          Refine Search
        </span>
        <button
          type="button"
          onClick={onClearAll}
          className="text-[10px] font-bold text-maroon-600 dark:text-gold-400 hover:underline uppercase tracking-wider cursor-pointer"
        >
          Clear All
        </button>
      </div>

      <div className="flex flex-col gap-4 text-xs font-semibold text-zinc-500 dark:text-zinc-450">
        
        {/* Gender Toggle */}
        <div className="flex flex-col gap-1.5">
          <label className="uppercase tracking-wider">Looking for</label>
          <div className="grid grid-cols-2 gap-2 bg-sandal-50/50 dark:bg-zinc-950 p-1 rounded-lg">
            <button
              type="button"
              onClick={() => setGender('Female')}
              className={`py-1.5 rounded font-bold uppercase transition-all cursor-pointer ${
                gender === 'Female' 
                  ? 'bg-white dark:bg-zinc-800 text-maroon-600 dark:text-gold-450 shadow-sm' 
                  : 'text-zinc-400'
              }`}
            >
              Bride
            </button>
            <button
              type="button"
              onClick={() => setGender('Male')}
              className={`py-1.5 rounded font-bold uppercase transition-all cursor-pointer ${
                gender === 'Male' 
                  ? 'bg-white dark:bg-zinc-800 text-maroon-600 dark:text-gold-450 shadow-sm' 
                  : 'text-zinc-400'
              }`}
            >
              Groom
            </button>
          </div>
        </div>

        {/* Age Range */}
        <div className="flex flex-col gap-1.5">
          <label className="uppercase tracking-wider">Age Bracket: {ageMin} to {ageMax}</label>
          <div className="flex items-center gap-2">
            <input 
              type="range" 
              min={18} 
              max={60} 
              value={ageMin}
              onChange={(e) => setAgeMin(Math.min(parseInt(e.target.value), ageMax))}
              className="w-full accent-maroon-600"
            />
            <input 
              type="range" 
              min={18} 
              max={60} 
              value={ageMax}
              onChange={(e) => setAgeMax(Math.max(parseInt(e.target.value), ageMin))}
              className="w-full accent-maroon-600"
            />
          </div>
        </div>

        <ReligionCommunityDropdowns
          religion={religion}
          community={caste}
          onReligionChange={(v) => {
            setReligion(v);
            setCaste('');
          }}
          onCommunityChange={(v) => setCaste(v)}
          isPremiumGated={!isPremium}
          onUpgradePrompt={onUpgradePrompt}
          allowAllReligionsOption={true}
          allowAllCommunitiesOption={true}
          selectClassName="w-full h-10 px-2.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-transparent text-xs focus:outline-none text-zinc-700 dark:text-zinc-300 dark:bg-zinc-900"
          labelClassName="uppercase tracking-wider flex justify-between items-center text-xs font-semibold text-zinc-550 dark:text-zinc-450"
        />

        <RasiStarDropdowns
          rasi={rasi}
          nakshatra={star}
          padam={padam}
          onRasiChange={setRasi}
          onNakshatraChange={setStar}
          onPadamChange={setPadam}
          isPremiumGated={!isPremium}
          onUpgradePrompt={onUpgradePrompt}
          selectClassName={`w-full h-10 px-2.5 rounded-lg border bg-transparent text-xs focus:outline-none ${
            isPremium 
              ? "border-zinc-200 dark:border-zinc-800 text-zinc-850 dark:text-zinc-300 dark:bg-zinc-900" 
              : "border-zinc-150 dark:border-zinc-850/50 text-zinc-400 dark:text-zinc-550 cursor-pointer bg-zinc-50/50 dark:bg-zinc-950/20"
          }`}
          labelClassName="uppercase tracking-wider flex justify-between items-center text-xs font-semibold text-zinc-500 dark:text-zinc-450"
        />

        {/* Location */}
        <div className="flex flex-col gap-1.5">
          <label className="uppercase tracking-wider flex justify-between items-center">
            Work Location
            {!isPremium && <span className="text-[9px] text-gold-600 font-bold uppercase tracking-wider">Premium</span>}
          </label>
          <div className="relative" onClick={() => !isPremium && onUpgradePrompt?.()}>
            <input
              type="text"
              placeholder={isPremium ? "e.g. Bangalore, Chennai" : "🔒 Premium Gated"}
              value={isPremium ? location : ""}
              onChange={(e) => isPremium && setLocation(e.target.value)}
              disabled={!isPremium}
              className={`w-full h-10 px-3 rounded-lg border bg-transparent text-xs focus:outline-none ${
                isPremium 
                  ? "border-zinc-200 dark:border-zinc-800 text-zinc-850 dark:text-zinc-150" 
                  : "border-zinc-150 dark:border-zinc-850/50 text-zinc-400 dark:text-zinc-550 cursor-pointer bg-zinc-50/50 dark:bg-zinc-950/20"
              }`}
            />
          </div>
        </div>

        {/* Profession */}
        <div className="flex flex-col gap-1.5">
          <label className="uppercase tracking-wider flex justify-between items-center">
            Profession Keyword
            {!isPremium && <span className="text-[9px] text-gold-600 font-bold uppercase tracking-wider">Premium</span>}
          </label>
          <div className="relative" onClick={() => !isPremium && onUpgradePrompt?.()}>
            <input
              type="text"
              placeholder={isPremium ? "e.g. Engineer, Doctor, Manager" : "🔒 Premium Gated"}
              value={isPremium ? profession : ""}
              onChange={(e) => isPremium && setProfession(e.target.value)}
              disabled={!isPremium}
              className={`w-full h-10 px-3 rounded-lg border bg-transparent text-xs focus:outline-none ${
                isPremium 
                  ? "border-zinc-200 dark:border-zinc-800 text-zinc-850 dark:text-zinc-150" 
                  : "border-zinc-150 dark:border-zinc-850/50 text-zinc-400 dark:text-zinc-550 cursor-pointer bg-zinc-50/50 dark:bg-zinc-950/20"
              }`}
            />
          </div>
        </div>

      </div>
    </aside>
  );
}
