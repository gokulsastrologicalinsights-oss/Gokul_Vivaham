import { NextResponse } from 'next/server';
import { authLib } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase/server';
import { z } from 'zod';

const photoPath = /^[0-9a-f-]{36}\/[0-9a-f-]{36}\.(jpg|png|webp)$/;
const input = z.object({ path:z.string().regex(photoPath), primary:z.boolean().default(false) }).strict();
export async function POST(request:Request) {
  if(request.headers.get('origin')!==new URL(request.url).origin) return NextResponse.json({error:'Forbidden'},{status:403});
  const user=await authLib.getServerUser();
  if(!user) return NextResponse.json({error:'Unauthorized'},{status:401});
  const parsed=input.safeParse(await request.json().catch(()=>null));
  if(!parsed.success) return NextResponse.json({error:'Invalid photo'},{status:400});
  const {data,error}=await supabaseAdmin.rpc('attach_member_photo',{actor:user.id,path:parsed.data.path,primary_photo:parsed.data.primary});
  if(error) return NextResponse.json({error:'Photo is unavailable or the three-photo limit has been reached.'},{status:409});
  return NextResponse.json({photo:data},{headers:{'Cache-Control':'no-store'}});
}
export async function GET(request:Request) {
  const denied=()=>new Response('Photo unavailable',{status:404,headers:{'Cache-Control':'no-store'}});
  const access=await authLib.getServerAccess();
  if(!access || access.mfaRequired) return denied();
  const path=new URL(request.url).searchParams.get('path')||'';
  if(!photoPath.test(path)) return denied();
  const {data:photo,error}=await supabaseAdmin.from('gallery_images').select('user_id,moderation_status,privacy_level,is_private').eq('image_url','/api/photos?path='+path).maybeSingle();
  if(error || !photo) return denied();
  if(photo.user_id!==access.user.id && !access.isAdmin) {
    const {data:profile}=await supabaseAdmin.from('profiles').select('visibility,is_suspended,deleted_at').eq('user_id',photo.user_id).maybeSingle();
    const {data:account}=await supabaseAdmin.from('users').select('status,deleted_at').eq('id',photo.user_id).maybeSingle();
    if(!profile || profile.visibility!=='public' || profile.is_suspended || profile.deleted_at || account?.status!=='active' || account.deleted_at || photo.moderation_status!=='approved') return denied();
    const {data:blocked,error:blockError}=await supabaseAdmin.from('blocked_users').select('id').or(`and(blocker_user_id.eq.${access.user.id},blocked_user_id.eq.${photo.user_id}),and(blocker_user_id.eq.${photo.user_id},blocked_user_id.eq.${access.user.id})`).limit(1);
    if(blockError || blocked?.length) return denied();
    if(photo.privacy_level==='hidden') return denied();
    if(photo.privacy_level==='premium_only' && !['silver','gold','diamond'].includes(access.role)) return denied();
    if(photo.privacy_level==='matches_only') {
      const {data:match,error:matchError}=await supabaseAdmin.from('match_requests').select('id').eq('status','accepted').or(`and(sender_user_id.eq.${access.user.id},receiver_user_id.eq.${photo.user_id}),and(sender_user_id.eq.${photo.user_id},receiver_user_id.eq.${access.user.id})`).limit(1);
      if(matchError || !match?.length) return denied();
    } else if(photo.privacy_level!=='premium_only' && (photo.privacy_level!=='public' || photo.is_private)) return denied();
  }
  const {data:file,error:fileError}=await supabaseAdmin.storage.from('photos').download(path);
  if(fileError || !file) return denied();
  return new Response(await file.arrayBuffer(),{headers:{'Content-Type':file.type,'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'}});
}
