'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  User, ShieldCheck, Star, Sparkles, 
  CheckCircle2, Award, ArrowRight,
  Users, Edit3, Phone, Mail
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import {complianceService} from '@/services/compliance.service';
import VerificationBadges from '@/components/ui/VerificationBadges';

export default function DashboardProfilePage() {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [profilePhoto, setProfilePhoto] = useState<string | null>(null);
  const [contactInfo, setContactInfo] = useState<{ email: string | null; mobileNumber: string | null } | null>(null);
  const [horoscopeUrl, setHoroscopeUrl] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const handleExportData = async () => {
    try {
      const {data,error}=await complianceService.exportUserData();
      if(error)throw error;
      const url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}));
      const anchor=document.createElement('a');anchor.href=url;anchor.download='gokul_vivaham_account_export.json';document.body.appendChild(anchor);anchor.click();anchor.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
    }catch(error){alert(error instanceof Error?error.message:'Unable to prepare complete account export');}
  };
  const handleDeleteAccountRequest = () => {window.location.href='/dashboard/settings';};
  useEffect(() => {
    const fetchUserProfile = async () => {
      setLoading(true);
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
        setCurrentUserId(currentUserId);

        // Fetch profile
        const { data } = await supabase
          .from('profiles')
          .select('*')
          .eq('user_id', currentUserId)
          .maybeSingle();

        if (data) {
          setProfile(data);

          // Fetch profile photo
          const { data: gallery } = await supabase
            .from('gallery_images')
            .select('image_url')
            .eq('user_id', currentUserId)
            .eq('is_profile_picture', true)
            .limit(1)
            .maybeSingle();

          if (gallery) {
            setProfilePhoto(gallery.image_url);
          }

          // Fetch contact details from users table
          const { data: userData } = await supabase
            .from('users')
            .select('email, mobile_number')
            .eq('id', currentUserId)
            .maybeSingle();

          if (userData) {
            setContactInfo({
              email: userData.email,
              mobileNumber: userData.mobile_number
            });
          } else {
            setContactInfo({
              email: user.email || null,
              mobileNumber: null
            });
          }

          // Fetch horoscope uploads
          const { data: horoscope } = await supabase
            .from('horoscope_uploads')
            .select('file_url')
            .eq('user_id', currentUserId)
            .limit(1)
            .maybeSingle();

          if (horoscope) {
            setHoroscopeUrl(horoscope.file_url);
          }
        }
      } catch (err) {
        console.error('Error fetching user profile:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchUserProfile();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 min-h-[50vh] text-sm text-zinc-500 font-mono gap-3">
        <div className="h-8 w-8 border-4 border-maroon-500 border-t-transparent rounded-full animate-spin" />
        Loading Profile Details...
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="p-8 md:p-12 rounded-3xl bg-white dark:bg-zinc-900 border border-sandal-200 dark:border-zinc-800 shadow-xl text-center flex flex-col items-center gap-6 max-w-lg mx-auto">
        <div className="w-16 h-16 rounded-full bg-sandal-100 dark:bg-zinc-800 flex items-center justify-center text-maroon-600 dark:text-gold-450 shrink-0">
          <User className="h-8 w-8" />
        </div>
        <div className="flex flex-col gap-2">
          <h2 className="text-xl font-serif font-bold text-zinc-800 dark:text-zinc-200">No Profile Record Found</h2>
          <p className="text-xs text-zinc-550 dark:text-zinc-400 font-light leading-relaxed">
            It looks like your matrimony profile record hasn't been created yet or is pending authorization. Let's create it now!
          </p>
        </div>
        <Link
          href="/dashboard/edit-profile"
          className="flex items-center gap-1.5 px-6 py-2.5 rounded-full luxury-gradient text-white text-xs font-semibold uppercase tracking-wider shadow hover:opacity-90 transition-all duration-200"
        >
          Create Profile Now <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    );
  }

  const initials = `${profile.first_name?.[0] || ''}${profile.last_name?.[0] || ''}`.toUpperCase() || 'M';
  const fullName = `${profile.first_name} ${profile.last_name || ''}`.trim();
  const profileId = profile.profile_id;
  const memberLevel = profile.is_premium ? 'Premium Pack Member' : 'Standard Member';

  return (
    <div className="flex flex-col gap-6 text-left">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex flex-col">
          <h1 className="text-2xl md:text-3xl font-serif font-bold text-zinc-900 dark:text-zinc-50">
            My Matrimony Profile
          </h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 font-light mt-1">
            This is how your profile appears to other matrimony members
          </p>
        </div>
        <Link
          href="/dashboard/edit-profile"
          className="flex items-center gap-1.5 px-5 py-2.5 rounded-full border border-maroon-500/30 text-maroon-700 dark:text-gold-450 font-semibold text-xs uppercase tracking-wider hover:bg-maroon-500/5 transition-all"
        >
          <Edit3 className="h-4 w-4" /> Edit Profile Details
        </Link>
      </div>

      {/* Main Profile Header Card */}
      <div className="bg-white dark:bg-zinc-900 rounded-3xl shadow-xl border border-sandal-200 dark:border-zinc-800/80 overflow-hidden flex flex-col md:flex-row items-stretch">
        
        {/* Photo Container */}
        <div className="md:w-1/3 bg-gradient-to-tr from-sandal-100 to-rose-50 dark:from-zinc-850 dark:to-zinc-900 p-6 flex flex-col items-center justify-center relative min-h-[250px] shrink-0 border-r border-zinc-100 dark:border-zinc-850">
          {profilePhoto ? (
            <img 
              src={profilePhoto} 
              alt={fullName} 
              className="h-32 w-32 rounded-full object-cover border-2 border-gold-400 shadow-md"
            />
          ) : (
            <div className="h-32 w-32 rounded-full bg-sandal-200/50 dark:bg-zinc-800 border-2 border-gold-400/20 flex items-center justify-center font-serif text-3xl font-bold text-maroon-700 dark:text-gold-450 shadow-inner">
              {initials}
            </div>
          )}

          <div className="absolute top-4 left-4">
            <VerificationBadges profile={profile} size="sm" />
          </div>

          <div className="absolute bottom-4 right-4 bg-maroon-500/95 text-white px-3 py-1 rounded-full text-[10px] font-bold shadow flex items-center gap-1 tracking-wider uppercase">
            <Sparkles className="h-3.5 w-3.5 text-gold-400" /> {memberLevel}
          </div>
        </div>

        {/* Headline details */}
        <div className="md:w-2/3 p-6 md:p-8 flex flex-col justify-between gap-6">
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-2xl md:text-3xl font-serif font-bold text-zinc-900 dark:text-zinc-50">
                {fullName}
              </h2>
              <span className="text-xs text-zinc-400 font-mono shrink-0">ID: {profileId}</span>
            </div>
            
            <span className="text-sm font-semibold text-gold-650 dark:text-gold-450 uppercase tracking-widest">
              {profile.education || 'Education Details Pending'} • {profile.city || 'Location Pending'}
            </span>

            <VerificationBadges profile={profile} size="md" className="mt-1" />

            <p className="text-xs text-zinc-500 dark:text-zinc-400 font-light mt-2 leading-relaxed">
              Profile Created: {profile.created_at && Number.isFinite(Date.parse(profile.created_at)) ? new Date(profile.created_at).toLocaleDateString() : 'Not available'} • Visibility: <span className="font-semibold text-emerald-600 uppercase">{profile.visibility || 'Public'}</span>
            </p>
          </div>

          <div className="text-xs font-light text-zinc-650 dark:text-zinc-400 italic border-l-2 border-sandal-300 dark:border-zinc-800 pl-3 py-1">
            "Your profile represents your compatibility details. Complete all fields to enhance astro matching algorithms."
          </div>
        </div>

      </div>

      {/* Profile Details Tab Content */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Side: Overview info */}
        <div className="lg:col-span-8 bg-white dark:bg-zinc-900 p-6 md:p-8 rounded-3xl shadow-md border border-sandal-200 dark:border-zinc-800/80 flex flex-col gap-6">
          
          <div className="flex flex-col gap-2">
            <span className="text-xs font-bold text-maroon-600 dark:text-gold-450 uppercase tracking-widest">About Me</span>
            <p className="text-sm font-light text-zinc-650 dark:text-zinc-300 leading-relaxed">
              {profile.about_me || 'Tell members about yourself. Describe your hobbies, values, and traits.'}
            </p>
          </div>

          <div className="h-px bg-zinc-100 dark:bg-zinc-850" />

          {/* Details Tables */}
          <div className="flex flex-col gap-4">
            <span className="text-xs font-bold text-maroon-600 dark:text-gold-450 uppercase tracking-widest">Personal Details</span>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-light text-zinc-650 dark:text-zinc-400">
              <div className="flex justify-between border-b border-zinc-100 dark:border-zinc-850 pb-2">
                <span className="font-semibold text-zinc-855 dark:text-zinc-200">Age / DOB:</span>
                <span>{profile.age || 'N/A'} yrs / {profile.date_of_birth || 'N/A'}</span>
              </div>
              <div className="flex justify-between border-b border-zinc-100 dark:border-zinc-850 pb-2">
                <span className="font-semibold text-zinc-855 dark:text-zinc-200">Gender / Marital Status:</span>
                <span>{profile.gender || 'N/A'} / {profile.marital_status || 'N/A'}</span>
              </div>
              <div className="flex justify-between border-b border-zinc-100 dark:border-zinc-850 pb-2">
                <span className="font-semibold text-zinc-855 dark:text-zinc-200">Height / Weight:</span>
                <span>{profile.height_cm ? `${profile.height_cm} cm` : 'N/A'} / {profile.weight_kg ? `${profile.weight_kg} kg` : 'N/A'}</span>
              </div>
              <div className="flex justify-between border-b border-zinc-100 dark:border-zinc-850 pb-2">
                <span className="font-semibold text-zinc-855 dark:text-zinc-200">Physical Status:</span>
                <span>{profile.physical_status || 'Normal'}</span>
              </div>
              <div className="flex justify-between border-b border-zinc-100 dark:border-zinc-850 pb-2">
                <span className="font-semibold text-zinc-855 dark:text-zinc-200">Religion / Tongue:</span>
                <span>{profile.religion || 'Hindu'} / {profile.mother_tongue || 'Tamil'}</span>
              </div>
              <div className="flex justify-between border-b border-zinc-100 dark:border-zinc-850 pb-2">
                <span className="font-semibold text-zinc-855 dark:text-zinc-200">Caste / Sub-Caste:</span>
                <span>{profile.caste || 'N/A'} {profile.sub_caste ? `(${profile.sub_caste})` : ''}</span>
              </div>
              <div className="flex justify-between border-b border-zinc-100 dark:border-zinc-850 pb-2">
                <span className="font-semibold text-zinc-855 dark:text-zinc-200">Native Place / Location:</span>
                <span>{profile.native_place || 'N/A'} / {profile.city || 'N/A'}</span>
              </div>
              <div className="flex justify-between border-b border-zinc-100 dark:border-zinc-850 pb-2">
                <span className="font-semibold text-zinc-855 dark:text-zinc-200">Education Details:</span>
                <span className="truncate max-w-[150px]">{profile.education || 'N/A'}</span>
              </div>
              <div className="flex justify-between border-b border-zinc-100 dark:border-zinc-850 pb-2">
                <span className="font-semibold text-zinc-855 dark:text-zinc-200">Occupation / Employer:</span>
                <span className="truncate max-w-[150px]">{profile.occupation || 'N/A'} {profile.company_name ? `(${profile.company_name})` : ''}</span>
              </div>
              <div className="flex justify-between border-b border-zinc-100 dark:border-zinc-850 pb-2">
                <span className="font-semibold text-zinc-855 dark:text-zinc-200">Annual Income:</span>
                <span>{profile.annual_income ? `₹${profile.annual_income.toLocaleString()}` : 'N/A'}</span>
              </div>
            </div>
          </div>

          <div className="h-px bg-zinc-100 dark:bg-zinc-850" />

          {/* Family Details */}
          <div className="flex flex-col gap-4">
            <span className="text-xs font-bold text-maroon-600 dark:text-gold-400 uppercase tracking-widest flex items-center gap-1">
              <Users className="h-4 w-4 shrink-0" /> Family Background
            </span>
            <ul className="text-xs space-y-2.5 font-light text-zinc-650 dark:text-zinc-450">
              <li>
                <strong className="font-semibold text-zinc-800 dark:text-zinc-200">Father Details:</strong> {profile.father_name || 'N/A'} {profile.father_occupation ? `(${profile.father_occupation})` : ''}
              </li>
              <li>
                <strong className="font-semibold text-zinc-800 dark:text-zinc-200">Mother Details:</strong> {profile.mother_name || 'N/A'} {profile.mother_occupation ? `(${profile.mother_occupation})` : ''}
              </li>
              <li>
                <strong className="font-semibold text-zinc-800 dark:text-zinc-200">Siblings Details:</strong> {profile.siblings || 'N/A'}
              </li>
              <li>
                <strong className="font-semibold text-zinc-800 dark:text-zinc-200">Family Type:</strong> {profile.family_type || 'Nuclear'} Family setup
              </li>
            </ul>
          </div>

          <div className="h-px bg-zinc-100 dark:bg-zinc-850" />

          {/* Registered Contact Info */}
          <div className="flex flex-col gap-4">
            <span className="text-xs font-bold text-maroon-600 dark:text-gold-400 uppercase tracking-widest flex items-center gap-1.5">
              <Phone className="h-4 w-4 shrink-0 text-emerald-600" /> Registered Contact Info
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-light text-zinc-650 dark:text-zinc-400">
              <div className="flex justify-between border-b border-zinc-100 dark:border-zinc-850 pb-2 items-center">
                <span className="font-semibold text-zinc-855 dark:text-zinc-200 flex items-center gap-1"><Mail className="h-3.5 w-3.5" /> Email Address:</span>
                <span>{contactInfo?.email || 'N/A'}</span>
              </div>
              <div className="flex justify-between border-b border-zinc-100 dark:border-zinc-850 pb-2 items-center">
                <span className="font-semibold text-zinc-855 dark:text-zinc-200 flex items-center gap-1"><Phone className="h-3.5 w-3.5" /> Mobile Number:</span>
                <span>{contactInfo?.mobileNumber || 'N/A'}</span>
              </div>
            </div>
          </div>

          <div className="h-px bg-zinc-100 dark:bg-zinc-850" />

          {/* Expectations */}
          <div className="flex flex-col gap-2">
            <span className="text-xs font-bold text-maroon-600 dark:text-gold-400 uppercase tracking-widest">Ideal Partner Expectations</span>
            <p className="text-sm font-light text-zinc-650 dark:text-zinc-300 leading-relaxed">
              {profile.partner_expectations || 'Define what qualifications, stars, and locations you expect in a partner.'}
            </p>
          </div>

        </div>

        {/* Right Side: Astrology details */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          <div className="bg-white dark:bg-zinc-900 p-6 rounded-3xl shadow-md border border-sandal-200 dark:border-zinc-800/80 text-left flex flex-col gap-4">
            <span className="text-xs font-bold text-maroon-600 dark:text-gold-450 uppercase tracking-widest flex items-center gap-1">
              <Award className="h-4 w-4 shrink-0" /> Horoscopic Details
            </span>
            
            <div className="flex flex-col gap-2.5 text-xs font-light text-zinc-655 dark:text-zinc-400">
              <div className="flex justify-between border-b border-zinc-100 dark:border-zinc-850 pb-2">
                <span className="font-semibold text-zinc-855 dark:text-zinc-200">Rasi:</span>
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

            {horoscopeUrl ? (
              <a
                href={horoscopeUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-2.5 mt-2 rounded-xl border border-gold-500/30 text-center text-xs font-bold text-gold-650 dark:text-gold-400 hover:bg-gold-500/5 transition-all cursor-pointer flex items-center justify-center gap-1.5"
              >
                View Horoscope PDF
              </a>
            ) : (
              <div className="w-full py-2.5 mt-2 rounded-xl border border-zinc-200 dark:border-zinc-800 text-center text-xs text-zinc-455 dark:text-zinc-500 italic">
                No Horoscope Uploaded
              </div>
            )}
            
            <Link 
              href="/dashboard/verification" 
              className="text-[10px] text-center font-bold text-maroon-600 dark:text-gold-400 hover:underline uppercase tracking-wider block mt-2"
            >
              Verify Profile &amp; Uploads ➔
            </Link>
          </div>

          {/* Privacy Controls (DPDP Readiness) */}
          <div className="bg-white dark:bg-zinc-900 p-6 rounded-3xl shadow-md border border-sandal-200 dark:border-zinc-800/80 text-left flex flex-col gap-4 animate-in slide-in-from-bottom-5 duration-300">
            <span className="text-xs font-bold text-maroon-600 dark:text-gold-400 uppercase tracking-widest flex items-center gap-1.5">
              <ShieldCheck className="h-4.5 w-4.5 shrink-0 text-emerald-600" /> Data Privacy Tools
            </span>
            <p className="text-[11px] font-light text-zinc-550 dark:text-zinc-450 leading-relaxed">
              Manage your personal logs, request copies of your files, or revoke consents in compliance with data protection laws.
            </p>
            <div className="flex flex-col gap-2 mt-1">
              <button
                onClick={handleExportData}
                className="w-full py-2 rounded-lg border border-zinc-200 dark:border-zinc-800 text-center text-xs font-bold text-zinc-650 dark:text-zinc-355 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
              >
                Export My Data (JSON)
              </button>
              <button
                onClick={handleDeleteAccountRequest}
                className="w-full py-2 rounded-lg border border-red-500/10 hover:bg-red-500/5 text-center text-xs font-bold text-red-500 transition-colors cursor-pointer"
              >
                Delete Matrimony Account
              </button>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}


