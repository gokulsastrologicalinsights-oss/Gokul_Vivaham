'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import MatchComparison from '@/components/matchmaking/MatchComparison';

export default function Shortlist() {
  const [unlockedProfiles, setUnlockedProfiles] = useState<Set<string>>(new Set());

  useEffect(() => {
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
    fetchUnlockedProfiles();
  }, []);
  
  const [shortlisted, setShortlisted] = useState<Array<{id:string;user_id:string;name:string;age:number;height:string;education:string;location:string;rasi:string;star:string;caste:string;score:number}>>([]);
  const [loadError, setLoadError] = useState('');
  useEffect(() => {
    let active = true;
    fetch('/api/matches?shortlisted=true',{cache:'no-store'}).then(async response => {
      const result = await response.json();
      if(!response.ok)throw new Error('Unable to load your shortlist.');
      if(active)setShortlisted((result.profiles||[]).map((p:Record<string,any>)=>({
        id:p.profile_id,user_id:p.user_id,name:[p.first_name,p.last_name].filter(Boolean).join(' '),age:p.age,
        height:p.height_cm ? p.height_cm+' cm':'N/A',education:p.education||'N/A',location:p.city||'N/A',
        rasi:p.rasi||'',star:p.nakshatra||'',caste:p.caste||'',score:85,
      })));
    }).catch(()=>{if(active)setLoadError('Unable to load your shortlist. Please refresh and try again.');});
    return ()=>{active=false;};
  },[]);
  const handleRemove = async (id: string, _name: string) => {
    const target=shortlisted.find(p=>p.id===id);
    const {data:{user}}=await supabase.auth.getUser();
    if(!target||!user)return;
    const {data:account,error:accountError}=await supabase.from('users').select('id').eq('auth_user_id',user.id).maybeSingle();
    if(accountError||!account)return;
    const {error}=await supabase.from('favorites').delete().eq('user_id',account.id).eq('favorite_user_id',target.user_id);
    if(error){setLoadError('Unable to remove this profile. Please try again.');return;}
    setShortlisted(prev=>prev.filter(item=>item.id!==id));
  };

  return (
    <div className="flex flex-col gap-6 text-left">
      
      {/* Header */}
      <div className="flex justify-between items-center border-b border-zinc-100 dark:border-zinc-850 pb-4 gap-4 flex-wrap">
        <div className="flex flex-col gap-1.5 text-left">
          <h1 className="text-2xl md:text-3xl font-serif font-bold text-zinc-900 dark:text-zinc-50">
            Shortlisted Profiles
          </h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-450 font-light">
            Review and compare profiles you have bookmarked for future reference.
          </p>
        </div>
      </div>

      {loadError && <p role="alert">{loadError}</p>}
      {shortlisted.length > 0 ? (
        <MatchComparison shortlisted={shortlisted} onRemove={handleRemove} unlockedProfiles={unlockedProfiles} />
      ) : (
        <div className="p-16 text-center text-zinc-500 font-mono text-xs border border-dashed border-zinc-200 dark:border-zinc-850 rounded-3xl bg-white dark:bg-zinc-900 shadow">
          Your bookmark list is empty. Go explore compatible profiles!
        </div>
      )}

      {/* Quick Search Redirect */}
      <Link
        href="/dashboard/matches"
        className="self-center mt-4 px-6 py-2.5 rounded-full border border-maroon-500/20 text-maroon-700 dark:text-gold-450 text-xs font-bold uppercase tracking-wider hover:bg-maroon-500/5 transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
      >
        Search Matrimony Matches <ArrowRight className="h-4 w-4" />
      </Link>

    </div>
  );
}
