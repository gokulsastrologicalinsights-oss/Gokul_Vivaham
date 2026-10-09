import { NextResponse } from 'next/server';
import { z } from 'zod';
import { authLib } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase/server';
import { razorpayClient, paymentsConfigured } from '@/lib/payments/config';
import { deleteR2Objects, type StorageBucket } from '@/lib/r2';
export const maxDuration=60;
export async function GET(){
 const access=await authLib.getServerAccess();
 if(!access?.isAdmin || !['admin','super_admin'].includes(access.role)) return NextResponse.json({error:'Forbidden'},{status:403});
 const {data,error}=await supabaseAdmin.from('erasure_jobs').select('request_id,state,created_at,completed_at,target_user_id').order('created_at',{ascending:false}).limit(100);
 if(error) return NextResponse.json({error:'Unable to load erasure jobs'},{status:500});
 return NextResponse.json(data,{headers:{'Cache-Control':'no-store'}});
}
export async function POST(request:Request){
 if(request.headers.get('origin')!==new URL(request.url).origin) return NextResponse.json({error:'Forbidden'},{status:403});
 const access=await authLib.getServerAccess();
 if(!access) return NextResponse.json({error:'Unauthorized'},{status:401});
 if(!access.isAdmin || !['admin','super_admin'].includes(access.role)) return NextResponse.json({error:'Forbidden'},{status:403});
 const input=z.object({requestId:z.uuid()}).strict().safeParse(await request.json().catch(()=>null));
 if(!input.success) return NextResponse.json({error:'Invalid request'},{status:400});
 const started=await supabaseAdmin.rpc('begin_member_erasure',{actor_id:access.user.id,request_key:input.data.requestId});
 if(started.error) return NextResponse.json({error:'Request unavailable, protected account, or erasure already running.'},{status:409});
 const job=started.data;
 if(job.state==='completed') return NextResponse.json({success:true,jobId:job.id});
 try{
  const subscriptions=await supabaseAdmin.from('subscriptions').select('razorpay_subscription_id').eq('user_id',job.target_user_id);
  if(subscriptions.error) throw subscriptions.error;
  for(const subscription of subscriptions.data || []){
   const providerId=subscription.razorpay_subscription_id;
   if(!providerId) continue;
   if(!paymentsConfigured) throw new Error('Gateway cancellation requires configuration');
   const current=await razorpayClient.subscriptions.fetch(providerId);
   if(!['cancelled','completed','expired'].includes(current.status)) await razorpayClient.subscriptions.cancel(providerId,false);
   const confirmed=await razorpayClient.subscriptions.fetch(providerId);
   if(!['cancelled','completed','expired'].includes(confirmed.status)) throw new Error('Cancellation unconfirmed');
  }
  for(;;){
   const listed=await supabaseAdmin.rpc('erasure_storage_files',{job_key:job.id});
   if(listed.error) throw listed.error;
   if(!listed.data?.length) break;
   const groups=new Map<string,string[]>();
   for(const file of listed.data.slice(0,100)){groups.set(file.bucket,[...(groups.get(file.bucket)||[]),file.path]);}
   for(const [bucket,paths] of groups){
    if(!['photos','horoscopes','id-proofs'].includes(bucket)) throw new Error('Unknown storage bucket');
    await deleteR2Objects(bucket as StorageBucket,paths);
   }
  }
  const erased=await supabaseAdmin.rpc('erase_member_records',{job_key:job.id});
  if(erased.error) throw erased.error;
  const authUser=await supabaseAdmin.auth.admin.getUserById(job.auth_user_id);
  if(authUser.data.user){const removed=await supabaseAdmin.auth.admin.deleteUser(job.auth_user_id);if(removed.error) throw removed.error;}
  else if(authUser.error?.status!==404) throw authUser.error || new Error('Auth lookup failed');
  const completed=await supabaseAdmin.from('erasure_jobs').update({state:'completed',completed_at:new Date().toISOString(),lease_until:null,error:null}).eq('id',job.id);
  if(completed.error) throw completed.error;
  return NextResponse.json({success:true,jobId:job.id});
 }catch{
  await supabaseAdmin.from('erasure_jobs').update({state:'failed',lease_until:null,error:'Cleanup incomplete; retry required.'}).eq('id',job.id);
  return NextResponse.json({error:'Erasure is incomplete. The member is blocked; retry this request to finish cleanup.',jobId:job.id},{status:500});
 }
}
