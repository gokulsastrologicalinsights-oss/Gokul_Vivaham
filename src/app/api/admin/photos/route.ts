import { NextResponse } from 'next/server';
import { z } from 'zod';
import { authLib } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase/server';
const input=z.object({photoId:z.uuid(),action:z.enum(['approve','reject','flag'])}).strict();
export async function PATCH(request:Request) {
  if(request.headers.get('origin')!==new URL(request.url).origin) return NextResponse.json({error:'Forbidden'},{status:403});
  const access=await authLib.getServerAccess();
  if(!access) return NextResponse.json({error:'Unauthorized'},{status:401});
  if(!access.isAdmin) return NextResponse.json({error:'Forbidden'},{status:403});
  const parsed=input.safeParse(await request.json().catch(()=>null));
  if(!parsed.success) return NextResponse.json({error:'Invalid review'},{status:400});
  const {error}=await supabaseAdmin.rpc('review_member_photo',{actor:access.user.id,photo_id:parsed.data.photoId,decision:{approve:'approved',reject:'rejected',flag:'flagged'}[parsed.data.action]});
  if(error) return NextResponse.json({error:'Photo review could not be saved. Please refresh.'},{status:409});
  return NextResponse.json({success:true});
}
