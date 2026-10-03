'use client';

import { 
  Phone, Mail, ShieldCheck, Award, Star, 
  CheckCircle, AlertCircle
} from 'lucide-react';

interface VerificationBadgesProps {
  profile: any;
  user?: any;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  showUnverified?: boolean;
}

export default function VerificationBadges({
  profile,
  user,
  size = 'md',
  className = '',
  showUnverified = false
}: VerificationBadgesProps) {
  if (!profile) return null;

  // Resolve status fields
  const isPremium = profile.is_premium || profile.isPremium || false;
  
  // ID Verification
  const idStatus = profile.id_verification_status || (profile.is_verified || profile.isVerified ? 'approved' : 'none');
  const isIdVerified = idStatus === 'approved';

  // Horoscope Verification
  const horoscopeStatus = profile.horoscope_verification_status || 'none';
  const isHoroscopeVerified = horoscopeStatus === 'approved';

  // Email and Mobile Verification
  const isEmailVerified = 
    profile.email_verified || 
    user?.email_verified || 
    profile.users?.email_verified || 
    false;
    
  const isMobileVerified = 
    profile.mobile_verified || 
    user?.mobile_verified || 
    profile.users?.mobile_verified || 
    false;

  // Badge configuration: strictly Gold and Red
  const badgesList = [
    {
      id: 'premium',
      active: isPremium,
      label: 'Premium Member',
      icon: Star,
      activeColor: 'bg-brand-gold text-zinc-950 shadow-sm border-brand-gold/30',
      activeBg: 'bg-brand-gold text-zinc-950',
      inactiveColor: 'bg-zinc-800/40 text-muted border-border',
      tooltip: 'Premium Member: Active Subscription benefits active'
    },
    {
      id: 'id_proof',
      active: isIdVerified,
      label: 'ID Verified',
      icon: ShieldCheck,
      activeColor: 'bg-brand-red text-white shadow-sm border-brand-red/30',
      activeBg: 'bg-brand-red text-white',
      inactiveColor: 'bg-zinc-800/40 text-muted border-border',
      tooltip: 'ID Verified: Aadhaar/PAN validation approved'
    },
    {
      id: 'horoscope',
      active: isHoroscopeVerified,
      label: 'Astro Verified',
      icon: Award,
      activeColor: 'bg-brand-gold text-zinc-950 shadow-sm border-brand-gold/30',
      activeBg: 'bg-brand-gold text-zinc-950',
      inactiveColor: 'bg-zinc-800/40 text-muted border-border',
      tooltip: 'Horoscope Verified: Traditional natal chart document approved'
    },
    {
      id: 'mobile',
      active: isMobileVerified,
      label: 'Mobile Verified',
      icon: Phone,
      activeColor: 'bg-brand-red text-white shadow-sm border-brand-red/30',
      activeBg: 'bg-brand-red text-white',
      inactiveColor: 'bg-zinc-800/40 text-muted border-border',
      tooltip: 'Mobile Verified: Direct contact details verified'
    },
    {
      id: 'email',
      active: isEmailVerified,
      label: 'Email Verified',
      icon: Mail,
      activeColor: 'bg-brand-gold text-zinc-950 shadow-sm border-brand-gold/30',
      activeBg: 'bg-brand-gold text-zinc-950',
      inactiveColor: 'bg-zinc-800/40 text-muted border-border',
      tooltip: 'Email Verified: Verified digital identity address'
    }
  ];

  // If size is 'sm', render very compact badges (icon-only)
  if (size === 'sm') {
    return (
      <div className={`flex items-center gap-1.5 ${className}`}>
        {badgesList.map((badge) => {
          if (!badge.active && !showUnverified) return null;
          const Icon = badge.icon;
          return (
            <div
              key={badge.id}
              className={`p-1.5 rounded-full border transition-all select-none duration-300 relative group cursor-help ${
                badge.active 
                  ? `${badge.activeBg} border-white/10 shadow-sm` 
                  : 'bg-card text-muted border-border opacity-40'
              }`}
              title={badge.tooltip}
            >
              <Icon className="h-3 w-3" />
              
              {/* Tooltip Overlay */}
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-40 bg-zinc-950/95 text-[10px] text-zinc-200 p-2 rounded-lg opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity duration-200 z-50 shadow-md leading-normal text-center select-none">
                {badge.tooltip}
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  // Medium Layout: Labels + Icon, inline wrapping list
  if (size === 'md') {
    return (
      <div className={`flex flex-wrap gap-2 ${className}`}>
        {badgesList.map((badge) => {
          if (!badge.active && !showUnverified) return null;
          const Icon = badge.icon;
          return (
            <div
              key={badge.id}
              className={`px-3 py-1 rounded-full border flex items-center gap-1.5 text-[10px] font-bold tracking-wide uppercase select-none transition-all duration-300 ${
                badge.active
                  ? `${badge.activeColor} shadow-sm`
                  : 'bg-card border-border text-muted opacity-50'
              }`}
              title={badge.tooltip}
            >
              <Icon className="h-3.5 w-3.5 shrink-0" />
              <span>{badge.label}</span>
            </div>
          );
        })}
      </div>
    );
  }

  // Large Layout: detailed grid
  return (
    <div className={`grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 ${className}`}>
      {badgesList.map((badge) => {
        const Icon = badge.icon;
        return (
          <div
            key={badge.id}
            className={`p-4 rounded-2xl border transition-all duration-300 flex items-start gap-3 text-left ${
              badge.active
                ? `bg-card border-border shadow-md`
                : 'bg-surface border-border opacity-60'
            }`}
          >
            <div className={`p-2.5 rounded-xl shrink-0 ${
              badge.active 
                ? `${badge.activeBg} shadow-md` 
                : 'bg-surface text-muted'
            }`}>
              <Icon className="h-5 w-5" />
            </div>

            <div className="flex flex-col gap-0.5 min-w-0">
              <span className={`text-xs font-bold tracking-wider uppercase ${
                badge.active ? 'text-foreground font-serif' : 'text-muted'
              }`}>
                {badge.label}
              </span>
              <p className="text-[10px] text-muted leading-normal font-light">
                {badge.tooltip}
              </p>
              <div className="mt-1.5 flex items-center gap-1">
                {badge.active ? (
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold uppercase tracking-wider flex items-center gap-0.5">
                    <CheckCircle className="h-2.5 w-2.5" /> Approved &amp; Active
                  </span>
                ) : (
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-surface text-muted font-semibold uppercase tracking-wider flex items-center gap-0.5 border border-border">
                    <AlertCircle className="h-2.5 w-2.5" /> Verification Pending
                  </span>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
