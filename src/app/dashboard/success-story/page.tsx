'use client';

import { useState, useEffect } from 'react';
import { 
  Heart, Upload, Calendar, Check, AlertCircle, 
  Loader2, RefreshCw, FileText, Clock, ExternalLink 
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { uploadService } from '@/services/upload.service';
import Link from 'next/link';

export default function SuccessStoryPage() {
  const [loading, setLoading] = useState(true);
  const [dbUserId, setDbUserId] = useState<string>('');
  const [profile, setProfile] = useState<any>(null);
  const [stories, setStories] = useState<any[]>([]);

  // Form States
  const [partnerProfileId, setPartnerProfileId] = useState('');
  const [storyText, setStoryText] = useState('');
  const [weddingDate, setWeddingDate] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  const loadStoryPageData = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // 1. Resolve user ID
      const { data: userRow } = await supabase
        .from('users')
        .select('id')
        .eq('auth_user_id', user.id)
        .maybeSingle();

      const currentUserId = userRow?.id || user.id;
      setDbUserId(currentUserId);

      // 2. Fetch logged-in user profile
      const { data: pRow } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', currentUserId)
        .maybeSingle();

      setProfile(pRow);

      // 3. Fetch submissions history for this couple (where current user is husband or wife)
      const { data: submissions, error: subErr } = await supabase
        .from('success_stories')
        .select(`
          id,
          story,
          wedding_date,
          image_url,
          status,
          created_at,
          husband_user_id,
          wife_user_id
        `)
        .or(`husband_user_id.eq.${currentUserId},wife_user_id.eq.${currentUserId}`)
        .order('created_at', { ascending: false });

      if (subErr) throw subErr;

      // For each story, retrieve names of husband and wife
      if (submissions && submissions.length > 0) {
        const partnerIds = submissions.map(s => 
          s.husband_user_id === currentUserId ? s.wife_user_id : s.husband_user_id
        ).filter(Boolean);

        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, first_name, last_name, profile_id')
          .in('user_id', partnerIds);

        const mappedStories = submissions.map(s => {
          const isHusband = s.husband_user_id === currentUserId;
          const otherUserId = isHusband ? s.wife_user_id : s.husband_user_id;
          const partnerProfile = profiles?.find(p => p.user_id === otherUserId);
          
          return {
            ...s,
            partnerName: partnerProfile ? `${partnerProfile.first_name} ${partnerProfile.last_name || ''}`.trim() : 'Unknown Partner',
            partnerId: partnerProfile ? partnerProfile.profile_id : 'N/A'
          };
        });

        setStories(mappedStories);
      } else {
        setStories([]);
      }
    } catch (err) {
      console.error('Error loading stories page data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStoryPageData();
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      // Create local preview URL
      const url = URL.createObjectURL(file);
      setImageUrl(url);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(null);

    if (!partnerProfileId) {
      setFormError('Please enter your partner\'s Profile ID.');
      return;
    }
    if (!storyText || storyText.length < 50) {
      setFormError('Please write a story of at least 50 characters.');
      return;
    }
    if (!weddingDate) {
      setFormError('Please enter your wedding date.');
      return;
    }
    if (!imageFile) {
      setFormError('Please upload a beautiful wedding photo.');
      return;
    }

    setFormLoading(true);

    try {
      // 1. Look up partner in database
      const { data: partnerProfileRow, error: partnerErr } = await supabase
        .from('profiles')
        .select('user_id, gender, first_name, last_name')
        .eq('profile_id', partnerProfileId.trim().toUpperCase())
        .maybeSingle();

      if (partnerErr || !partnerProfileRow) {
        setFormError(`Partner Profile ID "${partnerProfileId}" not found. Please double check and retry.`);
        setFormLoading(false);
        return;
      }

      const partnerUserId = partnerProfileRow.user_id;

      if (partnerUserId === dbUserId) {
        setFormError('You cannot submit a success story with yourself. Please enter your partner\'s ID.');
        setFormLoading(false);
        return;
      }

      // Check genders for husband/wife mapping
      let husbandId = null;
      let wifeId = null;

      if (profile.gender === 'Male') {
        husbandId = dbUserId;
        wifeId = partnerUserId;
      } else if (profile.gender === 'Female') {
        wifeId = dbUserId;
        husbandId = partnerUserId;
      } else {
        // Fallback mapping based on partner gender
        if (partnerProfileRow.gender === 'Female') {
          husbandId = dbUserId;
          wifeId = partnerUserId;
        } else {
          wifeId = dbUserId;
          husbandId = partnerUserId;
        }
      }

      // 2. Upload photo to Supabase Storage
      const { url: photoUrl, error: uploadErr } = await uploadService.uploadFile(imageFile, 'photos');
      if (uploadErr || !photoUrl) {
        throw new Error(uploadErr?.message || 'Failed to upload story photo.');
      }

      // 3. Insert success story into database
      const { error: insertErr } = await supabase
        .from('success_stories')
        .insert({
          husband_user_id: husbandId,
          wife_user_id: wifeId,
          story: storyText,
          wedding_date: weddingDate,
          image_url: photoUrl,
          status: 'pending' // pending admin approval
        });

      if (insertErr) throw insertErr;

      setFormSuccess('Your success story has been submitted! Administrators will review and publish it within 24 hours.');
      setPartnerProfileId('');
      setStoryText('');
      setWeddingDate('');
      setImageFile(null);
      setImageUrl(null);
      
      // Reload list
      loadStoryPageData();
    } catch (err: any) {
      console.error(err);
      setFormError(err.message || 'An error occurred while submitting your story. Please try again.');
    } finally {
      setFormLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 min-h-[60vh] text-sm text-zinc-500 font-mono gap-3">
        <Loader2 className="h-8 w-8 border-4 border-maroon-500 border-t-transparent rounded-full animate-spin text-maroon-600" />
        Syncing stories database...
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 text-left max-w-4xl mx-auto w-full">
      {/* Header Block */}
      <div className="flex flex-col gap-1.5 border-b border-zinc-200 dark:border-zinc-800 pb-4">
        <h1 className="text-2xl md:text-3xl font-serif font-bold text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
          <Heart className="h-7 w-7 text-rose-500 fill-rose-500/10" /> Share Your Success Story
        </h1>
        <p className="text-xs text-zinc-500 dark:text-zinc-400 font-light max-w-xl">
          Did you find your life partner on Gokul Vivaham? Share your journey to inspire millions of other matches! Approved stories are showcased on our homepage.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
        
        {/* Left Column: Submission Form */}
        <div className="md:col-span-7 bg-white dark:bg-zinc-900 border border-sandal-200 dark:border-zinc-800/80 p-6 rounded-3xl shadow-sm flex flex-col gap-5">
          <h2 className="text-base font-serif font-bold text-zinc-850 dark:text-zinc-200">
            Submit Your Story
          </h2>

          {formError && (
            <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-950/20 text-red-655 dark:text-red-400 text-xs font-light leading-relaxed flex items-center gap-2">
              <AlertCircle className="h-4.5 w-4.5 text-red-500 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          {formSuccess && (
            <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-950/20 text-emerald-650 dark:text-emerald-400 text-xs font-bold leading-relaxed flex items-center gap-2">
              <Check className="h-4.5 w-4.5 text-emerald-600 shrink-0" />
              <span>{formSuccess}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-4 text-xs font-light text-zinc-700 dark:text-zinc-300">
            
            {/* Input 1: Partner Profile ID */}
            <div className="flex flex-col gap-1.5 text-left">
              <label className="text-[10px] font-bold text-zinc-505 uppercase tracking-widest">Partner Profile ID</label>
              <input
                type="text"
                placeholder="e.g. GV123456"
                value={partnerProfileId}
                onChange={(e) => setPartnerProfileId(e.target.value)}
                disabled={formLoading}
                className="px-3.5 py-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-350 focus:outline-none focus:border-maroon-500 uppercase font-mono tracking-wider"
                required
              />
              <span className="text-[10px] text-zinc-400">Enter your spouse's unique Gokul Vivaham profile ID to associate their profile.</span>
            </div>

            {/* Input 2: Wedding Date */}
            <div className="flex flex-col gap-1.5 text-left">
              <label className="text-[10px] font-bold text-zinc-550 uppercase tracking-widest">Wedding Date</label>
              <div className="relative">
                <input
                  type="date"
                  value={weddingDate}
                  onChange={(e) => setWeddingDate(e.target.value)}
                  disabled={formLoading}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 focus:outline-none focus:border-maroon-500"
                  required
                />
              </div>
            </div>

            {/* Input 3: Story Narrative */}
            <div className="flex flex-col gap-1.5 text-left">
              <label className="text-[10px] font-bold text-zinc-550 uppercase tracking-widest">Our Journey (Your Story)</label>
              <textarea
                rows={5}
                placeholder="Share details about how you met, your compatibility match, when you decided to marry, and your overall experience on our platform..."
                value={storyText}
                onChange={(e) => setStoryText(e.target.value)}
                disabled={formLoading}
                className="px-3.5 py-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-955 border border-zinc-200 dark:border-zinc-805 text-zinc-700 dark:text-zinc-300 focus:outline-none focus:border-maroon-500 leading-relaxed"
                required
              />
              <div className="flex justify-between items-center text-[10px] text-zinc-400">
                <span>At least 50 characters required</span>
                <span className={storyText.length >= 50 ? 'text-emerald-500 font-semibold' : 'text-zinc-450'}>
                  Character Count: {storyText.length}
                </span>
              </div>
            </div>

            {/* Input 4: Wedding Photo Upload */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-zinc-550 uppercase tracking-widest text-left">Upload Wedding Photo</label>
              <div className="border-2 border-dashed border-zinc-200 dark:border-zinc-800 hover:border-maroon-500/40 dark:hover:border-gold-500/30 rounded-2xl p-6 text-center transition-colors relative cursor-pointer group">
                <input 
                  type="file" 
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleFileChange}
                  disabled={formLoading}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  required={!imageUrl}
                />
                <div className="flex flex-col items-center gap-2 text-zinc-400 select-none">
                  {imageUrl ? (
                    <div className="relative w-full max-h-40 rounded-xl overflow-hidden border border-zinc-250 dark:border-zinc-800">
                      <img src={imageUrl} alt="Wedding Preview" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <span className="text-[10px] font-bold text-white uppercase tracking-wider">Change Image</span>
                      </div>
                    </div>
                  ) : (
                    <>
                      <Upload className="h-6 w-6 text-zinc-400 group-hover:text-maroon-600 dark:group-hover:text-gold-450 transition-colors" />
                      <span className="text-[11px] font-light text-zinc-450">Drag &amp; drop or click to upload your wedding photo</span>
                      <span className="text-[9px] text-zinc-500">JPEG, PNG or WebP (Max Size: 5MB)</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <button 
              type="submit"
              disabled={formLoading}
              className="w-full py-3 rounded-full luxury-gradient text-white font-bold text-xs uppercase tracking-widest cursor-pointer disabled:opacity-50 transition-colors flex items-center justify-center gap-1.5 shadow"
            >
              {formLoading ? (
                <>
                  <Loader2 className="h-4.5 w-4.5 animate-spin" /> Publishing Story...
                </>
              ) : (
                'Submit Story'
              )}
            </button>
          </form>
        </div>

        {/* Right Column: Submission History */}
        <div className="md:col-span-5 flex flex-col gap-6">
          
          <div className="bg-white dark:bg-zinc-900 border border-sandal-200 dark:border-zinc-800/80 p-6 rounded-3xl shadow-sm flex flex-col gap-4 text-left">
            <div className="flex justify-between items-center border-b border-zinc-100 dark:border-zinc-850 pb-3">
              <h2 className="text-base font-serif font-bold text-zinc-855 dark:text-zinc-200">
                Your Submissions
              </h2>
              <button 
                onClick={loadStoryPageData}
                className="text-[10px] font-bold text-zinc-400 hover:text-zinc-650 flex items-center gap-1 transition-colors"
              >
                <RefreshCw className="h-3 w-3" /> Refresh
              </button>
            </div>

            {stories.length === 0 ? (
              <div className="p-10 border border-dashed border-zinc-150 dark:border-zinc-800/60 rounded-2xl text-center text-xs text-zinc-450 font-light leading-relaxed">
                <FileText className="h-8 w-8 text-zinc-400/30 mx-auto mb-2" />
                No success stories submitted yet. Share yours once you find your match!
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                {stories.map(story => (
                  <div 
                    key={story.id} 
                    className="p-4 rounded-2xl bg-sandal-50/20 dark:bg-zinc-950/20 border border-sandal-200/20 dark:border-zinc-850/80 flex flex-col gap-3 relative overflow-hidden"
                  >
                    
                    {/* Status badge */}
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-mono text-zinc-400 font-semibold">Wedding: {new Date(story.wedding_date).toLocaleDateString()}</span>
                      <span className={`px-2 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider font-mono shadow-inner ${
                        story.status === 'approved' ? 'bg-emerald-950/60 text-emerald-400' :
                        story.status === 'pending' ? 'bg-amber-955/60 text-amber-400 animate-pulse' :
                        'bg-red-955/60 text-red-400'
                      }`}>
                        {story.status}
                      </span>
                    </div>

                    <div className="flex gap-3 items-center">
                      <div className="w-12 h-12 rounded-lg bg-zinc-950 overflow-hidden shrink-0 border border-zinc-900">
                        <img src={story.image_url} alt="Wedding Story" className="w-full h-full object-cover" />
                      </div>
                      <div className="flex flex-col text-left">
                        <span className="text-xs font-semibold text-zinc-805 dark:text-zinc-200">{story.partnerName}</span>
                        <span className="text-[9px] text-zinc-400 font-mono">ID: {story.partnerId}</span>
                      </div>
                    </div>

                    <p className="text-[11px] text-zinc-550 dark:text-zinc-400 leading-normal line-clamp-2 italic font-serif font-light">
                      "{story.story}"
                    </p>

                  </div>
                ))}
              </div>
            )}

          </div>

        </div>

      </div>

    </div>
  );
}
