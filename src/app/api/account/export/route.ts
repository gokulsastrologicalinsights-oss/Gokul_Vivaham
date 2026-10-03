import { NextResponse } from 'next/server';
import { authLib } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase/server';
export const maxDuration=60;
export async function GET(request:Request){
 const user=await authLib.getServerUser();
 if(!user) return NextResponse.json({error:'Unauthorized'},{status:401});
 if(new URL(request.url).search) return NextResponse.json({error:'Export is available only for the signed-in account.'},{status:400});
 try{
  const account=await supabaseAdmin.from('users').select('*').eq('auth_user_id',user.id).single();
  if(account.error) throw account.error;
  const id=account.data.id;
  const collect=async(table:string,filter:(query:any)=>any)=>{
   const rows:any[]=[];
   for(let offset=0;offset<50000;offset+=500){
    const result=await filter(supabaseAdmin.from(table).select('*')).order('id',{ascending:true}).range(offset,offset+499);
    if(result.error) throw result.error;
    rows.push(...(result.data||[]));
    if((result.data||[]).length<500) return rows;
   }
   throw new Error('Export too large for synchronous delivery');
  };
  const sections=[['personal_profile','profiles'],['partner_preferences','partner_preferences'],['horoscope_upload','horoscope_uploads'],['gallery_photos','gallery_images'],['granted_consents','consent_logs'],['subscriptions','subscriptions'],['payment_history','payments'],['transactions','transactions'],['notifications','notifications'],['verification_requests','verification_requests'],['deletion_requests','deletion_requests'],['consultation_bookings','consultation_bookings'],['featured_profiles','featured_profiles'],['contact_unlocks','contact_unlocks'],['support_requests','support_requests'],['favorites','favorites'],['recent_activity_logs','activity_logs']] as const;
  const results=await Promise.all(sections.map(([,table])=>collect(table,q=>q.eq('user_id',id))));
  const output:Record<string,any>=Object.fromEntries(sections.map(([name],index)=>[name,results[index]]));
  output.personal_profile=output.personal_profile[0]||{};
  output.partner_preferences=output.partner_preferences[0]||{};
  output.payment_history=output.payment_history.map(({razorpay_signature,...payment}:any)=>payment);
  const [interests,blocks,reports,views,chats,compatibility,stories]=await Promise.all([
   collect('match_requests',q=>q.or(`sender_user_id.eq.${id},receiver_user_id.eq.${id}`)),
   collect('blocked_users',q=>q.eq('blocker_user_id',id)),
   collect('reports',q=>q.eq('reporter_user_id',id)),
   collect('profile_views',q=>q.eq('viewer_user_id',id)),
   collect('chats',q=>q.or(`user_one.eq.${id},user_two.eq.${id}`)),
   collect('compatibility_scores',q=>q.or(`user_one.eq.${id},user_two.eq.${id}`)),
   collect('success_stories',q=>q.or(`husband_user_id.eq.${id},wife_user_id.eq.${id}`)),
  ]);
  const messages:any[]=[];
  for(let offset=0;offset<chats.length;offset+=100){messages.push(...await collect('chat_messages',q=>q.in('chat_id',chats.slice(offset,offset+100).map(chat=>chat.id))));}
  return NextResponse.json({export_metadata:{platform:'Gokul Vivaham',exported_at:new Date().toISOString(),account_id:id,format_version:2},user_account:account.data,...output,interests,blocked_members:blocks,reports,profile_views:views,chats,chat_messages:messages,compatibility_scores:compatibility,success_stories:stories,export_limits:{files:'Metadata only; file contents are not embedded.',pagination:'All listed sections are paged; oversized requests fail rather than silently truncate.',external_records:'Provider records and backups are not included.'}},{headers:{'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'}});
 }catch{
  return NextResponse.json({error:'Unable to prepare the complete export. Please retry or contact support for a large export.'},{status:500});
 }
}

