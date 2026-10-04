'use client';
import {useEffect,useState} from 'react';
import Link from 'next/link';
import ProfileSlider from '@/components/ProfileSlider';
import OneByOneSlider from '@/components/OneByOneSlider';
import RecentMembers from '@/components/home/RecentMembers';
import type {SampleProfile} from '@/types/sample-profile';
export default function SampleProfiles({preview=false}:{preview?:boolean}){
 const [profiles,setProfiles]=useState<SampleProfile[]>([]),[gender,setGender]=useState('All'),[error,setError]=useState(''),[loading,setLoading]=useState(true);
 useEffect(()=>{let active=true;fetch('/api/samples').then(async r=>{if(!r.ok)throw Error('Unable to load sample profiles.');return r.json();}).then(d=>{if(active)setProfiles(d.profiles);}).catch(e=>{if(active)setError(e.message);}).finally(()=>{if(active)setLoading(false);});return()=>{active=false;};},[]);
 const previewProfiles=[...profiles.filter(p=>p.gender==='Male'),...profiles.filter(p=>p.gender==='Female')];
 const Slider=preview?OneByOneSlider:ProfileSlider;
 const visible=profiles.filter(p=>gender==='All'||p.gender===gender);
 return <><RecentMembers/><section className="max-w-7xl mx-auto w-full px-4 py-12">
  {preview?<h2 className="text-3xl font-serif font-bold mb-3">Sample profiles</h2>:<h1 className="text-3xl font-serif font-bold mb-3">Sample profiles</h1>}
  <p className="text-sm mb-6">Fictional examples to help you explore our profile format. Portraits are AI-generated. These are not registered members and cannot receive interests, messages or contact requests.</p>
  {!preview&&<label className="block mb-6">Show <select value={gender} onChange={e=>setGender(e.target.value)} className="border border-border bg-card rounded p-2 ml-2"><option>All</option><option>Male</option><option>Female</option></select></label>}
  {loading&&<p role="status">Loading samples…</p>}{error&&<p role="alert">{error}</p>}
  <Slider label="sample profiles">{(preview?previewProfiles:visible).map(p=><article key={p.id} className="border border-border bg-card rounded-2xl p-5">
   <span className="text-xs font-bold text-primary">SAMPLE · FICTIONAL</span>
   <img src={`/sample-portraits/${p.portrait_id||p.id}.png`} alt={`AI-generated fictional portrait of sample ${p.name}`} loading="lazy" className="my-4 h-56 w-full rounded-xl object-cover"/>
   <h2 className="font-semibold text-lg">{p.name}</h2><p className="text-xs text-muted mb-3">{p.id} · {p.gender} · {p.age} years · {p.height_cm} cm</p>
   <p className="text-sm">{p.city} · {p.mother_tongue}</p><p className="text-sm">{p.education}</p><p className="text-sm">{p.occupation}</p><p className="text-sm mt-2">{p.religion} · {p.star}</p><p className="text-sm mt-3 leading-relaxed">{p.about}</p>
  </article>)}</Slider>
  {preview&&<Link href="/sample-profiles" className="inline-block mt-6 underline">Explore sample profiles</Link>}
 </section></>;
}






