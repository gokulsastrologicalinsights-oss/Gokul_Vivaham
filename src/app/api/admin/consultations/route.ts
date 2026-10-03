import { NextResponse } from 'next/server';
import { z } from 'zod';
import { authLib } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase/server';
const input=z.object({bookingId:z.uuid(),meetingUrl:z.url().max(1000).refine(value=>{
  const url=new URL(value); return url.protocol==='https:' && !url.username && !url.password &&
    ['meet.google.com','zoom.us','teams.microsoft.com','teams.live.com'].some(host=>url.hostname===host || url.hostname.endsWith('.'+host));
}),durationMinutes:z.union([z.literal(30),z.literal(60)]).default(30),scheduledAt:z.iso.datetime({offset:true})}).strict();
export async function PATCH(request:Request){
  if(request.headers.get('origin')!==new URL(request.url).origin) return NextResponse.json({error:'Forbidden'},{status:403});
  const access=await authLib.getServerAccess();
  if(!access) return NextResponse.json({error:'Unauthorized'},{status:401});
  if(!access.isAdmin) return NextResponse.json({error:'Forbidden'},{status:403});
  const parsed=input.safeParse(await request.json().catch(()=>null));
  if(!parsed.success || Date.parse(parsed.data.scheduledAt)<=Date.now()) return NextResponse.json({error:'Enter a future appointment and a valid HTTPS Google Meet, Zoom or Teams link.'},{status:400});
  const {error}=await supabaseAdmin.rpc('schedule_consultation_slot',{actor:access.user.id,booking:parsed.data.bookingId,link:parsed.data.meetingUrl,appointment:parsed.data.scheduledAt,minutes:parsed.data.durationMinutes});
  if(error) return NextResponse.json({error:'Unable to schedule. Choose a non-overlapping time for an approved booking.'},{status:409});
  return NextResponse.json({success:true});
}

