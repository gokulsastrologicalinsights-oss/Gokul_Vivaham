'use client';
import {useEffect,useState} from 'react';
import type {SampleProfile} from '@/types/sample-profile';
export default function Samples(){
 const [profiles,setProfiles]=useState<SampleProfile[]>([]),[editing,setEditing]=useState<SampleProfile|null>(null),[message,setMessage]=useState(''),[busy,setBusy]=useState(false);
 useEffect(()=>{let active=true;fetch('/api/admin/samples').then(async r=>{const d=await r.json();if(!r.ok)throw Error(d.error);if(active)setProfiles(d.profiles);}).catch(e=>{if(active)setMessage(e.message);});return()=>{active=false;};},[]);
 async function save(e:React.FormEvent){e.preventDefault();if(!editing)return;setBusy(true);setMessage('');try{
  const {id,name,age,city,education,occupation,about,published,portrait_id}=editing;
  const r=await fetch('/api/admin/samples',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({id,name,age,city,education,occupation,about,published,portrait_id})});const d=await r.json();if(!r.ok)throw Error(d.error);
  setProfiles(p=>p.map(row=>row.id===id?d.profile:row));setEditing(null);setMessage('Sample saved.');
 }catch(e){setMessage(e instanceof Error?e.message:'Save failed.');}finally{setBusy(false);}}
 return <div className="p-6"><h1 className="text-2xl font-bold mb-3">Sample profiles</h1><p className="mb-5">Fictional showcase only. Samples have no login, private contact details, matches or inbox. Edit or hide them here.</p>
 {message&&<p role="status" className="mb-4">{message}</p>}
 {editing?<form onSubmit={save} className="max-w-xl space-y-4 border border-border rounded-xl p-5">
  <img src={`/sample-portraits/${editing.portrait_id||editing.id}.png`} alt={`Fictional portrait of ${editing.name}`} className="w-40 h-40 object-cover rounded-xl"/><label className="block">Sample portrait<select className="block bg-card border border-border p-2" value={editing.portrait_id||editing.id} onChange={e=>setEditing({...editing,portrait_id:e.target.value})}>{profiles.map(p=><option key={p.id} value={p.id}>{p.name} — fictional portrait</option>)}</select></label>
  {(['name','city','education','occupation'] as const).map(key=><label key={key} className="block capitalize">{key}<input required maxLength={150} value={editing[key]} onChange={e=>setEditing({...editing,[key]:e.target.value})} className="block w-full bg-card border border-border rounded p-2"/></label>)}
  <label className="block">Age<input type="number" required min={21} max={80} value={editing.age} onChange={e=>setEditing({...editing,age:Number(e.target.value)})} className="block bg-card border border-border p-2"/></label>
  <label className="block">About<textarea required maxLength={1500} value={editing.about} onChange={e=>setEditing({...editing,about:e.target.value})} className="block w-full bg-card border border-border p-2"/></label>
  <label className="block"><input type="checkbox" checked={editing.published} onChange={e=>setEditing({...editing,published:e.target.checked})}/> Show on sample page</label>
  <button disabled={busy} className="bg-primary text-primary-foreground rounded px-4 py-2">{busy?'Saving…':'Save'}</button><button type="button" disabled={busy} onClick={()=>setEditing(null)} className="ml-4 underline">Cancel</button>
 </form>:<div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">{profiles.map(p=><article key={p.id} className="border border-border rounded-xl p-4"><img src={`/sample-portraits/${p.portrait_id||p.id}.png`} alt={`Fictional portrait of ${p.name}`} loading="lazy" className="w-full h-48 object-cover rounded-xl mb-3"/><h2 className="font-semibold">{p.name}</h2><p>{p.gender} · {p.age} · {p.city}</p><p className="text-sm">{p.published?'Published':'Hidden'} · {p.id}</p><button onClick={()=>setEditing(p)} className="underline mt-3" aria-label={`Edit sample ${p.name}`}>Edit sample</button></article>)}</div>}
 </div>;
}


