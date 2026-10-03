'use client';

import { useState, useEffect } from 'react';
import { Save, CheckCircle2, Sliders, Info } from 'lucide-react';
import TextInput from '@/components/ui/input/TextInput';
import PrimaryButton from '@/components/ui/button/PrimaryButton';
import RasiStarDropdowns from '@/components/ui/input/RasiStarDropdowns';
import { supabase } from '@/lib/supabase';
import ReligionCommunityDropdowns from '@/components/ui/input/ReligionCommunityDropdowns';
import { validateReligionCommunity } from '@/validations/religion-community.schema';
import { useReligionCommunities } from '@/hooks/useReligionCommunities';

export default function PartnerPreferences() {
  const {communities} = useReligionCommunities();
  
  // Preference States
  const [minAge, setMinAge] = useState(21);
  const [maxAge, setMaxAge] = useState(30);
  const [minHeight, setMinHeight] = useState(150);
  const [maxHeight, setMaxHeight] = useState(185);
  const [maritalStatus, setMaritalStatus] = useState<string[]>(['Never Married']);
  const [religion, setReligion] = useState<string>('Hindu');
  const [caste, setCaste] = useState<string>('');
  const [motherTongues, setMotherTongues] = useState<string>('Tamil');
  const [educations, setEducations] = useState<string>('B.Tech, MBA, MS, MBBS');
  const [locations, setLocations] = useState<string>('Chennai, Bangalore, Singapore');
  
  // Astro states
  const [rasi, setRasi] = useState<string>('');
  const [nakshatra, setNakshatra] = useState<string>('');
  const [padam, setPadam] = useState<string>('');
  
  // Status states
  const [isSaving, setIsSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [userId, setUserId] = useState<string | null>(null);
  const [hasExisting, setHasExisting] = useState(false);

  useEffect(() => {
    const loadPreferences = async () => {
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
        setUserId(currentUserId);

        const { data, error } = await supabase
          .from('partner_preferences')
          .select('*')
          .eq('user_id', currentUserId)
          .maybeSingle();

        if (data) {
          setHasExisting(true);
          if (data.min_age) setMinAge(data.min_age);
          if (data.max_age) setMaxAge(data.max_age);
          if (data.min_height) setMinHeight(data.min_height);
          if (data.max_height) setMaxHeight(data.max_height);
          if (data.marital_status) setMaritalStatus(data.marital_status.split(','));
          if (data.religion) setReligion(data.religion.split(',')[0] || 'Hindu');
          if (data.caste) setCaste(data.caste.split(',')[0] || '');
          if (data.mother_tongue) setMotherTongues(data.mother_tongue);
          if (data.education) setEducations(data.education);
          if (data.country) setLocations(data.country);
          if (data.rasi) setRasi(data.rasi);
          if (data.nakshatra) setNakshatra(data.nakshatra);
          if (data.padam) setPadam(data.padam);
        }
      } catch (e) {
        console.error('Failed to load preferences:', e);
      }
    };
    loadPreferences();
  }, []);

  const toggleMaritalStatus = (status: string) => {
    setMaritalStatus(prev => 
      prev.includes(status) 
        ? prev.filter(s => s !== status) 
        : [...prev, status]
    );
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) return;
    setIsSaving(true);
    setSuccessMessage('');

    // Validate Religion and Caste
    const rcError = caste ? validateReligionCommunity(religion, caste, communities) : null;
    if (rcError) {
      alert(rcError);
      setIsSaving(false);
      return;
    }

    try {
      const payload = {
        user_id: userId,
        min_age: minAge,
        max_age: maxAge,
        min_height: minHeight,
        max_height: maxHeight,
        marital_status: maritalStatus.join(','),
        religion: religion,
        caste: caste,
        mother_tongue: motherTongues,
        education: educations,
        country: locations,
        rasi: rasi || null,
        nakshatra: nakshatra || null,
        padam: padam || null
      };

      let error;
      if (hasExisting) {
        const res = await supabase
          .from('partner_preferences')
          .update(payload)
          .eq('user_id', userId);
        error = res.error;
      } else {
        const res = await supabase
          .from('partner_preferences')
          .insert(payload);
        error = res.error;
        if (!error) setHasExisting(true);
      }

      if (error) {
        alert('Failed to save preferences: ' + error.message);
      } else {
        setSuccessMessage('Partner preferences saved successfully! Matches are updated based on these rules.');
        window.scrollTo(0, 0);
        setTimeout(() => setSuccessMessage(''), 4000);
      }
    } catch (err: any) {
      alert('Error: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const maritalOptions = ['Never Married', 'Widowed', 'Divorced', 'Awaiting Divorce'];

  return (
    <div className="flex flex-col gap-6 text-left">
      
      {/* Header Info */}
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl md:text-3xl font-serif font-bold text-zinc-900 dark:text-zinc-50">
          Partner Preferences
        </h1>
        <p className="text-xs text-zinc-500 dark:text-zinc-400 font-light">
          Configure criteria used by our compatibility algorithm to recommend potential brides/grooms.
        </p>
      </div>

      {successMessage && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-sm text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-2 animate-in fade-in duration-300">
          <CheckCircle2 className="h-5 w-5 shrink-0" />
          {successMessage}
        </div>
      )}

      {/* Preferences Form */}
      <div className="bg-white dark:bg-zinc-900 p-6 md:p-8 rounded-3xl shadow-xl border border-sandal-200 dark:border-zinc-800/80">
        <form onSubmit={handleSave} className="flex flex-col gap-6">
          
          <div className="flex items-center gap-2 text-maroon-600 dark:text-gold-400 border-b border-zinc-150 dark:border-zinc-850 pb-3">
            <Sliders className="h-5 w-5" />
            <h2 className="text-lg font-serif font-bold">Matching Rules</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Age bracket */}
            <div className="flex flex-col gap-2">
              <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Age Range ({minAge} to {maxAge} yrs)</label>
              <div className="flex items-center gap-3">
                <input 
                  type="range" 
                  min={18} 
                  max={60} 
                  value={minAge}
                  onChange={(e) => setMinAge(Math.min(parseInt(e.target.value), maxAge))}
                  className="w-full accent-maroon-600"
                />
                <input 
                  type="range" 
                  min={18} 
                  max={60} 
                  value={maxAge}
                  onChange={(e) => setMaxAge(Math.max(parseInt(e.target.value), minAge))}
                  className="w-full accent-maroon-600"
                />
              </div>
            </div>

            {/* Height bracket */}
            <div className="flex flex-col gap-2">
              <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Height Range ({minHeight} to {maxHeight} cm)</label>
              <div className="flex items-center gap-3">
                <input 
                  type="range" 
                  min={130} 
                  max={220} 
                  value={minHeight}
                  onChange={(e) => setMinHeight(Math.min(parseInt(e.target.value), maxHeight))}
                  className="w-full accent-maroon-600"
                />
                <input 
                  type="range" 
                  min={130} 
                  max={220} 
                  value={maxHeight}
                  onChange={(e) => setMaxHeight(Math.max(parseInt(e.target.value), minHeight))}
                  className="w-full accent-maroon-600"
                />
              </div>
            </div>

            {/* Marital Status */}
            <div className="flex flex-col gap-2 md:col-span-2">
              <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Marital Status</label>
              <div className="flex flex-wrap gap-2">
                {maritalOptions.map((status) => {
                  const selected = maritalStatus.includes(status);
                  return (
                    <button
                      key={status}
                      type="button"
                      onClick={() => toggleMaritalStatus(status)}
                      className={`px-4 py-2 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                        selected 
                          ? 'bg-maroon-500/10 text-maroon-700 border-maroon-350 dark:text-gold-450 dark:border-gold-500' 
                          : 'border-zinc-200 dark:border-zinc-800 text-zinc-500 hover:bg-zinc-50'
                      }`}
                    >
                      {status}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Preferred Religion & Caste */}
            <div className="md:col-span-2">
              <ReligionCommunityDropdowns
                religion={religion}
                community={caste}
                onReligionChange={(v) => {
                  setReligion(v);
                  setCaste('');
                }}
                onCommunityChange={(v) => setCaste(v)}
                religionLabel="Preferred Religion"
                communityLabel="Preferred Caste / Community"
                allowAllCommunitiesOption
                selectClassName="h-11 px-3 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-transparent text-sm focus:outline-none focus:ring-1 focus:ring-maroon-500 text-zinc-800 dark:text-zinc-100 dark:bg-zinc-900 w-full"
                inlineLayout={true}
              />
            </div>

            {/* Mother Tongues */}
            <TextInput
              label="Mother Tongues (Comma separated)"
              type="text"
              value={motherTongues}
              onChange={(e) => setMotherTongues(e.target.value)}
              placeholder="e.g. Tamil, Telugu"
            />

            {/* Astro Preferences */}
            <div className="md:col-span-2 border-t border-zinc-100 dark:border-zinc-800 pt-4 mt-2">
              <span className="text-xs font-bold text-maroon-600 dark:text-gold-450 uppercase tracking-widest mb-3 block">Astrological Coordinates Preferred</span>
              <RasiStarDropdowns
                rasi={rasi}
                nakshatra={nakshatra}
                padam={padam}
                onRasiChange={setRasi}
                onNakshatraChange={setNakshatra}
                onPadamChange={setPadam}
                inlineLayout={true}
                selectClassName="h-11 px-3 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-transparent text-sm focus:outline-none focus:ring-1 focus:ring-maroon-500 text-zinc-800 dark:text-zinc-100 dark:bg-zinc-900 w-full"
              />
            </div>

            {/* Education levels */}
            <TextInput
              label="Education Credentials Preferred"
              type="text"
              value={educations}
              onChange={(e) => setEducations(e.target.value)}
              placeholder="e.g. BE, ME, MBA"
            />

            {/* Locations */}
            <div className="md:col-span-2">
              <TextInput
                label="Locations Preferred (Comma separated)"
                type="text"
                value={locations}
                onChange={(e) => setLocations(e.target.value)}
                placeholder="e.g. Chennai, Bangalore, Singapore, USA"
              />
            </div>

          </div>

          <div className="mt-4 p-4 rounded-2xl bg-sandal-50/50 dark:bg-zinc-950/60 border border-sandal-200/50 dark:border-zinc-800/80 flex items-start gap-3">
            <Info className="h-5 w-5 text-maroon-500 shrink-0 mt-0.5" />
            <p className="text-xs text-zinc-600 dark:text-zinc-400 font-light leading-relaxed">
              These rules directly influence match feeds shown inside your search list. Profiles matching 100% of these parameters receive an additional compatibility score boost.
            </p>
          </div>

          {/* Submit Trigger */}
          <div className="flex justify-end pt-4 border-t border-zinc-100 dark:border-zinc-850">
            <PrimaryButton
              type="submit"
              loading={isSaving}
              icon={<Save className="h-4 w-4 text-white" />}
            >
              Save Preferences
            </PrimaryButton>
          </div>

        </form>
      </div>

    </div>
  );
}
