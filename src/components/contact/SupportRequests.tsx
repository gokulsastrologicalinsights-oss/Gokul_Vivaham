'use client';
import {useEffect,useState} from 'react';
import {supabase} from '@/lib/supabase';
import {syncServerSession} from '@/lib/auth/session-client';
type Ticket={id:string;name:string;subject:string;message:string;status:string;reply:string|null;created_at:string};
export function SupportRequests({admin=false}:{admin?:boolean}){
 const [rows,setRows]=useState<Ticket[]>([]),[error,setError]=useState(''),[loading,setLoading]=useState(true),[busy,setBusy]=useState('');
 const endpoint=admin?'/api/admin/support':'/api/support';
 async function load(){setLoading(true);setError('');try{
 const {data:{session}}=await supabase.auth.getSession();if(session)await syncServerSession(session.access_token);
 const response=await fetch(endpoint,{cache:'no-store'});const data=await response.json();if(!response.ok)throw new Error(data.error);setRows(data);
 }catch(e){setError(e instanceof Error?e.message:'Unable to load requests');}finally{setLoading(false);}}
 useEffect(()=>{void load();},[admin]);
 return <section className="p-6 border border-border rounded-2xl bg-card text-foreground"><h2 className="text-xl font-bold">{admin?'Support queue':'My support requests'}</h2><button type="button" className="underline my-3" onClick={load}>Refresh requests</button>{error&&<p role="alert">{error}</p>}{loading?<p>Loading…</p>:error?null:rows.length===0?<p>No requests.</p>:rows.map(row=><article key={row.id} className="border-t border-border py-4"><p className="font-bold">{row.subject} — {row.status}</p>{admin&&<p>{row.name}</p>}<p className="whitespace-pre-wrap">{row.message}</p>{row.reply&&<p className="mt-3 whitespace-pre-wrap">Support reply: {row.reply}</p>}{admin&&row.status==='open'&&<form onSubmit={async event=>{event.preventDefault();const values=new FormData(event.currentTarget);setBusy(row.id);setError('');try{const response=await fetch(endpoint,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({requestId:row.id,reply:values.get('reply')})});const data=await response.json();if(!response.ok)throw new Error(data.error);await load();}catch(e){setError(e instanceof Error?e.message:'Reply failed');}finally{setBusy('');}}}><label className="block mt-3">Reply<textarea name="reply" required minLength={3} maxLength={5000} className="block w-full p-3 border border-border bg-background rounded" /></label><button className="underline mt-3" disabled={busy===row.id}>{busy===row.id?'Saving…':'Reply and resolve'}</button></form>}</article>)}</section>;
}

