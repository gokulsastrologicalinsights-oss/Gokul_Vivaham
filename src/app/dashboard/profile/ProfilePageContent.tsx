'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ArrowUp,
  CalendarDays,
  Edit3,
  Image as ImageIcon,
  ShieldCheck,
  User,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import VerificationBadges from '@/components/ui/VerificationBadges';

type AnyRecord = Record<string, any>;

const EDIT_PROFILE_HREF = '/dashboard/edit-profile';
const EMPTY_VALUE = 'Not added yet';

function firstValue(source: AnyRecord | null | undefined, ...keys: string[]) {
  for (const key of keys) {
    const value = source?.[key];
    if (value !== null && value !== undefined && value !== '') return value;
  }
  return null;
}

function textValue(value: unknown, fallback = EMPTY_VALUE) {
  if (Array.isArray(value)) return value.length ? value.join(', ') : fallback;
  if (value === null || value === undefined || value === '') return fallback;
  return String(value);
}

function joinValues(...values: unknown[]) {
  const result = values
    .flatMap((value) => (Array.isArray(value) ? value : [value]))
    .filter((value) => value !== null && value !== undefined && value !== '');
  return result.length ? result.join(', ') : null;
}

function formatDate(value: unknown) {
  if (!value) return null;
  const date = new Date(String(value));
  return Number.isNaN(date.getTime())
    ? String(value)
    : date.toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' });
}

function calculateAge(value: unknown) {
  if (!value) return null;
  const birthDate = new Date(String(value));
  if (Number.isNaN(birthDate.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDelta = today.getMonth() - birthDate.getMonth();
  if (monthDelta < 0 || (monthDelta === 0 && today.getDate() < birthDate.getDate())) age -= 1;
  return age > 0 ? age : null;
}

function formatHeight(value: unknown) {
  return value === null || value === undefined || value === '' ? null : `${value} cm`;
}

function formatIncome(value: unknown) {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'number') return `₹${value.toLocaleString('en-IN')}`;
  return String(value);
}

function formatRange(
  min: unknown,
  max: unknown,
  formatter: (value: unknown) => string | null = (value) => (value === null || value === undefined || value === '' ? null : String(value)),
) {
  const lower = formatter(min);
  const upper = formatter(max);
  if (!lower && !upper) return null;
  if (lower && upper) return `${lower} – ${upper}`;
  return lower || upper;
}

function DetailField({ label, value, wide = false }: { label: string; value: unknown; wide?: boolean }) {
  return (
    <div className={`min-w-0 rounded-2xl border border-border/70 bg-surface/55 p-4 ${wide ? 'sm:col-span-2' : ''}`}>
      <dt className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">{label}</dt>
      <dd className="mt-2 break-words text-sm font-medium leading-6 text-foreground">{textValue(value)}</dd>
    </div>
  );
}

function EditLink({ href = EDIT_PROFILE_HREF }: { href?: string }) {
  return (
    <Link href={href} className="inline-flex min-h-9 items-center gap-1 rounded-full border border-primary/25 px-3.5 py-1.5 text-xs font-semibold text-primary transition-colors hover:bg-primary/10">
      <Edit3 className="h-3.5 w-3.5" />
      Edit
    </Link>
  );
}

function SectionCard({ id, title, children, editHref }: { id: string; title: string; children: React.ReactNode; editHref?: string }) {
  return (
    <section id={id} className="scroll-mt-6 rounded-3xl border border-border bg-card p-5 shadow-sm sm:p-7">
      <div className="mb-5 flex flex-col gap-3 border-b border-border pb-4 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-xl font-bold text-foreground sm:text-2xl">{title}</h2>
        {editHref !== undefined && <EditLink href={editHref} />}
      </div>
      {children}
    </section>
  );
}

function DetailGrid({ children }: { children: React.ReactNode }) {
  return <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">{children}</dl>;
}

export default function ProfilePageContent() {
  const [profile, setProfile] = useState<AnyRecord | null>(null);
  const [preferences, setPreferences] = useState<AnyRecord | null>(null);
  const [userInfo, setUserInfo] = useState<AnyRecord | null>(null);
  const [profilePhoto, setProfilePhoto] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const loadProfile = async () => {
      setLoading(true);
      setError(null);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          if (active) setError('Please sign in to view your profile.');
          return;
        }

        const { data: userRow } = await supabase
          .from('users')
          .select('id, email, mobile_number')
          .eq('auth_user_id', user.id)
          .maybeSingle();
        const currentUserId = userRow?.id || user.id;

        const [profileResult, preferenceResult, galleryResult] = await Promise.all([
          supabase.from('profiles').select('*').eq('user_id', currentUserId).maybeSingle(),
          supabase.from('partner_preferences').select('*').eq('user_id', currentUserId).maybeSingle(),
          supabase.from('gallery_images').select('image_url, thumbnail_url').eq('user_id', currentUserId).eq('is_profile_picture', true).limit(1).maybeSingle(),
        ]);

        if (profileResult.error) throw profileResult.error;
        if (!active) return;
        setProfile(profileResult.data);
        setPreferences(preferenceResult.data);
        setUserInfo({ email: userRow?.email || user.email || null, mobile_number: userRow?.mobile_number || null });
        setProfilePhoto(galleryResult.data?.thumbnail_url || galleryResult.data?.image_url || null);
      } catch (loadError) {
        console.error('Error fetching user profile:', loadError);
        if (active) setError('We could not load your profile right now. Please try again.');
      } finally {
        if (active) setLoading(false);
      }
    };

    void loadProfile();
    return () => { active = false; };
  }, []);

  const fullName = useMemo(() => {
    if (!profile) return 'My Profile';
    return [profile.first_name, profile.last_name].filter(Boolean).join(' ') || 'My Profile';
  }, [profile]);

  if (loading) {
    return <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 text-sm text-muted"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />Loading your profile…</div>;
  }

  if (error || !profile) {
    return <div className="rounded-3xl border border-border bg-card p-8 text-center shadow-sm sm:p-12"><User className="mx-auto h-10 w-10 text-primary" /><h1 className="mt-4 text-2xl font-bold text-foreground">My Profile</h1><p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted">{error || 'Your profile is not available yet.'}</p><Link href={EDIT_PROFILE_HREF} className="mt-6 inline-flex rounded-full bg-brand-red px-5 py-2.5 text-sm font-semibold text-white">Complete Profile</Link></div>;
  }

  const initials = [profile.first_name?.[0], profile.last_name?.[0]].filter(Boolean).join('').toUpperCase() || 'M';
  const age = profile.age || calculateAge(profile.date_of_birth);
  const location = joinValues(profile.city, profile.state, profile.country);
  const religionCommunity = joinValues(profile.religion, profile.caste);
  const motherDetails = joinValues(profile.mother_name, profile.mother_occupation ? `(${profile.mother_occupation})` : null);
  const fatherDetails = joinValues(profile.father_name, profile.father_occupation ? `(${profile.father_occupation})` : null);
  const hobbies = firstValue(profile, 'hobbies', 'hobbies_and_interests', 'interests');
  const preferencesLocation = joinValues(preferences?.country, preferences?.state);
  const preferredReligionCommunity = joinValues(preferences?.religion, preferences?.caste);
  const preferredAge = formatRange(preferences?.min_age, preferences?.max_age);
  const preferredHeight = formatRange(preferences?.min_height, preferences?.max_height, formatHeight);
  const preferredIncome = formatRange(preferences?.annual_income_min, preferences?.annual_income_max, formatIncome);
  const dosham = firstValue(profile, 'manglik', 'manglik_status', 'chevvai_dosham', 'chevvai_dosham_status', 'doshams');

  return (
    <div id="top" className="flex flex-col gap-6 text-left">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Gokul Vivaham</p><h1 className="mt-1 text-3xl font-bold text-foreground sm:text-4xl">My Profile</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-muted">A clear view of the information you have shared with prospective matches and their families.</p></div>
        <Link href={EDIT_PROFILE_HREF} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-brand-red px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-red-light"><Edit3 className="h-4 w-4" />Edit Profile</Link>
      </div>

      <SectionCard id="profile-summary" title="Profile Summary" editHref={EDIT_PROFILE_HREF}>
        <div className="grid gap-6 lg:grid-cols-[220px_1fr]"><div className="flex flex-col items-center justify-center rounded-3xl bg-surface p-5 text-center">{profilePhoto ? <img src={profilePhoto} alt={`${fullName} profile photo`} className="h-40 w-40 rounded-3xl object-cover shadow-md ring-4 ring-primary/15" /> : <div className="flex h-40 w-40 items-center justify-center rounded-3xl bg-primary/10 font-serif text-5xl font-bold text-primary ring-4 ring-primary/10">{initials}</div>}<span className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-muted"><ImageIcon className="h-3.5 w-3.5" />{profilePhoto ? 'Profile photo' : 'Profile photo not added'}</span>{profile.is_verified && <VerificationBadges profile={profile} size="sm" className="mt-3" />}</div><DetailGrid><DetailField label="Profile ID" value={profile.profile_id} /><DetailField label="Profile Photo" value={profilePhoto ? 'Added' : null} /><DetailField label="Age / Height" value={joinValues(age ? `${age} years` : null, formatHeight(profile.height_cm))} /><DetailField label="Marital Status" value={profile.marital_status} /><DetailField label="Posted By" value={firstValue(profile, 'posted_by', 'profile_created_by')} /><DetailField label="Religion / Community" value={religionCommunity} /><DetailField label="Location" value={location} /><DetailField label="Mother Tongue" value={profile.mother_tongue} /></DetailGrid></div>
      </SectionCard>

      <SectionCard id="about-me" title="About Me" editHref={EDIT_PROFILE_HREF}><DetailGrid><DetailField label="About Me" value={profile.about_me} wide /></DetailGrid></SectionCard>

      <SectionCard id="basic-details" title="Basic Details" editHref={EDIT_PROFILE_HREF}><DetailGrid><DetailField label="Age" value={age ? `${age} years` : null} /><DetailField label="Date of Birth" value={formatDate(profile.date_of_birth)} /><DetailField label="Marital Status" value={profile.marital_status} /><DetailField label="Height" value={formatHeight(profile.height_cm)} /><DetailField label="Grew Up In" value={firstValue(profile, 'grew_up_in', 'native_place')} /><DetailField label="Diet" value={firstValue(profile, 'diet')} /><DetailField label="Blood Group" value={firstValue(profile, 'blood_group', 'blood_type')} /><DetailField label="Health Information" value={firstValue(profile, 'health_information', 'health_info')} /><DetailField label="Disability" value={firstValue(profile, 'disability', 'physical_status')} /></DetailGrid></SectionCard>

      <SectionCard id="religion-community" title="Religion & Community" editHref={EDIT_PROFILE_HREF}><DetailGrid><DetailField label="Religion" value={profile.religion} /><DetailField label="Community" value={profile.caste} /><DetailField label="Sub Community" value={profile.sub_caste} /><DetailField label="Mother Tongue" value={profile.mother_tongue} /></DetailGrid></SectionCard>

      <SectionCard id="horoscope-details" title="Horoscope Details" editHref={EDIT_PROFILE_HREF}><DetailGrid><DetailField label="Date of Birth" value={formatDate(profile.date_of_birth)} /><DetailField label="Time of Birth" value={firstValue(profile, 'time_of_birth', 'birth_time')} /><DetailField label="City of Birth" value={firstValue(profile, 'city_of_birth', 'birth_city')} /><DetailField label="Gothra / Gothram" value={profile.gothram} /><DetailField label="Manglik / Chevvai Dosham" value={dosham} wide /></DetailGrid></SectionCard>

      <SectionCard id="my-family" title="My Family" editHref={EDIT_PROFILE_HREF}><DetailGrid><DetailField label="Mother's Details" value={motherDetails} /><DetailField label="Father's Details" value={fatherDetails} /><DetailField label="Family Location" value={firstValue(profile, 'family_location', 'native_place')} /><DetailField label="No. of Sisters" value={firstValue(profile, 'no_of_sisters', 'sisters')} /><DetailField label="No. of Brothers" value={firstValue(profile, 'no_of_brothers', 'brothers')} /><DetailField label="Family Financial Status" value={firstValue(profile, 'family_financial_status', 'family_income')} /></DetailGrid></SectionCard>

      <SectionCard id="education-profession" title="Education & Profession" editHref={EDIT_PROFILE_HREF}><DetailGrid><DetailField label="Highest Qualification" value={profile.education} /><DetailField label="College(s) Attended" value={firstValue(profile, 'colleges_attended', 'college_attended', 'college')} /><DetailField label="Annual Income" value={formatIncome(profile.annual_income)} /><DetailField label="Working With" value={firstValue(profile, 'working_with', 'company_type', 'industry')} /><DetailField label="Working As" value={firstValue(profile, 'working_as', 'occupation', 'profession')} /><DetailField label="Employer Name" value={firstValue(profile, 'employer_name', 'company_name')} /></DetailGrid></SectionCard>

      <SectionCard id="location-details" title="Location Details" editHref={EDIT_PROFILE_HREF}><DetailGrid><DetailField label="Current Residence" value={firstValue(profile, 'current_residence', 'city')} /><DetailField label="State of Residence" value={profile.state} /><DetailField label="Residency Status" value={firstValue(profile, 'residency_status', 'residence_status')} /><DetailField label="Zip / Pin Code" value={firstValue(profile, 'zip_code', 'pin_code', 'postal_code')} /></DetailGrid></SectionCard>

      <SectionCard id="hobbies-interests" title="Hobbies & Interests" editHref={EDIT_PROFILE_HREF}><div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div className="flex items-start gap-3"><div className="rounded-2xl bg-primary/10 p-3 text-primary"><CalendarDays className="h-5 w-5" /></div><div><p className="text-sm font-semibold text-foreground">Hobbies and Interests</p><p className="mt-1 text-sm leading-6 text-muted">{textValue(hobbies, 'Share the activities and interests that matter to you.')}</p></div></div>{!hobbies && <Link href={EDIT_PROFILE_HREF} className="inline-flex min-h-10 shrink-0 items-center justify-center rounded-full border border-primary/30 px-4 py-2 text-sm font-semibold text-primary hover:bg-primary/10">Add Now</Link>}</div></SectionCard>

      <SectionCard id="partner-preferences" title="My Partner Preferences"><div className="flex flex-col gap-8"><div><div className="mb-4 flex items-center justify-between gap-3"><h3 className="text-lg font-semibold text-foreground">Basic Preferences</h3><EditLink href="/dashboard/preferences" /></div><DetailGrid><DetailField label="Preferred Age" value={preferredAge} /><DetailField label="Preferred Height" value={preferredHeight} /><DetailField label="Religion / Community" value={preferredReligionCommunity} /><DetailField label="Mother Tongue" value={preferences?.mother_tongue} /><DetailField label="Marital Status" value={preferences?.marital_status} /></DetailGrid></div><div className="border-t border-border pt-7"><div className="mb-4 flex items-center justify-between gap-3"><h3 className="text-lg font-semibold text-foreground">Preferred Location</h3><EditLink href="/dashboard/preferences" /></div><DetailGrid><DetailField label="Country Living In" value={preferences?.country} /><DetailField label="State Living In" value={preferences?.state} /><DetailField label="City / District" value={firstValue(preferences || {}, 'city', 'district')} /></DetailGrid>{!preferencesLocation && <p className="mt-3 text-xs text-muted">Add preferred locations to help us refine your matches.</p>}</div><div className="border-t border-border pt-7"><div className="mb-4 flex items-center justify-between gap-3"><h3 className="text-lg font-semibold text-foreground">Education & Career Preferences</h3><EditLink href="/dashboard/preferences" /></div><DetailGrid><DetailField label="Education" value={preferences?.education} /><DetailField label="Working With" value={firstValue(preferences || {}, 'working_with', 'company_type')} /><DetailField label="Profession Area" value={firstValue(preferences || {}, 'profession_area', 'occupation')} /><DetailField label="Working As" value={firstValue(preferences || {}, 'working_as', 'occupation')} /><DetailField label="Annual Income" value={preferredIncome || formatIncome(preferences?.annual_income_min)} /></DetailGrid></div><div className="border-t border-border pt-7"><div className="mb-4 flex items-center justify-between gap-3"><h3 className="text-lg font-semibold text-foreground">Other Preferences</h3><EditLink href="/dashboard/preferences" /></div><DetailGrid><DetailField label="Profile Created By" value={firstValue(preferences || {}, 'profile_created_by', 'created_by')} /><DetailField label="Diet" value={firstValue(preferences || {}, 'diet')} /></DetailGrid></div></div></SectionCard>

      <SectionCard id="contact-information" title="Contact Information" editHref="/dashboard/settings"><DetailGrid><DetailField label="Mobile" value={userInfo?.mobile_number} /><DetailField label="Display Option" value={firstValue(userInfo || {}, 'display_option', 'mobile_display_option') || 'Private / permission-controlled'} /></DetailGrid><div className="mt-4 flex items-start gap-2 rounded-2xl bg-surface p-4 text-xs leading-5 text-muted"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" /><span>Your contact details are not public. Access remains subject to your privacy settings and contact permissions.</span></div></SectionCard>

      <div className="flex justify-center pb-2 pt-1"><a href="#top" className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline"><ArrowUp className="h-4 w-4" />Back to Top</a></div>
    </div>
  );
}
