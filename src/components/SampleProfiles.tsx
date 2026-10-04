'use client';
import {useEffect,useState} from 'react';
import Link from 'next/link';
import type {SampleProfile} from '@/types/sample-profile';
export default function SampleProfiles({preview=false}:{preview?:boolean}){
 const [profiles,setProfiles]=useState<SampleProfile[]>([]),[gender,setGender]=useState('All'),[error,setError]=useState(''),[loading,setLoading]=useState(true);
 useEffect(()=>{let active=true;fetch('/api/samples').then(async r=>{if(!r.ok)throw Error('Unable to load sample profiles.');return r.json();}).then(d=>{if(active)setProfiles(d.profiles);}).catch(e=>{if(active)setError(e.message);}).finally(()=>{if(active)setLoading(false);});return()=>{active=false;};},[]);
 const previewProfiles=[...profiles.filter(p=>p.gender==='Male').slice(0,2),...profiles.filter(p=>p.gender==='Female').slice(0,2)];
 const visible=profiles.filter(p=>gender==='All'||p.gender===gender);
 return <section className="max-w-7xl mx-auto w-full px-4 py-12">
  <h1 className="text-3xl font-serif font-bold mb-3">Sample profiles</h1>
  <p className="text-sm mb-6">Fictional examples to help you explore our profile format. These are not registered members and cannot receive interests, messages or contact requests.</p>
  {!preview&&<label className="block mb-6">Show <select value={gender} onChange={e=>setGender(e.target.value)} className="border border-border bg-card rounded p-2 ml-2"><option>All</option><option>Male</option><option>Female</option></select></label>}
  {loading&&<p role="status">Loading samples…</p>}{error&&<p role="alert">{error}</p>}
  <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">{(preview?previewProfiles:visible).map(p=><article key={p.id} className="border border-border bg-card rounded-2xl p-5">
   <span className="text-xs font-bold text-primary">SAMPLE · FICTIONAL</span>
   <div role="img" aria-label={`Illustrated initials for fictional sample ${p.name}`} className="my-4 h-20 w-20 rounded-full bg-primary/10 text-primary flex items-center justify-center text-2xl font-serif">{p.name.split(' ').map(n=>n[0]).slice(0,2).join('')}</div>
   <h2 className="font-semibold text-lg">{p.name}</h2><p className="text-xs text-muted mb-3">{p.id} · {p.gender} · {p.age} years · {p.height_cm} cm</p>
   <p className="text-sm">{p.city} · {p.mother_tongue}</p><p className="text-sm">{p.education}</p><p className="text-sm">{p.occupation}</p><p className="text-sm mt-2">{p.religion} · {p.star}</p><p className="text-sm mt-3 leading-relaxed">{p.about}</p>
  </article>)}</div>
  {preview&&<Link href="/sample-profiles" className="inline-block mt-6 underline">Explore all 20 sample profiles</Link>}
 </section>;
}

