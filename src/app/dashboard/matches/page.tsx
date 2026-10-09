'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { 
  Search, Heart, HeartOff, Phone, 
  MessageSquare, UserX, CheckCircle2, ShieldAlert, 
  X, Star, HelpCircle, Sparkles, BookOpen 
} from 'lucide-react';
import MatchFilters from '@/components/matchmaking/MatchFilters';
import { matchService } from '@/services/match.service';
import { supabase } from '@/lib/supabase';
import { contactConfig } from '@/config/contact.config';
import VerificationBadges from '@/components/ui/VerificationBadges';
import { useCheckout } from '@/hooks/useCheckout';
import { Unlock, Mail } from 'lucide-react';
import RequestSentConfirmation from '@/components/ui/RequestSentConfirmation';

type RequestStatus = {
  id: string;
  status: 'pending' | 'cancelled' | 'accepted' | 'declined';
};

function MatchesContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Search Param Initializer
  const initialGender = searchParams?.get('gender') === 'Male' ? 'Male' : 'Female';
  const initialReligion = searchParams?.get('religion') || 'Hindu';
  
  // Filter States
  const [gender, setGender] = useState(initialGender);
  const [ageMin, setAgeMin] = useState(21);
  const [ageMax, setAgeMax] = useState(32);
  const [religion, setReligion] = useState(initialReligion);
  const [caste, setCaste] = useState('');
  const [rasi, setRasi] = useState('');
  const [star, setStar] = useState('');
  const [padam, setPadam] = useState('');
  const [location, setLocation] = useState('');
  const [profession, setProfession] = useState('');

  // Shortlisted state
  const [shortlisted, setShortlisted] = useState<Record<string, boolean>>({});

  // Active selected profile for Modal
  const [activeProfile, setActiveProfile] = useState<any>(null);

  // Gating & Premium States
  const [isPremium, setIsPremium] = useState(false);
  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false);

  // Unlocked profile IDs state
  const [unlockedProfiles, setUnlockedProfiles] = useState<Set<string>>(new Set());
  const [modalContactDetails, setModalContactDetails] = useState<{ email: string; phone: string; premiumLocked?: boolean; unlocked?: boolean } | null>(null);
  const [modalContactLoading, setModalContactLoading] = useState(false);
  const [requestStatuses, setRequestStatuses] = useState<Record<string, RequestStatus>>({});
  const [sendingProfileId, setSendingProfileId] = useState<string | null>(null);
  const [showRequestConfirmation, setShowRequestConfirmation] = useState(false);

  const { initiateCheckout, loading: checkoutLoading } = useCheckout();

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

  const handleUnlockContactModal = (profile: any) => {
    if (!profile) return;
    initiateCheckout({
      paymentType: 'contact_unlock',
      targetProfileId: profile.profile_uuid,
      onSuccess: () => {
        window.location.reload();
      }
    });
  };

  useEffect(() => {
    if (!activeProfile) {
      setModalContactDetails(null);
      return;
    }
    const fetchModalContact = async () => {
      setModalContactLoading(true);
      try {
        const res = await fetch('/api/profile/contact-details', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ profileId: activeProfile.id }),
        });
        const data = await res.json();
        if (res.ok && data.success) {
          setModalContactDetails({
            email: data.email || 'N/A',
            phone: data.phone || 'N/A',
            premiumLocked: false,
            unlocked: data.unlocked || false
          });
        } else if (data.upgrade_required) {
          setModalContactDetails({
            email: '🔒 Credits Exhausted',
            phone: '🔒 Credits Exhausted',
            premiumLocked: true,
            unlocked: false
          });
        } else {
          setModalContactDetails({
            email: '🔒 Connection Gated',
            phone: '🔒 Connection Gated',
            premiumLocked: false,
            unlocked: false
          });
        }
      } catch (err) {
        console.error('Error fetching modal contact details:', err);
      } finally {
        setModalContactLoading(false);
      }
    };
    fetchModalContact();
  }, [activeProfile]);

  // Sync state if URL search parameters change
  useEffect(() => {
    const gen = searchParams?.get('gender');
    const rel = searchParams?.get('religion');
    if (gen) setGender(gen === 'Male' ? 'Male' : 'Female');
    if (rel) setReligion(rel);
  }, [searchParams]);

  // Live profiles state fetched from database
  const [allProfiles, setAllProfiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    const loadProfiles = async () => {
      setLoading(true);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          // Resolve user's database ID and role
          const { data: userRow } = await supabase
            .from('users')
            .select('id, role, profiles(is_premium)')
            .eq('auth_user_id', user.id)
            .maybeSingle();

          const dbUserId = userRow?.id || user.id;
          setCurrentUserId(dbUserId);

          const isProfilePremium = (userRow as any)?.profiles?.is_premium || false;
          const isRolePremium = userRow?.role !== 'user' && userRow?.role !== 'free';
          setIsPremium(isProfilePremium || isRolePremium);
          
          // Load unlocked profiles
          await fetchUnlockedProfiles();

          // Load existing shortlist favorites
          const { data: favs } = await supabase
            .from('favorites')
            .select('favorite_user_id')
            .eq('user_id', dbUserId);
          if (favs) {
            const shortlistMap: Record<string, boolean> = {};
            favs.forEach(f => {
              shortlistMap[f.favorite_user_id] = true;
            });
            setShortlisted(shortlistMap);
          }
        }

        const { data: featuredData } = await supabase
          .from('featured_profiles')
          .select('user_id')
          .eq('is_active', true)
          .gt('end_date', new Date().toISOString());
        
        const featuredSet = new Set(featuredData?.map(f => f.user_id) || []);

        const { data, error } = await matchService.getMatches();
        if (error) throw error;
        if (data) {
          const mapped = data.map((p: any) => ({
            ...p,
            is_featured: featuredSet.has(p.user_id)
          }));
          setAllProfiles(mapped);
          const statusResult = await matchService.getRequestStatuses(mapped.map((profile: any) => profile.user_id).filter(Boolean));
          if (!statusResult.error) setRequestStatuses(statusResult.data as Record<string, RequestStatus>);
        }
      } catch (err) {
        setLoadError('Unable to load matches. Please refresh and try again.');
        console.error('Failed to load profiles:', err);
      } finally {
        setLoading(false);
      }
    };
    loadProfiles();
  }, []);


  // Filtering Logic
  const filteredProfiles = allProfiles.filter((profile) => {
    // 1. Gender check: Match opposite gender of the user's dashboard selection
    if (profile.gender !== gender) return false;

    // 2. Age check
    if (!Number.isFinite(profile.age) || profile.age < ageMin || profile.age > ageMax) return false;

    // 3. Religion check
    if (religion && (profile.religion || '').toLowerCase() !== religion.toLowerCase()) return false;

    // Gate advanced filters client-side to prevent bypass
    if (isPremium) {
      // 4. Caste filter
      if (caste && !(profile.caste || '').toLowerCase().includes(caste.toLowerCase())) return false;

      // 5. Rasi filter
      if (rasi && (profile.rasi || '').toLowerCase() !== rasi.toLowerCase()) return false;
      
      // 5b. Padam filter
      if (padam && String(profile.padam || '') !== String(padam)) return false;

      // 6. Star filter
      if (star && !(profile.star || '').toLowerCase().includes(star.toLowerCase())) return false;

      // 7. Location filter
      if (location && !(profile.location || '').toLowerCase().includes(location.toLowerCase())) return false;

      // 8. Profession filter
      if (profession && !(profile.education || '').toLowerCase().includes(profession.toLowerCase())) return false;
    }

    return true;
  });

  const toggleShortlist = async (id: string, name: string) => {
    if (!currentUserId) return;
    
    // Find profile corresponding to the match ID to get user_id
    const targetProfile = allProfiles.find(p => p.id === id);
    const targetUserId = targetProfile?.user_id || id;
    const isCurrentlyShortlisted = shortlisted[id];

    try {
      if (isCurrentlyShortlisted) {
        await supabase
          .from('favorites')
          .delete()
          .eq('user_id', currentUserId)
          .eq('favorite_user_id', targetUserId);
        
          setShortlisted(prev => ({ ...prev, [id]: false }));
        alert(`Removed ${name} from Shortlist.`);
      } else {
        await supabase
          .from('favorites')
          .insert({
            user_id: currentUserId,
            favorite_user_id: targetUserId
          });

          setShortlisted(prev => ({ ...prev, [id]: true }));
        alert(`Added ${name} to Shortlist!`);
      }
    } catch (e: any) {
      console.error('Error toggling shortlist:', e);
    }
  };

  const handleBlockUser = async (name: string) => {
    alert(`User ${name} has been reported. Admins will review this within 12 hours.`);
  };

  const handleConnect = async (profile: any): Promise<boolean> => {
    try {
      const targetUserId = profile.user_id || profile.id;
      if (requestStatuses[targetUserId] || sendingProfileId) return false;
      setSendingProfileId(targetUserId);
      const { data, error } = await matchService.sendRequest(targetUserId);
      if (error) {
        const latest = await matchService.getRequestStatus(targetUserId);
        if (latest.data) setRequestStatuses(prev => ({ ...prev, [targetUserId]: latest.data as RequestStatus }));
        alert('Failed to send connection request: ' + error.message);
        return false;
      } else {
        setRequestStatuses(prev => ({
          ...prev,
          [targetUserId]: { id: data?.id || `pending-${targetUserId}`, status: 'pending' }
        }));
        setShowRequestConfirmation(true);
        return true;
      }
    } catch (e: any) {
      alert('Error: ' + e.message);
      return false;
    } finally {
      setSendingProfileId(null);
    }
  };

  const handleCancelRequest = async (profile: any) => {
    const targetUserId = profile.user_id || profile.id;
    const request = requestStatuses[targetUserId];
    if (!request || request.status !== 'pending' || !window.confirm('Cancel this pending interest request? You will not be able to send another request to this member.')) return;
    setSendingProfileId(targetUserId);
    try {
      const { data, error } = await matchService.cancelRequest(request.id);
      if (error) {
        alert('Failed to cancel request: ' + error.message);
      } else {
        setRequestStatuses(prev => ({ ...prev, [targetUserId]: { id: request.id, status: data?.status || 'cancelled' } }));
        alert('Request Cancelled');
      }
    } finally {
      setSendingProfileId(null);
    }
  };

  const requestLabel = (status?: RequestStatus['status']) => status === 'pending'
    ? 'Request Sent'
    : status === 'accepted'
      ? 'Interest Accepted'
      : status === 'declined'
        ? 'Interest Declined'
        : status === 'cancelled'
          ? 'Request Already Sent'
          : 'Send Interest';

  const renderInterestActions = (profile: any, closeAfterSend = false) => {
    const targetUserId = profile.user_id || profile.id;
    const request = requestStatuses[targetUserId];
    const isBusy = sendingProfileId === targetUserId;
    const handleSend = async () => {
      const sent = await handleConnect(profile);
      if (sent && closeAfterSend) setActiveProfile(null);
    };
    return (
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={handleSend}
          disabled={Boolean(request) || isBusy || Boolean(sendingProfileId)}
          className="flex-1 rounded-lg luxury-gradient px-3 py-2 text-xs font-semibold text-white shadow transition-all hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isBusy && !request ? 'Sending…' : requestLabel(request?.status)}
        </button>
        {request?.status === 'pending' && (
          <button
            onClick={() => handleCancelRequest(profile)}
            disabled={isBusy}
            className="rounded-lg border border-zinc-300 px-3 py-2 text-xs font-semibold text-zinc-600 transition-colors hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            Cancel Request
          </button>
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-6 text-left">
      
      {/* Search Header Banner */}
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl md:text-3xl font-serif font-bold text-zinc-900 dark:text-zinc-55">
          Find Your Perfect Match
        </h1>
        <p className="text-xs text-zinc-500 dark:text-zinc-400 font-light">
          Filter matching profiles using traditional compatibility guidance, location parameters, and community standards.
        </p>
        
        {/* Compliance Matching Warning Banner */}
        <div className="p-3 text-[10px] md:text-xs bg-sandal-50/50 dark:bg-zinc-900/60 border border-sandal-200/50 dark:border-zinc-800/80 rounded-xl text-zinc-500 dark:text-zinc-450 leading-relaxed italic">
          Disclaimer: Horoscope compatibility is based on traditional astrological systems and should not be treated as absolute certainty or professional legal/medical advice.
        </div>
      </div>

      {/* FILTER & MATCHES GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* LEFT COLUMN: FILTER SIDEBAR */}
        <MatchFilters
          gender={gender}
          setGender={setGender}
          ageMin={ageMin}
          setAgeMin={setAgeMin}
          ageMax={ageMax}
          setAgeMax={setAgeMax}
          religion={religion}
          setReligion={setReligion}
          caste={caste}
          setCaste={setCaste}
          rasi={rasi}
          setRasi={setRasi}
          star={star}
          setStar={setStar}
          padam={padam}
          setPadam={setPadam}
          location={location}
          setLocation={setLocation}
          profession={profession}
          setProfession={setProfession}
          onClearAll={() => {
            setAgeMin(21);
            setAgeMax(32);
            setReligion('Hindu');
            setCaste('');
            setRasi('');
            setStar('');
            setPadam('');
            setLocation('');
            setProfession('');
          }}
          isPremium={isPremium}
          onUpgradePrompt={() => setShowUpgradePrompt(true)}
        />

        {/* RIGHT COLUMN: PROFILES LISTING */}
        <div className="lg:col-span-8 flex flex-col gap-6">
          
          <div className="text-xs text-zinc-500 font-medium">
            Found {filteredProfiles.length} matching profile(s)
          </div>

          {filteredProfiles.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {filteredProfiles.map((profile) => (
                <div
                  key={profile.id}
                  className="bg-white dark:bg-zinc-900 rounded-3xl p-5 shadow-md border border-sandal-200 dark:border-zinc-800/80 hover:shadow-lg transition-all flex flex-col justify-between relative overflow-hidden animate-fade-in"
                >
                  {/* Photo Section */}
                  <div className="w-full h-40 rounded-2xl bg-gradient-to-tr from-sandal-100 to-amber-50 dark:from-zinc-800 dark:to-zinc-850 flex items-center justify-center relative">
                    <Sparkles className="h-10 w-10 text-maroon-500/10" />
                    
                    <div className="absolute top-2.5 left-2.5 z-10 flex flex-col gap-1.5 items-start">
                      <VerificationBadges profile={profile} size="sm" />
                      {unlockedProfiles.has(profile.id) && (
                        <span className="bg-emerald-600 text-white text-[8px] font-bold px-2 py-0.5 rounded shadow-sm flex items-center gap-0.5 select-none uppercase tracking-wide">
                          <Unlock className="h-2.5 w-2.5" /> Unlocked
                        </span>
                      )}
                    </div>

                    {profile.is_featured && (
                      <div className="absolute top-2.5 right-2.5 bg-gradient-to-r from-amber-500 to-gold-500 text-zinc-950 text-[9px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider font-mono shadow-sm flex items-center gap-0.5 z-10 select-none border border-gold-450">
                        <Star className="h-3 w-3 fill-zinc-950 text-zinc-950" /> Featured
                      </div>
                    )}

                    {isPremium ? (
                      <div className="absolute bottom-2.5 right-2.5 px-2.5 py-0.5 rounded bg-white/95 dark:bg-zinc-900/95 text-xs font-semibold text-maroon-700 dark:text-gold-450 shadow-sm">
                        {profile.score}% Indicative Compatibility
                      </div>
                    ) : (
                      <button
                        onClick={() => setShowUpgradePrompt(true)}
                        className="absolute bottom-2.5 right-2.5 px-2.5 py-1 rounded bg-amber-500 hover:bg-amber-600 text-[9px] font-bold text-white uppercase tracking-wider flex items-center gap-1 shadow-md cursor-pointer focus:outline-none"
                      >
                        🔒 Unlock Astro Score
                      </button>
                    )}
                  </div>

                  {/* Text details */}
                  <div className="mt-4 text-left flex flex-col gap-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="text-base font-serif font-bold text-zinc-850 dark:text-zinc-100 truncate">
                        {profile.name}
                      </h3>
                      <span className="text-[10px] text-zinc-400 font-mono shrink-0">{profile.id}</span>
                    </div>

                    <ul className="space-y-1 text-xs text-zinc-650 dark:text-zinc-400 font-light">
                      <li>{profile.age} yrs • {profile.height} • {profile.maritalStatus || 'Never Married'}</li>
                      <li className="font-semibold text-zinc-800 dark:text-zinc-300">{profile.education}</li>
                      <li>{profile.location}</li>
                      <li className="font-semibold text-gold-600 dark:text-gold-400 pt-1.5 uppercase text-[9px] tracking-wider">
                        {isPremium ? (
                          `${profile.rasi} Rasi • ${profile.star} • ${profile.gothram}`
                        ) : (
                          "🔒 Star & Rasi Hidden (Upgrade)"
                        )}
                      </li>
                    </ul>
                  </div>

                  {/* Actions Bar */}
                  <div className="mt-5 pt-3.5 border-t border-zinc-100 dark:border-zinc-850 flex items-center gap-2">
                    
                    {/* Shortlist Icon Button */}
                    <button
                      onClick={() => toggleShortlist(profile.id, profile.name)}
                      className={`p-2 rounded-lg border transition-colors cursor-pointer ${
                        shortlisted[profile.id] 
                          ? 'border-rose-300/40 bg-rose-500/10 text-rose-600' 
                          : 'border-zinc-200 dark:border-zinc-850 text-zinc-400 hover:text-zinc-600'
                      }`}
                      title={shortlisted[profile.id] ? 'Remove Shortlist' : 'Shortlist Profile'}
                    >
                      <Heart className={`h-4.5 w-4.5 ${shortlisted[profile.id] ? 'fill-rose-500' : ''}`} />
                    </button>

                    {/* View Profile */}
                    <button
                      onClick={() => setActiveProfile(profile)}
                      className="flex-1 py-2 text-center rounded-lg border border-zinc-200 dark:border-zinc-855 text-xs font-semibold text-zinc-600 dark:text-zinc-350 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                    >
                      View Details
                    </button>

                    {/* Directional interest state */}
                    <div className="flex-1">
                      {renderInterestActions(profile)}
                    </div>

                  </div>

                </div>
              ))}
            </div>
          ) : (
            <div className="p-16 text-center text-zinc-500 font-mono text-xs border border-dashed border-sandal-200 dark:border-zinc-850 rounded-3xl bg-white dark:bg-zinc-900/60 shadow">
              {loadError || (loading ? 'Loading matches…' : 'No matches found. Try clearing your filters or widening your age criteria.')}
            </div>
          )}

        </div>

      </div>

      {/* DETAIL MODAL OVERLAY */}
      {activeProfile && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-fade-in">
          <div className="bg-white dark:bg-zinc-900 w-full max-w-2xl rounded-3xl shadow-2xl border border-sandal-200 dark:border-zinc-800 overflow-hidden flex flex-col relative max-h-[90vh]">
            
            {/* Header info */}
            <div className="p-6 border-b border-zinc-100 dark:border-zinc-850 flex justify-between items-start">
              <div className="flex flex-col text-left gap-1">
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-serif font-bold text-zinc-900 dark:text-zinc-50">{activeProfile.name}</h2>
                  {isPremium ? (
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 flex items-center gap-0.5">
                      {activeProfile.score}% Traditional Guidance Score
                    </span>
                  ) : (
                    <button
                      onClick={() => { setActiveProfile(null); setShowUpgradePrompt(true); }}
                      className="text-[9px] font-bold px-2 py-0.5 rounded bg-amber-500 hover:bg-amber-600 text-white flex items-center gap-0.5 cursor-pointer"
                    >
                      🔒 Unlock Score
                    </button>
                  )}
                </div>
                <span className="text-[10px] text-zinc-500 dark:text-zinc-400 font-mono">ID: {activeProfile.id}{activeProfile.email_verified && activeProfile.mobile_verified ? ' • Verified Profile' : ''}</span>
              </div>

              <button
                onClick={() => setActiveProfile(null)}
                className="p-1 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Scrollable details */}
            <div className="p-6 overflow-y-auto text-left flex flex-col gap-6 font-light text-zinc-700 dark:text-zinc-350">
              
              {/* Bio description */}
              <div className="flex flex-col gap-2">
                <span className="text-xs font-bold text-maroon-600 dark:text-gold-400 uppercase tracking-widest">About Me</span>
                <p className="text-sm leading-relaxed">{activeProfile.about}</p>
              </div>

              <div className="h-px bg-zinc-100 dark:bg-zinc-850" />

              {/* Grid 1: Basic & Astrological */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                <div className="flex flex-col gap-2">
                  <span className="text-xs font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-1.5">
                    <BookOpen className="h-4 w-4 text-maroon-500" /> Basic Details
                  </span>
                  <ul className="text-xs space-y-1.5 font-light">
                    <li><strong className="font-semibold text-zinc-850 dark:text-zinc-200">Age / Height:</strong> {activeProfile.age} yrs / {activeProfile.height}</li>
                    <li><strong className="font-semibold text-zinc-850 dark:text-zinc-200">Community:</strong> {activeProfile.religion} • {activeProfile.caste} ({activeProfile.subCaste})</li>
                    <li><strong className="font-semibold text-zinc-850 dark:text-zinc-200">Native Place:</strong> {activeProfile.native}</li>
                  </ul>
                </div>

                <div className="flex flex-col gap-2">
                  <span className="text-xs font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-1.5">
                    <Star className="h-4 w-4 text-maroon-500" /> Horoscope Coordinates
                  </span>
                  {isPremium ? (
                    <ul className="text-xs space-y-1.5 font-light">
                      <li><strong className="font-semibold text-zinc-850 dark:text-zinc-200">Rasi / Star:</strong> {activeProfile.rasi} Rasi / {activeProfile.star}</li>
                      <li><strong className="font-semibold text-zinc-850 dark:text-zinc-200">Gothram:</strong> {activeProfile.gothram}</li>
                    </ul>
                  ) : (
                    <div className="flex flex-col gap-2 items-start">
                      <span className="text-xs text-zinc-400 font-light italic">🔒 Coordinates gated (Premium only)</span>
                      <button
                        onClick={() => { setActiveProfile(null); setShowUpgradePrompt(true); }}
                        className="text-[9px] font-bold text-gold-600 uppercase tracking-wider hover:underline"
                      >
                        Upgrade to view details
                      </button>
                    </div>
                  )}
                </div>

              </div>

              <div className="h-px bg-zinc-100 dark:bg-zinc-850" />

              {/* Grid 2: Profession & Family */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                <div className="flex flex-col gap-2">
                  <span className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Education &amp; Work</span>
                  <ul className="text-xs space-y-1.5 font-light">
                    <li><strong className="font-semibold text-zinc-850 dark:text-zinc-200">Education:</strong> {activeProfile.education}</li>
                    <li><strong className="font-semibold text-zinc-850 dark:text-zinc-200">Employer / Income:</strong> {activeProfile.company} • {activeProfile.income}</li>
                    <li><strong className="font-semibold text-zinc-850 dark:text-zinc-200">Work Location:</strong> {activeProfile.location}</li>
                  </ul>
                </div>

                <div className="flex flex-col gap-2">
                  <span className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Family Background</span>
                  <ul className="text-xs space-y-1.5 font-light">
                    <li><strong className="font-semibold text-zinc-850 dark:text-zinc-200">Family Type:</strong> {activeProfile.familyType} Family</li>
                    <li><strong className="font-semibold text-zinc-850 dark:text-zinc-200">Siblings Details:</strong> {activeProfile.siblings}</li>
                  </ul>
                </div>

              </div>

              <div className="h-px bg-zinc-150 dark:bg-zinc-800 my-4" />

              {/* Secure Contact Details */}
              <div className="flex flex-col gap-4 p-5 rounded-2xl bg-sandal-50/30 dark:bg-zinc-950/30 border border-sandal-200/40 dark:border-zinc-800/80">
                <div className="flex justify-between items-center flex-wrap gap-2">
                  <span className="text-xs font-bold text-maroon-600 dark:text-gold-400 uppercase tracking-widest flex items-center gap-1.5">
                    <Phone className="h-4 w-4 shrink-0" /> Secure Contact Details
                  </span>
                  {modalContactDetails?.unlocked && (
                    <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-450 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 rounded flex items-center gap-1">
                      <Unlock className="h-3 w-3" /> Unlocked Permanently
                    </span>
                  )}
                </div>

                {modalContactLoading ? (
                  <div className="text-center text-xs text-zinc-400 py-3 animate-pulse">Loading contact info...</div>
                ) : modalContactDetails ? (
                  (modalContactDetails.email !== '🔒 Connection Gated' || modalContactDetails.unlocked) ? (
                    modalContactDetails.premiumLocked ? (
                      <div className="flex flex-col gap-3 items-center text-center p-2">
                        <p className="text-xs font-semibold text-amber-600 dark:text-gold-450 leading-relaxed flex items-center gap-1">
                          🔒 Premium Upgrade Required
                        </p>
                        <p className="text-xs font-light text-zinc-500 dark:text-zinc-450 leading-relaxed">
                          Your connection request is accepted, but viewing direct contact details is reserved for Premium Members.
                        </p>
                        <div className="flex flex-col sm:flex-row gap-3 mt-2">
                          <button
                            onClick={() => { setActiveProfile(null); setShowUpgradePrompt(true); }}
                            className="px-4 py-2 bg-zinc-150 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 text-[10px] font-bold uppercase tracking-wider rounded-lg shadow-sm transition-all cursor-pointer focus:outline-none"
                          >
                            Upgrade Plan
                          </button>
                          <div className="flex flex-col gap-1 items-start">
                            <button
                              onClick={() => handleUnlockContactModal(activeProfile)}
                              disabled={checkoutLoading}
                              className="px-4 py-2 luxury-gradient text-white text-[10px] font-bold uppercase tracking-wider rounded-lg shadow-sm transition-all cursor-pointer focus:outline-none"
                            >
                              {checkoutLoading ? 'Processing...' : 'Unlock Contact (₹199)'}
                            </button>
                            <span className="text-[9px] text-zinc-500 dark:text-zinc-450 leading-none mt-1">
                              Service price: ₹199
                            </span>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-light text-zinc-655 dark:text-zinc-400 animate-in fade-in duration-300">
                        <div className="flex items-center gap-2 border-b border-zinc-100 dark:border-zinc-850 pb-2">
                          <Phone className="h-4 w-4 text-emerald-600 shrink-0" />
                          <span className="font-semibold text-zinc-850 dark:text-zinc-200">{modalContactDetails.phone}</span>
                        </div>
                        <div className="flex items-center gap-2 border-b border-zinc-100 dark:border-zinc-850 pb-2">
                          <Mail className="h-4 w-4 text-emerald-600 shrink-0" />
                          <span className="font-semibold text-zinc-850 dark:text-zinc-200">{modalContactDetails.email}</span>
                        </div>
                      </div>
                    )
                  ) : (
                    <div className="flex flex-col gap-2.5 text-center p-2">
                      <p className="text-xs font-light text-zinc-500 dark:text-zinc-450 leading-relaxed">
                        To protect member safety, contact details are private. You must connect and receive their acceptance before phone numbers or emails are visible.
                      </p>
                      <div className="flex flex-col sm:flex-row gap-3 justify-center items-center mt-2">
                        {renderInterestActions(activeProfile, true)}
                        <div className="flex flex-col gap-1 items-center">
                          <button
                            onClick={() => handleUnlockContactModal(activeProfile)}
                            disabled={checkoutLoading}
                            className="px-4 py-2 luxury-gradient text-white text-[10px] font-bold uppercase tracking-wider rounded-lg shadow-sm transition-all cursor-pointer focus:outline-none"
                          >
                            {checkoutLoading ? 'Processing...' : 'Unlock Directly (₹199)'}
                          </button>
                          <span className="text-[9px] text-zinc-500 dark:text-zinc-450 leading-none mt-1">
                            Service price: ₹199
                          </span>
                        </div>
                      </div>
                    </div>
                  )
                ) : null}
              </div>

            </div>

            {/* Footer triggers */}
            <div className="p-6 bg-sandal-50/50 dark:bg-zinc-950/60 border-t border-zinc-100 dark:border-zinc-850 flex flex-wrap items-center justify-between gap-4">
              <button
                onClick={() => { handleBlockUser(activeProfile.name); setActiveProfile(null); }}
                className="text-xs font-semibold text-red-500 hover:text-red-650 inline-flex items-center gap-1 cursor-pointer"
              >
                <ShieldAlert className="h-4 w-4" /> Report Profile
              </button>

              <div className="flex items-center gap-3">
                {/* WhatsApp Inquiry Button */}
                 <a
                  href={`https://wa.me/919342366513?text=I'm%20inquiring%20about%2520Gokul%2520Vivaham%2520Profile%2520ID%2520${activeProfile.id}%20(${activeProfile.name})`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-full text-xs font-bold uppercase tracking-wider shadow-sm transition-all duration-200 inline-flex items-center gap-1.5"
                >
                  <Phone className="h-3.5 w-3.5" /> WhatsApp Inquiry
                </a>

                {renderInterestActions(activeProfile, true)}
              </div>
            </div>

          </div>
        </div>
      )}

      {showRequestConfirmation && (
        <RequestSentConfirmation onClose={() => setShowRequestConfirmation(false)} />
      )}

      {/* UPGRADE PROMPT MODAL */}
      {showUpgradePrompt && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white dark:bg-zinc-900 border border-sandal-200 dark:border-zinc-800 rounded-3xl shadow-2xl p-6 max-w-sm flex flex-col gap-4 text-center">
            <div className="luxury-gradient w-12 h-12 rounded-full flex items-center justify-center text-white text-lg font-bold mx-auto shadow-md">
              ★
            </div>
            <h3 className="text-lg font-serif font-bold text-zinc-900 dark:text-zinc-50">Unlock Premium Matchmaking</h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed font-light">
              Advanced filters, detailed horoscope coordinates, and verified contacts are reserved for Premium Members. Choose a plan and connect with compatibility.
            </p>
            <div className="flex gap-3 justify-center mt-2">
              <button
                onClick={() => setShowUpgradePrompt(false)}
                className="px-4 py-2 border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 text-xs font-semibold uppercase rounded-xl hover:bg-zinc-50 dark:hover:bg-zinc-950/20 cursor-pointer focus:outline-none"
              >
                Go Back
              </button>
              <button
                onClick={() => { setShowUpgradePrompt(false); router.push('/dashboard/subscription'); }}
                className="px-5 py-2 luxury-gradient text-white text-xs font-bold uppercase tracking-wider rounded-xl shadow cursor-pointer focus:outline-none"
              >
                Upgrade Now
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default function Matches() {
  return (
    <Suspense fallback={
      <div className="flex-1 flex items-center justify-center p-12 bg-sandal-50/30 dark:bg-zinc-950/20 min-h-[50vh]">
        <div className="h-8 w-8 border-4 border-maroon-500 border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <MatchesContent />
    </Suspense>
  );
}
