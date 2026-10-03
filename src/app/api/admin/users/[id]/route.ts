import { NextResponse } from 'next/server';
import { z } from 'zod';
import { authLib } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase/server';
import { PROFILE_FIELDS,NUMBER_FIELDS,BOOLEAN_FIELDS } from '@/lib/admin/member-fields';

type Context={params:Promise<{id:string}>};
const profileShape:Record<string,z.ZodType>={};
for(const field of PROFILE_FIELDS) profileShape[field]=(BOOLEAN_FIELDS.has(field)?z.boolean():NUMBER_FIELDS.has(field)?z.number().finite().min(0):z.string().max(5000)).nullable().optional();
profileShape.visibility=z.enum(['public','private']).optional();
profileShape.moderation_status=z.enum(['pending','approved','rejected']).optional();
profileShape.date_of_birth=z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional();
const patchSchema=z.object({account:z.object({email:z.email().optional(),mobile_number:z.string().regex(/^\+?\d{7,15}$/).nullable().optional(),status:z.enum(['active','suspended']).optional(),email_verified:z.boolean().optional(),mobile_verified:z.boolean().optional()}).strict().optional(),profile:z.object(profileShape).strict().optional()}).strict();
async function authorize(request:Request,context:Context,mutation=false){
  const access=await authLib.getServerAccess();
  if(!access) return {response:NextResponse.json({error:'Unauthorized'},{status:401})};
  if(!access.isAdmin || !['admin','super_admin'].includes(access.role)) return {response:NextResponse.json({error:'Forbidden'},{status:403})};
  if(mutation && request.headers.get('origin')!==new URL(request.url).origin) return {response:NextResponse.json({error:'Forbidden'},{status:403})};
  const {id}=await context.params;
  if(!z.uuid().safeParse(id).success) return {response:NextResponse.json({error:'Invalid member ID'},{status:400})};
  const {data:user,error}=await supabaseAdmin.from('users').select('*').eq('id',id).maybeSingle();
  if(error) return {response:NextResponse.json({error:'Could not load member'},{status:500})};
  if(!user) return {response:NextResponse.json({error:'Member not found'},{status:404})};
  return {access,id,user};
}
export async function GET(request:Request,context:Context){
  const result=await authorize(request,context);if(result.response)return result.response;
  const {id,user}=result;
  const sections=[['profile','profiles'],['preferences','partner_preferences'],['gallery','gallery_images'],['horoscopes','horoscope_uploads'],['verification','verification_requests'],['subscriptions','subscriptions'],['payments','payments'],['transactions','transactions'],['consents','consent_logs']] as const;
  const results=await Promise.all(sections.map(([,table])=>supabaseAdmin.from(table).select('*').eq('user_id',id)));
  if(results.some(r=>r.error)) return NextResponse.json({error:'Could not load full member details'},{status:500});
  const details=Object.fromEntries(sections.map(([name],i)=>[name,name==='profile'||name==='preferences'?results[i].data?.[0]||null:results[i].data||[]]));
  const {data:auth,error}=await supabaseAdmin.auth.admin.getUserById(user.auth_user_id);
  if(error) return NextResponse.json({error:'Could not load login information'},{status:500});
  const {data:membership}=await supabaseAdmin.from('admin_users').select('id').eq('auth_user_id',user.auth_user_id).maybeSingle();
  return NextResponse.json({account:user,...details,is_admin:Boolean(membership),login:{last_sign_in_at:auth.user.last_sign_in_at,email_confirmed_at:auth.user.email_confirmed_at,created_at:auth.user.created_at}},{headers:{'Cache-Control':'no-store'}});
}
export async function PATCH(request:Request,context:Context){
  const result=await authorize(request,context,true);if(result.response)return result.response;
  const parsed=patchSchema.safeParse(await request.json().catch(()=>null));
  if(!parsed.success)return NextResponse.json({error:'Check the field values. Only supported member fields can be changed.'},{status:400});
  const account=parsed.data.account||{};
  if(result.user.deleted_at)return NextResponse.json({error:'Restore this deleted member before editing.'},{status:409});
  const {data:adminMember}=await supabaseAdmin.from('admin_users').select('id').eq('auth_user_id',result.user.auth_user_id).maybeSingle();
  if(adminMember)return NextResponse.json({error:'Administrator accounts are protected from member edits.'},{status:409});
  const changedEmail=account.email && account.email!==result.user.email;
  if(changedEmail){const {error}=await supabaseAdmin.auth.admin.updateUserById(result.user.auth_user_id,{email:account.email});if(error)return NextResponse.json({error:'Could not update login email. It may already be in use.'},{status:409});}
  const {error}=await supabaseAdmin.rpc('admin_edit_member',{actor:result.access!.user.id,target:result.id,account_patch:account,profile_patch:parsed.data.profile||{}});
  if(error){
    if(changedEmail) await supabaseAdmin.auth.admin.updateUserById(result.user.auth_user_id,{email:result.user.email});
    return NextResponse.json({error:'Could not save member changes.'},{status:409});
  }
  return NextResponse.json({success:true});
}
async function changeDeletion(request:Request,context:Context,restore:boolean){
  const result=await authorize(request,context,true);if(result.response)return result.response;
  const {error}=await supabaseAdmin.rpc('admin_delete_member',{actor:result.access!.user.id,target:result.id,restore});
  if(error)return NextResponse.json({error:'Could not change account status. Administrator accounts are protected.'},{status:409});
  return NextResponse.json({success:true});
}
export async function DELETE(request:Request,context:Context){return changeDeletion(request,context,false);}
export async function POST(request:Request,context:Context){
  if((await request.json().catch(()=>null))?.action!=='restore')return NextResponse.json({error:'Unsupported action'},{status:400});
  return changeDeletion(request,context,true);
}
