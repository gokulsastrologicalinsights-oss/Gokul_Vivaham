'use client';

import { Heart, User } from 'lucide-react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import VerificationBadges from '@/components/ui/VerificationBadges';

interface ProfileCardProps {
  profile: any;
  compatibility?: number;
  onLikeToggle?: (id: string) => void;
  liked?: boolean;
}

export default function ProfileCard({
  profile,
  compatibility = 85,
  onLikeToggle,
  liked = false,
}: ProfileCardProps) {
  const id = profile.id || '1';
  const name = profile.fullName || profile.full_name || 'Vivaham Member';
  const ageVal = profile.age || 25;
  const profession = profile.occupation || profile.profession || 'Professional';
  const cityVal = profile.city || profile.workLocation || 'Tamil Nadu';
  const starVal = profile.star || profile.nakshatra || 'Anuradha';
  const rasiVal = profile.rasi || 'Rasi Details';

  return (
    <motion.div
      whileHover={{ y: -6 }}
      transition={{ duration: 0.2 }}
      className="bg-card text-card-foreground border border-border rounded-3xl p-4 shadow-sm hover:shadow-xl flex flex-col text-left h-full transition-all duration-300"
    >
      {/* Profile Image Area */}
      <div className="w-full h-44 rounded-2xl bg-gradient-to-tr from-surface to-background border border-border relative overflow-hidden flex items-center justify-center select-none">
        <User className="h-16 w-16 text-primary/10" />
        
        {/* Badges */}
        <div className="absolute top-2.5 left-2.5 z-10">
          <VerificationBadges profile={profile} size="sm" />
        </div>

        {/* Compatibility badge */}
        {compatibility > 0 && (
          <div className="absolute top-2.5 right-2.5 px-2.5 py-1 rounded-lg bg-brand-red text-white text-[10px] font-extrabold uppercase tracking-wider shadow">
            {compatibility}% Match
          </div>
        )}
      </div>

      {/* Profile Content */}
      <div className="mt-4 flex flex-col flex-1 gap-1">
        <h3 className="text-lg font-serif font-bold text-foreground leading-snug">
          {name}, {ageVal}
        </h3>
        
        <p className="text-xs text-muted font-light truncate">
          {profession} • {cityVal}
        </p>

        <div className="h-px bg-border my-2.5" />

        <div className="flex flex-col gap-1 text-[11px] text-foreground/80 font-medium mb-4">
          <span className="tracking-wide uppercase text-[10px] text-primary font-bold">
            Astro Profile
          </span>
          <span>Nakshatra: {starVal}</span>
          <span>Rasi: {rasiVal}</span>
        </div>

        {/* Actions */}
        <div className="mt-auto flex gap-2 pt-2">
          <Link
            href={`/profile/${id}`}
            className="flex-1 py-2 text-center rounded-full border border-primary text-primary hover:bg-primary hover:text-primary-foreground text-xs font-bold uppercase tracking-wider transition-all duration-200 cursor-pointer"
          >
            View Profile
          </Link>
          {onLikeToggle && (
            <button
              onClick={() => onLikeToggle(id)}
              className={`p-2.5 rounded-full border flex items-center justify-center transition-all duration-200 cursor-pointer touch-target ${
                liked
                  ? 'bg-brand-red/10 border-brand-red/40 text-brand-red'
                  : 'border-border text-muted hover:text-primary hover:border-primary/45'
              }`}
              title={liked ? 'Remove Shortlist' : 'Add Shortlist'}
            >
              <Heart className={`h-4.5 w-4.5 ${liked ? 'fill-brand-red' : ''}`} />
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
}
