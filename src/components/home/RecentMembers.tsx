'use client';
import {useQuery} from '@tanstack/react-query';
import Link from 'next/link';
import {supabase} from '@/lib/supabase';
import {useAuth} from '@/hooks/useAuth';
import ProfileSlider from '@/components/ProfileSlider';
import VerificationBadges from '@/components/ui/VerificationBadges';
export default function RecentMembers(){
 const {user}=useAuth();
 const {data:members=[],error}=useQuery({queryKey:['recent-public-members',user?.id],enabled:!!user,refetchInterval:60000,queryFn:async()=>{
  const {data,error}=await supabase.from('profiles').select('user_id,profile_id,first_name,age,city,education,occupation,image_url,users(email_verified,mobile_verified)').eq('visibility','public').eq('is_verified',true).eq('is_suspended',false).is('deleted_at',null).order('created_at',{ascending:false}).limit(20);
  if(error)throw error;return data||[];
 }});
 if(!user||!members.length||error)return null;
 return <section className="max-w-7xl mx-auto w-full px-4 py-12"><h2 className="text-3xl font-serif font-bold mb-3">Recently approved members</h2><p className="mb-6">Real member profiles, displayed according to their visibility settings.</p><ProfileSlider label="member profiles">{members.map(p=><article key={p.user_id} className="border border-border bg-card rounded-2xl p-5">
  {p.image_url?.startsWith('/api/photos?path=')?<img src={p.image_url} alt={`${p.first_name}'s profile`} loading="lazy" className="h-56 w-full object-cover rounded-xl" onError={e=>{e.currentTarget.hidden=true;}}/>:<p className="h-56 flex items-center justify-center bg-primary/10 rounded-xl">Photo protected by member privacy</p>}
  <div className="mt-3 flex items-center justify-between gap-2"><h3 className="text-xl font-semibold">{p.first_name}</h3><VerificationBadges profile={p} size="sm" /></div><p>{p.age} years · {p.city}</p><p>{p.education}</p><p>{p.occupation}</p><Link className="inline-block underline mt-4" href={`/profile/${p.profile_id}`}>View profile</Link>
 </article>)}</ProfileSlider></section>;
}
