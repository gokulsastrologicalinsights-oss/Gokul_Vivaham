'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  Heart, Phone, ShieldCheck, Star, Sparkles, 
  ArrowLeft, CheckCircle2, ShieldAlert, Award, 
  MapPin, Users, BookOpen, Clock, Mail, Ban,
  ChevronLeft, ChevronRight
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import VerificationBadges from '@/components/ui/VerificationBadges';
import { safetyService } from '@/services/safety.service';
import UpgradeModal from '@/components/ui/UpgradeModal';
import { useCheckout } from '@/hooks/useCheckout';
import { Lock, Unlock } from 'lucide-react';

export default function ProfileView({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { id } = use(params);

  // States
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isShortlisted, setIsShortlisted] = useState(false);
  const [galleryImages, setGalleryImages] = useState<any[]>([]);
  const [activeSlide, setActiveSlide] = useState(0);
  const [interestSent, setInterestSent] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);
  const [reported, setReported] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [contactDetails, setContactDetails] = useState<{ email: string; phone: string; premiumLocked?: boolean; unlocked?: boolean }>({
    email: '••••••@••••.com',
    phone: '+91 ••••• •••••',
    premiumLocked: false,
    unlocked: false
  });
  const [isPremium, setIsPremium] = useState(false);
  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false);
  const [upgradeFeature, setUpgradeFeature] = useState<'contact' | 'horoscope' | 'consultation'>('contact');

  const { initiateCheckout, loading: checkoutLoading } = useCheckout();

  const handleUnlockContact = () => {
    if (!currentUser) {
      alert('Please login to unlock contact details.');
      router.push('/login');
      return;
    }
    if (!profile) return;
    initiateCheckout({
      paymentType: 'contact_unlock',
      targetProfileId: profile.id,
      onSuccess: () => {
        window.location.reload();
      }
    });
  };

  useEffect(() => {
    const fetchProfileDetails = async () => {
      setLoading(true);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        setCurrentUser(user);

        // 1. Fetch the target profile by profile_id, joining users table for digital verification flags
        const { data: profileData } = await supabase
          .from('profiles')
          .select('*, users(email_verified, mobile_verified)')
          .eq('profile_id', id)
          .maybeSingle();

        if (!profileData) {
          setProfile(null);
          setLoading(false);
          return;
        }

        // Resolve current user's database ID from auth_user_id and check premium status
        let resolvedUserId = null;
        if (user) {
          const { data: userRow } = await supabase
            .from('users')
            .select('id, role, profiles(is_premium)')
            .eq('auth_user_id', user.id)
            .maybeSingle();
          resolvedUserId = userRow?.id || user.id;
          setCurrentUserId(resolvedUserId);

          const isProfilePremium = (userRow as any)?.profiles?.is_premium || false;
          const isRolePremium = userRow?.role !== 'user' && userRow?.role !== 'free';
          setIsPremium(isProfilePremium || isRolePremium);
        }

        // 2. Check blocks (two queries to bypass nested or parser checks)
        if (user && resolvedUserId) {
          const { data: blocked1 } = await supabase
            .from('blocked_users')
            .select('*')
            .eq('blocker_user_id', resolvedUserId)
            .eq('blocked_user_id', profileData.user_id)
            .maybeSingle();
          
          const { data: blocked2 } = await supabase
            .from('blocked_users')
            .select('*')
            .eq('blocker_user_id', profileData.user_id)
            .eq('blocked_user_id', resolvedUserId)
            .maybeSingle();

          if (blocked1 || blocked2) {
            setIsBlocked(true);
            setLoading(false);
            return;
          }

          // Check connection request status
          const { data: req1 } = await supabase
            .from('match_requests')
            .select('*')
            .eq('sender_user_id', resolvedUserId)
            .eq('receiver_user_id', profileData.user_id)
            .maybeSingle();
          
          const { data: req2 } = await supabase
            .from('match_requests')
            .select('*')
            .eq('sender_user_id', profileData.user_id)
            .eq('receiver_user_id', resolvedUserId)
            .maybeSingle();

          const request = req1 || req2;
          if (request) {
            setConnectionStatus(request.status);
            if (request.status === 'accepted') {
              setInterestSent(true);
            }
          }
        }

        // 3. Fetch all approved gallery images for this candidate
        const { data: galleryList } = await supabase
          .from('gallery_images')
          .select('*')
          .eq('user_id', profileData.user_id)
          .eq('moderation_status', 'approved')
          .order('sort_order', { ascending: true })
          .order('uploaded_at', { ascending: true });

        const imagesArray = galleryList || [];
        setGalleryImages(imagesArray);

        // Find primary profile photo or fall back to first image
        const primaryImg = imagesArray.find((img: any) => img.is_profile_picture) || imagesArray[0];

        setProfile({
          ...profileData,
          imageUrl: primaryImg?.image_url || null
        });

        // 4. Check contact visibility
        if (user) {
          try {
            const res = await fetch('/api/profile/contact-details', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ profileId: id }),
            });
            const data = await res.json();
            if (res.ok && data.success) {
              setContactDetails({
                email: data.email || 'N/A',
                phone: data.phone || 'N/A',
                premiumLocked: false,
                unlocked: data.unlocked || false
              });
            } else if (data.upgrade_required) {
              // Credits exhausted — show upgrade modal
              setContactDetails({ email: '🔒 Credits Exhausted', phone: '🔒 Credits Exhausted', premiumLocked: true, unlocked: false });
            } else {
              setContactDetails({
                email: '🔒 Connection Gated',
                phone: '🔒 Connection Gated',
                premiumLocked: false,
                unlocked: false
              });
            }
          } catch (err) {
            console.error('Error fetching contact details API:', err);
            setContactDetails({
              email: 'Error loading details',
              phone: 'Error loading details',
              premiumLocked: false,
              unlocked: false
            });
          }
        }

      } catch (err) {
        console.error('Error fetching candidate details:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchProfileDetails();
  }, [id, connectionStatus]);

  const handleConnect = async () => {
    if (!currentUser || !profile) {
      alert('Please log in to send a connection request.');
      router.push('/login');
      return;
    }
    
    try {
      const { error } = await supabase
        .from('match_requests')
        .insert({
          sender_user_id: currentUserId,
          receiver_user_id: profile.user_id,
          status: 'pending'
        });

      if (error) {
        alert('Failed to send connection request: ' + error.message);
      } else {
        setInterestSent(true);
        setConnectionStatus('pending');
        alert(`Connection interest request sent to ${profile.first_name || 'Candidate'}!`);
      }
    } catch (e: any) {
      alert('Error connecting: ' + e.message);
    }
  };

  const handleBlockUser = async () => {
    if (!currentUser || !profile) return;
    const confirmBlock = confirm(`Are you sure you want to block ${profile.first_name || 'this member'}? This will also remove any chat history or pending requests between you. Proceed?`);
    if (!confirmBlock) return;

    try {
      const { error } = await safetyService.blockUser(profile.user_id, 'Blocked from profile page');
      if (error) {
        alert('Failed to block user: ' + error.message);
      } else {
        alert('User blocked successfully.');
        router.push('/dashboard/matches');
      }
    } catch (e: any) {
      alert('Error blocking: ' + e.message);
    }
  };

  const handleReportProfile = async () => {
    if (!currentUser || !profile) return;
    
    const catChoice = prompt(
      'Select a report category (Enter number 1-5):\n' +
      '1. Fake Profile\n' +
      '2. Spam\n' +
      '3. Harassment\n' +
      '4. Inappropriate Content\n' +
      '5. Other'
    );
    if (!catChoice) return;
    
    let category: 'Fake Profile' | 'Spam' | 'Harassment' | 'Inappropriate Content' | 'Other' = 'Other';
    if (catChoice === '1') category = 'Fake Profile';
    else if (catChoice === '2') category = 'Spam';
    else if (catChoice === '3') category = 'Harassment';
    else if (catChoice === '4') category = 'Inappropriate Content';
    else if (catChoice === '5') category = 'Other';
    else {
      alert('Invalid choice. Categorized as "Other".');
    }

    const reason = prompt('Please describe the reason for this report:');
    if (!reason) return;

    try {
      const { error } = await safetyService.reportProfile(profile.user_id, category, reason);
      if (error) {
        alert('Failed to file report: ' + error.message);
      } else {
        setReported(true);
        alert('Profile reported. A moderator will review this report within 24 hours.');
      }
    } catch (e: any) {
      alert('Error reporting: ' + e.message);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center p-12 bg-sandal-50/20 dark:bg-zinc-950/20 min-h-[60vh]">
        <div className="flex flex-col items-center gap-3 text-sm text-zinc-500 font-mono">
          <div className="h-8 w-8 border-4 border-maroon-500 border-t-transparent rounded-full animate-spin" />
          Loading Candidate Profile...
        </div>
      </div>
    );
  }

  if (isBlocked) {
    return (
      <div className="max-w-md mx-auto px-6 py-12 text-center bg-white dark:bg-zinc-900 border border-sandal-200 dark:border-zinc-800 rounded-3xl mt-12 flex flex-col items-center gap-5 shadow-lg">
        <Ban className="h-12 w-12 text-red-500" />
        <h2 className="text-xl font-serif font-bold text-zinc-850 dark:text-zinc-200">Profile Unavailable</h2>
        <p className="text-xs text-zinc-500 dark:text-zinc-450 leading-relaxed font-light">
          This profile is no longer accessible because a block exists between your account and this member.
        </p>
        <Link href="/dashboard/matches" className="px-5 py-2.5 rounded-full luxury-gradient text-white text-xs font-semibold uppercase tracking-wider">
          Return to Matches
        </Link>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="max-w-md mx-auto px-6 py-12 text-center bg-white dark:bg-zinc-900 border border-sandal-200 dark:border-zinc-800 rounded-3xl mt-12 flex flex-col items-center gap-5 shadow-lg">
        <ShieldAlert className="h-12 w-12 text-gold-600" />
        <h2 className="text-xl font-serif font-bold text-zinc-850 dark:text-zinc-200">Candidate Not Found</h2>
        <p className="text-xs text-zinc-500 dark:text-zinc-450 leading-relaxed font-light">
          The requested matrimonial profile could not be found or has been suspended by administrators.
        </p>
        <Link href="/dashboard/matches" className="px-5 py-2.5 rounded-full luxury-gradient text-white text-xs font-semibold uppercase tracking-wider">
          Return to Matches
        </Link>
      </div>
    );
  }

  const initials = `${profile.first_name?.[0] || ''}${profile.last_name?.[0] || ''}`.toUpperCase() || 'M';
  const fullName = `${profile.first_name} ${profile.last_name || ''}`.trim();
  const isPremiumMatch = profile.is_premium;

  return (
    <div className="max-w-4xl mx-auto px-4 py-12 md:py-16 text-left flex flex-col gap-6">
      
      {/* Back button */}
      <button
        onClick={() => router.back()}
        className="self-start flex items-center gap-1.5 text-xs font-bold text-zinc-500 hover:text-maroon-600 uppercase tracking-wider cursor-pointer"
      >
        <ArrowLeft className="h-4 w-4" /> Back to matches
      </button>

      {/* Main Profile Header Card */}
      <div className="bg-white dark:bg-zinc-900 rounded-3xl shadow-xl border border-sandal-200 dark:border-zinc-800/80 overflow-hidden flex flex-col md:flex-row items-stretch">
        
        {/* Photo Container with Watermark */}
        <div className="md:w-1/3 bg-gradient-to-tr from-sandal-100 to-rose-50 dark:from-zinc-850 dark:to-zinc-900 p-6 flex flex-col items-center justify-center relative min-h-[250px] overflow-hidden select-none">
          {galleryImages.length > 0 ? (
            <div className="relative w-full aspect-[3/4] max-w-[200px] rounded-2xl overflow-hidden border border-zinc-200 dark:border-zinc-800 shadow-md">
              <img 
                src={galleryImages[activeSlide].image_url} 
                alt={`${fullName} - Photo ${activeSlide + 1}`} 
                className="w-full h-full object-cover pointer-events-none select-none"
              />
              {/* Security Image Watermark */}
              <div className="absolute inset-0 bg-black/5 flex items-center justify-center pointer-events-none select-none overflow-hidden">
                <span className="text-[9px] font-black text-white/30 tracking-widest rotate-45 scale-110 uppercase">
                  GOKUL VIVAHAM
                </span>
              </div>
              
              {/* Slider Overlays */}
              {galleryImages.length > 1 && (
                <>
                  <button 
                    onClick={() => setActiveSlide(prev => (prev === 0 ? galleryImages.length - 1 : prev - 1))}
                    className="absolute left-1.5 top-1/2 transform -translate-y-1/2 w-6.5 h-6.5 rounded-full bg-black/60 hover:bg-black/85 flex items-center justify-center text-white cursor-pointer transition-colors shadow"
                  >
                    <ChevronLeft className="h-3.5 w-3.5" />
                  </button>
                  <button 
                    onClick={() => setActiveSlide(prev => (prev === galleryImages.length - 1 ? 0 : prev + 1))}
                    className="absolute right-1.5 top-1/2 transform -translate-y-1/2 w-6.5 h-6.5 rounded-full bg-black/60 hover:bg-black/85 flex items-center justify-center text-white cursor-pointer transition-colors shadow"
                  >
                    <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                  
                  {/* Dots Indicator */}
                  <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 flex gap-1 bg-black/50 px-2 py-0.5 rounded-full border border-zinc-800/10">
                    {galleryImages.map((_, idx) => (
                      <span 
                        key={idx} 
                        className={`h-1.5 rounded-full transition-all ${
                          idx === activeSlide ? 'w-3 bg-gold-400' : 'w-1.5 bg-zinc-400'
                        }`}
                      />
                    ))}
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="h-32 w-32 rounded-full bg-sandal-200/50 dark:bg-zinc-800 border-2 border-gold-400/20 flex items-center justify-center font-serif text-3xl font-bold text-maroon-700 dark:text-gold-450 shadow-inner">
              {initials}
            </div>
          )}
          
          <div className="absolute top-4 left-4">
            <VerificationBadges profile={profile} size="sm" />
          </div>

          <div className="absolute bottom-4 right-4 bg-maroon-500/90 text-white px-3 py-1 rounded-full text-xs font-bold shadow flex items-center gap-1">
            <Sparkles className="h-3.5 w-3.5 text-gold-400" /> {profile.age} Yrs • Match
          </div>
        </div>

        {/* Headline details */}
        <div className="md:w-2/3 p-6 md:p-8 flex flex-col justify-between gap-6">
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between gap-2">
              <h1 className="text-2xl md:text-3xl font-serif font-bold text-zinc-900 dark:text-zinc-50">
                {fullName}
              </h1>
              <span className="text-xs text-zinc-400 font-mono shrink-0">{profile.profile_id}</span>
            </div>
            
            <span className="text-sm font-semibold text-gold-650 dark:text-gold-400 uppercase tracking-widest">
              {profile.education || 'Education Details Pending'} • {profile.city || 'Location Pending'}
            </span>

            <VerificationBadges profile={profile} size="md" className="mt-1" />

            <p className="text-xs text-zinc-550 dark:text-zinc-450 font-light mt-1">
              Astrology Matching: <span className="font-semibold text-gold-600 dark:text-gold-450">Traditional compatibility check active</span>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-4 border-t border-zinc-150 dark:border-zinc-850">
            <button
              onClick={() => setIsShortlisted(!isShortlisted)}
              className={`px-4 h-10 rounded-full border text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer ${
                isShortlisted 
                  ? 'bg-rose-500/10 border-rose-300 text-rose-600' 
                  : 'border-zinc-200 dark:border-zinc-800 text-zinc-500 hover:bg-zinc-50'
              }`}
            >
              {isShortlisted ? '♥ Shortlisted' : '♡ Shortlist'}
            </button>

            <button
              onClick={handleConnect}
              disabled={interestSent}
              className="px-6 h-10 rounded-full luxury-gradient text-white text-xs font-semibold uppercase tracking-widest hover:opacity-90 shadow-md transition-all cursor-pointer disabled:opacity-50"
            >
              {connectionStatus === 'pending' ? 'Pending Acceptance' : interestSent ? 'Connected ✓' : 'Connect Interest'}
            </button>
          </div>
        </div>

      </div>

      {/* Profile Details Tab Content */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
        
        {/* Left Side: Overview info */}
        <div className="md:col-span-8 bg-white dark:bg-zinc-900 p-6 md:p-8 rounded-3xl shadow-md border border-sandal-200 dark:border-zinc-800/80 flex flex-col gap-6">
          
          <div className="flex flex-col gap-2">
            <span className="text-xs font-bold text-maroon-600 dark:text-gold-400 uppercase tracking-widest">About Candidate</span>
            <p className="text-sm font-light text-zinc-650 dark:text-zinc-300 leading-relaxed">
              {profile.about_me || 'No description provided by candidate.'}
            </p>
          </div>

          <div className="h-px bg-zinc-100 dark:bg-zinc-850" />

          {/* Details Tables */}
          <div className="flex flex-col gap-4">
            <span className="text-xs font-bold text-maroon-600 dark:text-gold-400 uppercase tracking-widest">Candidate Details</span>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-light text-zinc-655 dark:text-zinc-400">
              <div className="flex justify-between border-b border-zinc-100 dark:border-zinc-850 pb-2">
                <span className="font-semibold text-zinc-850 dark:text-zinc-200">Age / DOB:</span>
                <span>{profile.age || 'N/A'} yrs / {profile.date_of_birth || 'N/A'}</span>
              </div>
              <div className="flex justify-between border-b border-zinc-100 dark:border-zinc-850 pb-2">
                <span className="font-semibold text-zinc-850 dark:text-zinc-200">Height / Weight:</span>
                <span>{profile.height_cm ? `${profile.height_cm} cm` : 'N/A'} / {profile.weight_kg ? `${profile.weight_kg} kg` : 'N/A'}</span>
              </div>
              <div className="flex justify-between border-b border-zinc-100 dark:border-zinc-850 pb-2">
                <span className="font-semibold text-zinc-850 dark:text-zinc-200">Religion / Caste:</span>
                <span>{profile.religion || 'Hindu'} • {profile.caste || 'N/A'} {profile.sub_caste ? `(${profile.sub_caste})` : ''}</span>
              </div>
              <div className="flex justify-between border-b border-zinc-100 dark:border-zinc-850 pb-2">
                <span className="font-semibold text-zinc-850 dark:text-zinc-200">Native Place:</span>
                <span>{profile.native_place || 'N/A'}</span>
              </div>
              <div className="flex justify-between border-b border-zinc-100 dark:border-zinc-850 pb-2">
                <span className="font-semibold text-zinc-850 dark:text-zinc-200">Education Details:</span>
                <span>{profile.education || 'N/A'}</span>
              </div>
              <div className="flex justify-between border-b border-zinc-100 dark:border-zinc-850 pb-2">
                <span className="font-semibold text-zinc-850 dark:text-zinc-200">Employer / Income:</span>
                <span>{profile.company_name || 'N/A'} • {profile.annual_income ? `₹${profile.annual_income.toLocaleString()}` : 'N/A'}</span>
              </div>
            </div>
          </div>

          <div className="h-px bg-zinc-100 dark:bg-zinc-850" />

          {/* Family Details */}
          <div className="flex flex-col gap-4">
            <span className="text-xs font-bold text-maroon-600 dark:text-gold-400 uppercase tracking-widest flex items-center gap-1">
              <Users className="h-4 w-4 shrink-0" /> Family Background
            </span>
            <ul className="text-xs space-y-2.5 font-light text-zinc-655 dark:text-zinc-400">
              <li><strong className="font-semibold text-zinc-850 dark:text-zinc-200">Father Details:</strong> {profile.father_name || 'N/A'} {profile.father_occupation ? `(${profile.father_occupation})` : ''}</li>
              <li><strong className="font-semibold text-zinc-850 dark:text-zinc-200">Mother Details:</strong> {profile.mother_name || 'N/A'} {profile.mother_occupation ? `(${profile.mother_occupation})` : ''}</li>
              <li><strong className="font-semibold text-zinc-850 dark:text-zinc-200">Siblings Details:</strong> {profile.siblings || 'N/A'}</li>
              <li><strong className="font-semibold text-zinc-850 dark:text-zinc-200">Family Setup:</strong> {profile.family_type || 'Nuclear'} Family setup</li>
            </ul>
          </div>

          <div className="h-px bg-zinc-100 dark:bg-zinc-850" />

          {/* Contact Details (Hiding Phone/Email until connection accepted or unlocked) */}
          <div className="flex flex-col gap-4 p-5 rounded-2xl bg-sandal-50/30 dark:bg-zinc-950/30 border border-sandal-200/40 dark:border-zinc-800/80">
            <div className="flex justify-between items-center flex-wrap gap-2">
              <span className="text-xs font-bold text-maroon-600 dark:text-gold-400 uppercase tracking-widest flex items-center gap-1.5">
                <Phone className="h-4 w-4 shrink-0" /> Secure Contact Details
              </span>
              {contactDetails.unlocked && (
                <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-450 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 rounded flex items-center gap-1">
                  <Unlock className="h-3 w-3" /> Unlocked Permanently
                </span>
              )}
            </div>
            
            {connectionStatus === 'accepted' || contactDetails.unlocked ? (
              contactDetails.premiumLocked ? (
                <div className="flex flex-col gap-3 items-center text-center p-3">
                  <p className="text-xs font-semibold text-amber-600 dark:text-gold-450 leading-relaxed flex items-center gap-1">
                    🔒 Premium Upgrade Required
                  </p>
                  <p className="text-xs font-light text-zinc-500 dark:text-zinc-450 leading-relaxed">
                    Your connection request is accepted, but viewing direct contact details is reserved for Premium Members.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-3 mt-2 items-start sm:items-center">
                    <button
                      onClick={() => setShowUpgradePrompt(true)}
                      className="px-4 py-2 bg-zinc-150 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 text-[10px] font-bold uppercase tracking-wider rounded-lg shadow-sm transition-all cursor-pointer focus:outline-none"
                    >
                      Upgrade Plan
                    </button>
                    <div className="flex flex-col gap-1 items-start">
                      <button
                        onClick={handleUnlockContact}
                        disabled={checkoutLoading}
                        className="px-4 py-2 luxury-gradient text-white text-[10px] font-bold uppercase tracking-wider rounded-lg shadow-sm transition-all cursor-pointer focus:outline-none"
                      >
                        {checkoutLoading ? 'Processing...' : 'Unlock This Contact (₹199)'}
                      </button>
                      <span className="text-[9px] text-zinc-500 dark:text-zinc-450 leading-none">
                        Base: ₹169 | GST: ₹30 | Total: ₹199 (incl. GST)
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-light text-zinc-655 dark:text-zinc-400 animate-in fade-in duration-300">
                  <div className="flex items-center gap-2 border-b border-zinc-100 dark:border-zinc-850 pb-2">
                    <Phone className="h-4 w-4 text-emerald-600 shrink-0" />
                    <span className="font-semibold text-zinc-800 dark:text-zinc-200">{contactDetails.phone}</span>
                  </div>
                  <div className="flex items-center gap-2 border-b border-zinc-100 dark:border-zinc-850 pb-2">
                    <Mail className="h-4 w-4 text-emerald-600 shrink-0" />
                    <span className="font-semibold text-zinc-800 dark:text-zinc-200">{contactDetails.email}</span>
                  </div>
                </div>
              )
            ) : (
              <div className="flex flex-col gap-2.5 text-center p-3">
                <p className="text-xs font-light text-zinc-500 dark:text-zinc-450 leading-relaxed">
                  To protect member safety, contact details are private. You must connect and receive their acceptance before phone numbers or emails are visible.
                </p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center items-center mt-2">
                  <button 
                    onClick={handleConnect}
                    className="px-4 py-2 border border-maroon-500/30 hover:bg-maroon-500/5 text-maroon-700 dark:text-gold-450 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-colors cursor-pointer"
                  >
                    Send Connection Request
                  </button>
                  <div className="flex flex-col gap-1 items-center">
                    <button
                      onClick={handleUnlockContact}
                      disabled={checkoutLoading}
                      className="px-4 py-2 luxury-gradient text-white text-[10px] font-bold uppercase tracking-wider rounded-lg shadow-sm transition-all cursor-pointer focus:outline-none"
                    >
                      {checkoutLoading ? 'Processing...' : 'Unlock Directly (₹199)'}
                    </button>
                    <span className="text-[9px] text-zinc-500 dark:text-zinc-450 leading-none mt-1">
                      Base: ₹169 | GST: ₹30 | Total: ₹199 (incl. GST)
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Astrology details */}
        <div className="md:col-span-4 flex flex-col gap-6">
          <div className="bg-white dark:bg-zinc-900 p-6 rounded-3xl shadow-md border border-sandal-200 dark:border-zinc-800/80 text-left flex flex-col gap-4">
            <span className="text-xs font-bold text-maroon-600 dark:text-gold-400 uppercase tracking-widest flex items-center gap-1">
              <Award className="h-4 w-4 shrink-0" /> Horoscopic Details
            </span>
            
            {isPremium ? (
              <div className="flex flex-col gap-2.5 text-xs font-light text-zinc-655 dark:text-zinc-400 animate-in fade-in duration-300">
                <div className="flex justify-between border-b border-zinc-100 dark:border-zinc-850 pb-2">
                  <span className="font-semibold text-zinc-850 dark:text-zinc-200">Rasi:</span>
                  <span>{profile.rasi || 'N/A'}</span>
                </div>
                <div className="flex justify-between border-b border-zinc-100 dark:border-zinc-850 pb-2">
                  <span className="font-semibold text-zinc-855 dark:text-zinc-200">Star / Nakshatra:</span>
                  <span>{profile.nakshatra || 'N/A'}</span>
                </div>
                <div className="flex justify-between border-b border-zinc-100 dark:border-zinc-850 pb-2">
                  <span className="font-semibold text-zinc-855 dark:text-zinc-200">Gothram:</span>
                  <span>{profile.gothram || 'N/A'}</span>
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-950/20 border border-zinc-100 dark:border-zinc-850/50 text-center flex flex-col gap-2">
                <span className="text-xs text-zinc-400 font-light italic">🔒 Astro coordinates gated (Premium only)</span>
                <button
                  onClick={() => setShowUpgradePrompt(true)}
                  className="text-[10px] font-bold text-gold-650 hover:underline uppercase tracking-wider cursor-pointer focus:outline-none"
                >
                  Unlock Astro Details
                </button>
              </div>
            )}

            <div className="h-px bg-zinc-100 dark:bg-zinc-850 my-2" />

            <button
              onClick={() => {
                if (isPremium) {
                  alert(`Horoscope download initiated for Profile ID ${profile.profile_id}`);
                } else {
                  setShowUpgradePrompt(true);
                }
              }}
              className={`w-full py-2.5 rounded-xl border text-center text-xs font-bold transition-all cursor-pointer ${
                isPremium 
                  ? "border-gold-500/30 text-gold-650 dark:text-gold-400 hover:bg-gold-500/5" 
                  : "border-zinc-200 dark:border-zinc-800 text-zinc-450 hover:bg-zinc-50 dark:hover:bg-zinc-850/20"
              }`}
            >
              {isPremium ? "Download Horoscope PDF" : "🔒 Unlock Horoscope Download"}
            </button>
          </div>

          {/* Block & Report Buttons Container */}
          <div className="flex flex-col gap-2">
            <button
              onClick={handleBlockUser}
              className="w-full text-xs text-zinc-550 dark:text-zinc-400 hover:text-red-500 dark:hover:text-red-400 font-semibold flex items-center gap-1.5 justify-center py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 hover:bg-red-500/5 transition-colors cursor-pointer"
            >
              <Ban className="h-4 w-4 shrink-0" /> Block this Member
            </button>

            <button
              onClick={handleReportProfile}
              disabled={reported}
              className="w-full text-xs text-red-550 dark:text-red-400 hover:text-red-600 font-semibold flex items-center gap-1.5 justify-center py-2.5 rounded-xl border border-red-500/10 hover:bg-red-500/5 transition-colors cursor-pointer disabled:opacity-50"
            >
              <ShieldAlert className="h-4 w-4 shrink-0" /> {reported ? 'Profile Reported' : 'Report Inappropriate Profile'}
            </button>
          </div>
        </div>

      </div>

      {showUpgradePrompt && (
        <UpgradeModal
          feature={upgradeFeature}
          onClose={() => setShowUpgradePrompt(false)}
        />
      )}
    </div>
  );
}
