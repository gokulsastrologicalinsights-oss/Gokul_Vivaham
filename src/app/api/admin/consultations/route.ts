import { NextResponse } from 'next/server';
import { z } from 'zod';
import { authLib } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase/server';
const meetingUrl=z.url().max(1000).refine(value=>{
  const url=new URL(value); return url.protocol==='https:' && !url.username && !url.password &&
    ['meet.google.com','zoom.us','teams.microsoft.com','teams.live.com'].some(host=>url.hostname===host || url.hostname.endsWith('.'+host));
});
const input=z.discriminatedUnion('action',[
  z.object({action:z.literal('status'),bookingId:z.uuid(),status:z.enum(['approved','cancelled'])}).strict(),
  z.object({action:z.literal('reschedule'),bookingId:z.uuid(),consultationDate:z.iso.date()}).strict(),
  z.object({action:z.literal('schedule'),bookingId:z.uuid(),meetingUrl,durationMinutes:z.union([z.literal(30),z.literal(60)]).default(30),scheduledAt:z.iso.datetime({offset:true})}).strict(),
]);
export async function PATCH(request:Request){
  if(request.headers.get('origin')!==new URL(request.url).origin) return NextResponse.json({error:'Forbidden'},{status:403});
  const access=await authLib.getServerAccess();
  if(!access) return NextResponse.json({error:'Unauthorized'},{status:401});
  if(!access.isAdmin || access.mfaRequired) return NextResponse.json({error:'Forbidden'},{status:403});
  const parsed=input.safeParse(await request.json().catch(()=>null));
  if(!parsed.success) return NextResponse.json({error:'Invalid consultation update.'},{status:400});
  if(parsed.data.action==='status'){
    const {data,error}=await supabaseAdmin.from('consultation_bookings').update({payment_status:parsed.data.status}).eq('id',parsed.data.bookingId).select('id').maybeSingle();
    if(error || !data) return NextResponse.json({error:'Unable to update this booking.'},{status:409});
    return NextResponse.json({success:true});
  }
  if(parsed.data.action==='reschedule'){
    if(Date.parse(`${parsed.data.consultationDate}T23:59:59Z`)<=Date.now()) return NextResponse.json({error:'Choose a future consultation date.'},{status:400});
    const {data,error}=await supabaseAdmin.from('consultation_bookings').update({consultation_date:parsed.data.consultationDate}).eq('id',parsed.data.bookingId).select('id').maybeSingle();
    if(error || !data) return NextResponse.json({error:'Unable to reschedule this booking.'},{status:409});
    return NextResponse.json({success:true});
  }
  if(Date.parse(parsed.data.scheduledAt)<=Date.now()) return NextResponse.json({error:'Enter a future appointment and a valid HTTPS Google Meet, Zoom or Teams link.'},{status:400});
  const {error}=await supabaseAdmin.rpc('schedule_consultation_slot',{actor:access.user.id,booking:parsed.data.bookingId,link:parsed.data.meetingUrl,appointment:parsed.data.scheduledAt,minutes:parsed.data.durationMinutes});
  if(error) return NextResponse.json({error:'Unable to schedule. Choose a non-overlapping time for an approved booking.'},{status:409});
  return NextResponse.json({success:true});
}

