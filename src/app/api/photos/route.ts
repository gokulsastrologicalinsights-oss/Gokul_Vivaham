import { NextResponse } from 'next/server';
import { authLib } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase/server';
import { deleteR2Objects, getR2Object, getR2SignedUrl } from '@/lib/r2';
import { z } from 'zod';

const variantPath = /^[0-9a-f-]{36}\/[0-9a-f-]{36}\/(?:thumbnail|display)\.webp$/;
const photoPath = /^[0-9a-f-]{36}\/(?:[0-9a-f-]{36}\/(?:thumbnail|display)\.webp|[^/]{1,120}\.(jpg|png|webp))$/;
const input = z.object({
  displayPath: z.string().regex(variantPath),
  thumbnailPath: z.string().regex(variantPath),
  primary: z.boolean().default(false),
}).superRefine((value, context) => {
  if (value.displayPath.split('/')[0] !== value.thumbnailPath.split('/')[0] || value.displayPath.split('/')[1] !== value.thumbnailPath.split('/')[1]) {
    context.addIssue({ code: 'custom', path: ['thumbnailPath'], message: 'Photo variants must belong to the same upload.' });
  }
}).strict();
export async function POST(request:Request) {
  if(request.headers.get('origin')!==new URL(request.url).origin) return NextResponse.json({error:'Forbidden'},{status:403});
  const user=await authLib.getServerUser();
  if(!user) return NextResponse.json({error:'Unauthorized'},{status:401});
  const parsed=input.safeParse(await request.json().catch(()=>null));
  if(!parsed.success) return NextResponse.json({error:'Invalid photo'},{status:400});
  const { displayPath, thumbnailPath, primary } = parsed.data;
  try {
    await Promise.all([getR2Object('photos', displayPath), getR2Object('photos', thumbnailPath)]);
  } catch {
    return NextResponse.json({ error: 'Photo variants are unavailable. Please retry the upload.' }, { status: 409 });
  }
  const {data,error}=await supabaseAdmin.rpc('attach_member_photo',{actor:user.id,display_path:displayPath,thumbnail_path:thumbnailPath,primary_photo:primary});
  if(error) {
    await deleteR2Objects('photos', [displayPath, thumbnailPath]).catch(() => undefined);
    return NextResponse.json({error:'Photo is unavailable or the two-photo limit has been reached.'},{status:409});
  }
  return NextResponse.json({photo:data},{headers:{'Cache-Control':'no-store'}});
}
export async function GET(request:Request) {
  const denied=()=>new Response('Photo unavailable',{status:404,headers:{'Cache-Control':'no-store'}});
  const access=await authLib.getServerAccess();
  if(!access || access.mfaRequired) return denied();
  const path=new URL(request.url).searchParams.get('path')||'';
  if(!photoPath.test(path)) return denied();
  let {data:photo,error}=await supabaseAdmin.from('gallery_images').select('user_id,moderation_status,privacy_level,is_private').eq('display_key',path).maybeSingle();
  if (!photo && !error) ({data:photo,error}=await supabaseAdmin.from('gallery_images').select('user_id,moderation_status,privacy_level,is_private').eq('thumbnail_key',path).maybeSingle());
  if (!photo && !error) ({data:photo,error}=await supabaseAdmin.from('gallery_images').select('user_id,moderation_status,privacy_level,is_private').eq('image_url','/api/photos?path='+path).maybeSingle());
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
  try {
    const signedUrl = await getR2SignedUrl('photos', path, 120);
    return Response.redirect(signedUrl, 307);
  } catch {
    return denied();
  }
}
