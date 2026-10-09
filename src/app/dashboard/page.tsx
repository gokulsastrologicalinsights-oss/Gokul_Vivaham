'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Heart, Users, Check, X, ShieldAlert, Sparkles, 
  ArrowRight, FileText, CheckCircle2, Eye
} from 'lucide-react';
import DashboardStats from '@/components/dashboard/DashboardStats';
import MembershipCard from '@/components/dashboard/MembershipCard';
import { supabase } from '@/lib/supabase';
import { matchService } from '@/services/match.service';
import FeaturedProfilesCarousel from '@/components/home/FeaturedProfilesCarousel';
import InterestActionButton from '@/components/matchmaking/InterestActionButton';
import ProfileVerificationBanner from '@/components/verification/ProfileVerificationBanner';

export default function UserDashboard() {
  
  const [userName, setUserName] = useState('Member');
  const [checklist, setChecklist] = useState([
    { id: 2, name: 'Add Profile Photo', completed: false, action: 'Add' },
    { id: 3, name: 'Upload Horoscope File', completed: false, action: 'Upload' },
    { id: 4, name: 'Define Partner Expectations', completed: false, action: 'Add' },
    { id: 5, name: 'Add Family Native Details', completed: false, action: 'Add' }
  ]);
  const [matches, setMatches] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Resolve user's database ID from auth_user_id
        const { data: userRow } = await supabase
          .from('users')
          .select('id')
          .eq('auth_user_id', user.id)
          .maybeSingle();

        const currentUserId = userRow?.id || user.id;

        // 1. Fetch Profile details and files
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('user_id', currentUserId)
          .maybeSingle();

        if (profile) {
          setUserName(profile.first_name || 'Member');
          
          // Query photo
          const { data: photo } = await supabase
            .from('gallery_images')
            .select('id')
            .eq('user_id', currentUserId)
            .eq('is_profile_picture', true)
            .limit(1)
            .maybeSingle();
          
          // Query horoscope
          const { data: horoscope } = await supabase
            .from('horoscope_uploads')
            .select('id')
            .eq('user_id', currentUserId)
            .limit(1)
            .maybeSingle();

          setChecklist([
            { id: 2, name: 'Add Profile Photo', completed: !!photo, action: 'Add' },
            { id: 3, name: 'Upload Horoscope File', completed: !!horoscope, action: 'Upload' },
            { id: 4, name: 'Define Partner Expectations', completed: !!profile.partner_expectations, action: 'Add' },
            { id: 5, name: 'Add Family Native Details', completed: !!profile.native_place, action: 'Add' }
          ]);
        }

        // 2. Fetch pending requests
        const { data: pendingRequests } = await matchService.getPendingRequests();
        if (pendingRequests) {
          setRequests(pendingRequests);
        }

        // 3. Fetch match recommendations
        const { data: recommendations } = await matchService.getMatches();
        if (recommendations) {
          setMatches(recommendations.slice(0, 3));
        }



      } catch (err) {
        console.error('Error loading dashboard:', err);
      } finally {
        setLoading(false);
      }
    };
    loadDashboardData();
  }, []);

  const handleAcceptRequest = async (id: string, name: string) => {
    try {
      const { error } = await matchService.respondToRequest(id, 'accepted');
      if (error) {
        alert('Failed to accept connection: ' + error.message);
      } else {
        setRequests(prev => prev.filter(r => r.id !== id));
        alert(`Accepted match connection request from ${name}! Connect over WhatsApp unlocked.`);
      }
    } catch (e: any) {
      alert('Error: ' + e.message);
    }
  };

  const handleDeclineRequest = async (id: string, name: string) => {
    try {
      const { error } = await matchService.respondToRequest(id, 'declined');
      if (error) {
        alert('Failed to decline request: ' + error.message);
      } else {
        setRequests(prev => prev.filter(r => r.id !== id));
        alert(`Declined connection request from ${name}.`);
      }
    } catch (e: any) {
      alert('Error: ' + e.message);
    }
  };

  const completedCount = checklist.filter(item => item.completed).length;
  const completionPercentage = Math.round((completedCount / checklist.length) * 100);

  return (
    <div className="flex flex-col gap-6 text-left">
      
      {/* Top Greeting Banner */}
      <div className="p-6 md:p-8 rounded-3xl bg-gradient-to-r from-sandal-100/60 to-gold-50/20 dark:from-zinc-900/60 dark:to-zinc-900/10 border border-sandal-200 dark:border-zinc-800/80 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl md:text-3xl font-serif font-bold text-foreground flex items-center gap-2">
            Welcome Back, {userName}! <Sparkles className="h-5 w-5 text-gold-500 fill-gold-500 animate-pulse" />
          </h1>
          <p className="text-sm text-muted font-light">
            Explore partner profiles using your saved preferences.
          </p>
        </div>
        <Link
          href="/dashboard/matches"
          className="self-start md:self-center px-5 py-2.5 rounded-full luxury-gradient text-white text-xs font-semibold uppercase tracking-widest hover:opacity-90 shadow-md transition-all duration-200 cursor-pointer"
        >
          View All Matches
        </Link>
      </div>

      <ProfileVerificationBanner />

      {/* MEMBERSHIP CARD */}
      <MembershipCard />

      {/* MID-LEVEL METRICS & TRACKER GRID */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        
        {/* PROFILE COMPLETION METER */}
        <div className="md:col-span-7 bg-white dark:bg-zinc-900 p-6 rounded-3xl shadow-md border border-sandal-200 dark:border-zinc-800/80 flex flex-col gap-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-serif font-bold text-foreground">Profile Completion</h2>
            <span className="text-base font-serif font-black text-maroon-600 dark:text-gold-400">{completionPercentage}%</span>
          </div>

          {/* Progress Bar */}
          <div className="w-full h-2.5 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
            <div 
              className="h-full luxury-gradient transition-all duration-500"
              style={{ width: `${completionPercentage}%` }}
            />
          </div>

          {/* Checklist */}
          <ul className="mt-2 space-y-2.5">
            {checklist.map((item) => (
              <li key={item.id} className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2.5 font-light text-muted">
                  <span className={`w-4 h-4 rounded-full flex items-center justify-center ${
                    item.completed 
                      ? 'bg-emerald-500/10 text-emerald-600' 
                      : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-400'
                  }`}>
                    {item.completed ? <Check className="h-3 w-3" /> : '•'}
                  </span>
                  {item.name}
                </span>

                {!item.completed && (
                  <button 
                    onClick={() => alert(`Redirecting to complete: ${item.name}`)}
                    className="text-xs font-bold text-maroon-600 dark:text-gold-400 hover:underline cursor-pointer"
                  >
                    {item.action}
                  </button>
                )}
              </li>
            ))}
          </ul>
        </div>

        {/* STATS COUNTERS & ACTIVITIES */}
        <div className="md:col-span-5">
          <DashboardStats />
        </div>

      </div>

      {/* MATCH REQUESTS PENDING RECEIVED */}
      {requests.length > 0 && (
        <div className="bg-white dark:bg-zinc-900 p-6 rounded-3xl shadow-md border border-sandal-200 dark:border-zinc-800/80 flex flex-col gap-4">
          <h2 className="text-lg font-serif font-bold text-foreground">Pending Match Requests</h2>
          <div className="flex flex-col gap-3">
            {requests.map(req => (
              <div 
                key={req.id}
                className="p-4 rounded-xl bg-sandal-50/50 dark:bg-zinc-950/50 border border-sandal-200 dark:border-zinc-850 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="flex flex-col">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-foreground">{req.name} (29)</span>
                    <span className="text-xs font-bold px-1.5 py-0.5 rounded bg-maroon-500/10 text-maroon-700 dark:text-gold-400">{req.score}% Match</span>
                  </div>
                  <span className="text-xs text-muted mt-1 font-light">
                    {req.education} • {req.location} • Star: {req.star}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleDeclineRequest(req.id, req.name)}
                    className="p-2 rounded-lg border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                    title="Decline Request"
                  >
                    <X className="h-4 w-4 text-zinc-500" />
                  </button>
                  <button
                    onClick={() => handleAcceptRequest(req.id, req.name)}
                    className="flex items-center gap-1 px-4 h-8.5 rounded-lg luxury-gradient text-white text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer"
                  >
                    <Check className="h-4 w-4" /> Accept
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* RECOMMENDED COMPATIBILITY MATCHES */}
      <div className="flex flex-col gap-4">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-serif font-bold text-foreground">Recommended Matches</h2>
          <Link href="/dashboard/matches" className="text-xs font-bold text-maroon-600 dark:text-gold-400 hover:underline flex items-center gap-0.5">
            See All <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {matches.map((match) => (
            <div 
              key={match.id}
              className="bg-white dark:bg-zinc-900 rounded-3xl p-5 shadow-md border border-sandal-200 dark:border-zinc-800/80 hover:shadow-lg transition-shadow flex flex-col justify-between relative overflow-hidden"
            >
              {match.isPremium && (
                <div className="absolute top-0 right-6 transform -translate-y-1/2 px-2.5 py-0.5 rounded-full bg-gold-400 text-[9px] font-bold text-zinc-950 uppercase tracking-widest">
                  Premium
                </div>
              )}

              {/* Profile Card details */}
              <div className="flex flex-col gap-3 text-left">
                {/* Photo placeholder with details */}
                <div className="w-full h-32 rounded-2xl bg-gradient-to-tr from-sandal-100 to-amber-50 dark:from-zinc-800 dark:to-zinc-850 flex items-center justify-center relative">
                  <Users className="h-10 w-10 text-maroon-500/20" />
                  <div className="absolute bottom-2.5 right-2.5 px-2 py-0.5 rounded bg-white/90 dark:bg-zinc-900/90 text-xs font-semibold text-maroon-700 dark:text-gold-400">
                    {match.score}% Score
                  </div>
                </div>

                <div className="flex flex-col">
                  <span className="text-base font-serif font-bold text-foreground">
                    {match.name}
                  </span>
                  <span className="text-[11px] text-zinc-400 font-mono mt-0.5">{match.id}</span>
                </div>

                <ul className="space-y-1 text-xs text-muted font-light">
                  <li>{match.age} yrs • {match.height}</li>
                  <li className="truncate">{match.education}</li>
                  <li>{match.location}</li>
                  <li className="font-semibold text-gold-600 dark:text-gold-400 mt-1.5 uppercase text-[10px] tracking-wider">
                    {match.rasi} Rasi • {match.star}
                  </li>
                </ul>
              </div>

              <div className="mt-5 pt-3.5 border-t border-zinc-100 dark:border-zinc-850 flex justify-between items-center gap-2">
                <Link
                  href={`/dashboard/matches?id=${match.id}`}
                  className="flex-1 py-2 text-center rounded-lg border border-border text-xs font-semibold text-muted hover:bg-surface transition-colors"
                >
                  View Profile
                </Link>
                <InterestActionButton
                  recipientUserId={match.user_id || match.profile_uuid || match.id}
                  className="flex-1 rounded-lg luxury-gradient px-3 py-2 text-xs font-semibold text-white shadow transition-all hover:opacity-90"
                  compact
                />
              </div>

            </div>
          ))}
        </div>
      </div>

      {/* FEATURED PROFILES SPOTLIGHT */}
      <div className="mt-4">
        <FeaturedProfilesCarousel />
      </div>
    </div>
  );
}
