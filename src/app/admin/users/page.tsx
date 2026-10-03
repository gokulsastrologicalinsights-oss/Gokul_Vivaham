'use client';

import { useCallback, useEffect, useState } from 'react';
import { Search, Users, Eye, Pencil, Trash2, RotateCcw, X } from 'lucide-react';
import { PROFILE_FIELDS, ACCOUNT_FIELDS, NUMBER_FIELDS, BOOLEAN_FIELDS } from '@/lib/admin/member-fields';

type RecordData = Record<string, unknown>;
type Member = {id:string;email:string;mobile_number:string|null;status:string;deleted_at:string|null;is_admin:boolean;profile:RecordData|null};
type Details = Record<string, unknown> & {account:RecordData;profile:RecordData|null;is_admin:boolean};
const label=(key:string)=>key.replace(/_/g,' ').replace(/\b\w/g,c=>c.toUpperCase());
const inputClass='w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground';

function RecordView({value}:{value:unknown}) {
  if(value==null) return <p className="text-sm text-muted">No record</p>;
  if(Array.isArray(value)) return value.length ? <div className="space-y-3">{value.map((item,i)=><div key={i} className="rounded-xl border border-border p-3"><RecordView value={item}/></div>)}</div> : <p className="text-sm text-muted">No records</p>;
  if(typeof value==='object') return <dl className="grid sm:grid-cols-2 gap-3">{Object.entries(value).map(([key,item])=><div key={key} className="min-w-0"><dt className="text-xs text-muted">{label(key)}</dt><dd className="text-sm break-words mt-1">{item && typeof item==='object'?<RecordView value={item}/>:item==null||item===''?'—':typeof item==='boolean'?(item?'Yes':'No'):String(item)}</dd></div>)}</dl>;
  return <span>{String(value)}</span>;
}

export default function AdminUsersPage() {
  const [members,setMembers]=useState<Member[]>([]);
  const [query,setQuery]=useState('');
  const [page,setPage]=useState(1);
  const [total,setTotal]=useState(0);
  const [includeDeleted,setIncludeDeleted]=useState(false);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState('');
  const [notice,setNotice]=useState('');
  const [detail,setDetail]=useState<Details|null>(null);
  const [editing,setEditing]=useState(false);
  const [account,setAccount]=useState<RecordData>({});
  const [profile,setProfile]=useState<RecordData>({});
  const [busy,setBusy]=useState(false);
  const [pendingDelete,setPendingDelete]=useState<Member|null>(null);
  const load=useCallback(async(signal?:AbortSignal)=>{
    setLoading(true);
    try {
      const response=await fetch(`/api/admin/users?page=${page}&q=${encodeURIComponent(query)}&deleted=${includeDeleted}`,{signal,cache:'no-store'});
      const data=await response.json();if(!response.ok)throw new Error(data.error);
      setMembers(data.users);setTotal(data.total);setError('');
    } catch(err) {if(!(err instanceof Error && err.name==='AbortError'))setError(err instanceof Error?err.message:'Could not load members.');}
    finally {if(!signal?.aborted)setLoading(false);}
  },[page,query,includeDeleted]);
  useEffect(()=>{const controller=new AbortController();const timer=setTimeout(()=>void load(controller.signal),250);return()=>{clearTimeout(timer);controller.abort();};},[load]);
  async function openMember(member:Member,edit=false){
    setBusy(true);setError('');
    try {
      const response=await fetch(`/api/admin/users/${member.id}`,{cache:'no-store'});const data=await response.json();
      if(!response.ok)throw new Error(data.error);
      setDetail(data);setAccount(data.account);setProfile(data.profile||{});setEditing(edit);
    }catch(err){setError(err instanceof Error?err.message:'Could not load member.');}finally{setBusy(false);}
  }
  async function save(e:React.FormEvent){
    e.preventDefault();if(!detail)return;setBusy(true);setError('');
    try {
      const pick=(fields:readonly string[],source:RecordData)=>Object.fromEntries(fields.filter(f=>f in source).map(f=>[f,source[f]===''?null:NUMBER_FIELDS.has(f)&&source[f]!=null?Number(source[f]):source[f]]));
      const response=await fetch(`/api/admin/users/${detail.account.id}`,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({account:pick(ACCOUNT_FIELDS,account),profile:pick(PROFILE_FIELDS,profile)})});
      const data=await response.json();if(!response.ok)throw new Error(data.error);
      setDetail(null);setNotice('Member details saved.');await load();
    }catch(err){setError(err instanceof Error?err.message:'Save failed.');}finally{setBusy(false);}
  }
  async function changeAccount(member:Member,restore=false){
    setBusy(true);setError('');
    try {
      const response=await fetch(`/api/admin/users/${member.id}`,{method:restore?'POST':'DELETE',headers:{'Content-Type':'application/json'},...(restore?{body:JSON.stringify({action:'restore'})}:{})});
      const data=await response.json();if(!response.ok)throw new Error(data.error);
      setPendingDelete(null);setNotice(restore?'Account restored.':'Account deleted. Login is blocked; you can restore it from deleted accounts.');await load();
    }catch(err){setError(err instanceof Error?err.message:'Account change failed.');}finally{setBusy(false);}
  }
  function field(key:string,source:RecordData,setValue:(value:RecordData)=>void){
    const choices:Record<string,string[]>={status:['active','suspended'],visibility:['public','private'],moderation_status:['pending','approved','rejected']};
    const id='edit-'+key;
    return <div key={key}><label htmlFor={id} className="block text-xs text-muted mb-1">{label(key)}</label>{BOOLEAN_FIELDS.has(key)?<input id={id} type="checkbox" checked={Boolean(source[key])} onChange={e=>setValue({...source,[key]:e.target.checked})}/>:choices[key]?<select id={id} className={inputClass} value={String(source[key]||choices[key][0])} onChange={e=>setValue({...source,[key]:e.target.value})}>{choices[key].map(v=><option key={v}>{v}</option>)}</select>:['about_me','partner_expectations','siblings'].includes(key)?<textarea id={id} className={inputClass} value={String(source[key]??'')} onChange={e=>setValue({...source,[key]:e.target.value})}/>:<input id={id} className={inputClass} type={NUMBER_FIELDS.has(key)?'number':key==='date_of_birth'?'date':key==='email'?'email':'text'} min={NUMBER_FIELDS.has(key)?0:undefined} value={String(source[key]??'')} onChange={e=>setValue({...source,[key]:e.target.value})}/>}</div>;
  }
  return <div className="p-5 md:p-8 space-y-6 max-w-7xl mx-auto">
    <div><h1 className="text-2xl font-serif font-bold flex items-center gap-2"><Users className="text-primary"/>Member administration</h1><p className="text-sm text-muted mt-2">View complete member records, edit details, and manage account access.</p></div>
    {error&&<p role="alert" className="border border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-400 p-3 rounded-xl">{error}</p>}
    {notice&&<p role="status" className="border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 p-3 rounded-xl">{notice}</p>}
    <div className="flex flex-wrap items-center gap-4"><div className="relative flex-1 min-w-64"><Search className="absolute left-3 top-3 h-4 w-4 text-muted"/><input aria-label="Search members" className={inputClass+' pl-9'} placeholder="Search name, profile ID, email or phone" value={query} onChange={e=>{setQuery(e.target.value);setPage(1);}}/></div><label className="text-sm flex gap-2 items-center"><input type="checkbox" checked={includeDeleted} onChange={e=>{setIncludeDeleted(e.target.checked);setPage(1);}}/>Include deleted accounts</label></div>
    <div className="border border-border rounded-2xl bg-card overflow-x-auto"><table className="w-full text-sm text-left"><thead className="bg-surface text-muted"><tr>{['Member','Email / phone','Status','Actions'].map(h=><th key={h} className="p-4">{h}</th>)}</tr></thead><tbody>{members.map(member=><tr key={member.id} className="border-t border-border"><td className="p-4"><p className="font-semibold">{String(member.profile?.first_name||'Member')} {String(member.profile?.last_name||'')}</p><p className="text-xs text-muted">{String(member.profile?.profile_id||member.id)}{member.is_admin?' · Administrator':''}</p></td><td className="p-4 break-all">{member.email}<p className="text-xs text-muted">{member.mobile_number||'No phone'}</p></td><td className="p-4">{member.deleted_at?'Deleted':label(member.status)}</td><td className="p-4"><div className="flex flex-wrap gap-2"><button aria-label={'View '+member.email} disabled={busy} onClick={()=>void openMember(member)} className="p-2 rounded-lg border border-border"><Eye size={16}/></button>{!member.is_admin&&(member.deleted_at?<button aria-label={'Restore '+member.email} disabled={busy} onClick={()=>void changeAccount(member,true)} className="p-2 rounded-lg border border-border"><RotateCcw size={16}/></button>:<><button aria-label={'Edit '+member.email} disabled={busy} onClick={()=>void openMember(member,true)} className="p-2 rounded-lg border border-border"><Pencil size={16}/></button><button aria-label={'Delete '+member.email} disabled={busy} onClick={()=>setPendingDelete(member)} className="p-2 rounded-lg border border-red-500/30 text-red-500"><Trash2 size={16}/></button></>)}</div></td></tr>)}</tbody></table>{loading?<p role="status" className="p-6 text-muted">Loading members…</p>:!members.length&&<p className="p-6 text-muted">No members found.</p>}</div>
    <div className="flex justify-between items-center text-sm"><span>{total} accounts · Page {page}</span><div className="flex gap-3"><button className="border border-border rounded-lg px-3 py-2 disabled:opacity-40" disabled={page<=1||loading} onClick={()=>setPage(p=>p-1)}>Previous</button><button className="border border-border rounded-lg px-3 py-2 disabled:opacity-40" disabled={page*25>=total||loading} onClick={()=>setPage(p=>p+1)}>Next</button></div></div>
    {detail&&<div className="fixed inset-0 bg-black/60 z-50 p-3 md:p-8 overflow-y-auto"><section role="dialog" aria-modal="true" aria-labelledby="member-dialog-title" className="bg-card text-foreground rounded-2xl border border-border max-w-4xl mx-auto p-5 md:p-8"><div className="flex items-center justify-between mb-6"><h2 id="member-dialog-title" className="text-xl font-semibold">{editing?'Edit member':'Complete member record'}</h2><button aria-label="Close member details" disabled={busy} onClick={()=>setDetail(null)}><X/></button></div>{editing?<form onSubmit={save} className="space-y-6"><fieldset><legend className="font-semibold mb-4">Account</legend><div className="grid sm:grid-cols-2 gap-4">{ACCOUNT_FIELDS.map(k=>field(k,account,setAccount))}</div></fieldset><fieldset><legend className="font-semibold mb-4">Profile, family and partner details</legend><div className="grid sm:grid-cols-2 gap-4">{PROFILE_FIELDS.map(k=>field(k,profile,setProfile))}</div></fieldset>{error&&<p role="alert" className="text-red-500">{error}</p>}<button disabled={busy} className="rounded-xl bg-primary text-primary-foreground px-6 py-3 disabled:opacity-40">{busy?'Saving…':'Save changes'}</button></form>:<div className="space-y-4">{Object.entries(detail).filter(([k])=>k!=='is_admin').map(([key,value])=><details key={key} open={['account','profile'].includes(key)} className="border border-border rounded-xl p-4"><summary className="font-semibold cursor-pointer mb-3">{label(key)}</summary><RecordView value={value}/></details>)}</div>}</section></div>}
    {pendingDelete&&<div className="fixed inset-0 bg-black/60 z-50 p-5 flex items-center justify-center"><section role="dialog" aria-modal="true" aria-labelledby="delete-title" className="max-w-md bg-card border border-border rounded-2xl p-6 space-y-4"><h2 id="delete-title" className="font-semibold text-lg">Delete this account?</h2><p className="text-sm">{pendingDelete.email} will lose access immediately. Its record will remain available under deleted accounts for restoration.</p>{error&&<p role="alert" className="text-red-500">{error}</p>}<div className="flex gap-3"><button disabled={busy} onClick={()=>setPendingDelete(null)} className="border border-border rounded-lg px-4 py-2">Cancel</button><button disabled={busy} onClick={()=>void changeAccount(pendingDelete)} className="bg-red-600 text-white rounded-lg px-4 py-2">{busy?'Deleting…':'Delete account'}</button></div></section></div>}
  </div>;
}
