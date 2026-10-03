import {NextResponse} from 'next/server';
import {z} from 'zod';
import {authLib} from '@/lib/auth';
import {supabaseAdmin} from '@/lib/supabase/server';
import {getOperationalSettings} from '@/lib/operational-settings';
export async function GET(){
 const access=await authLib.getServerAccess();if(!access?.isAdmin||access.role==='moderator')return NextResponse.json({error:'Administrator required'},{status:403});
 try{return NextResponse.json(await getOperationalSettings(),{headers:{'Cache-Control':'no-store'}});}catch{return NextResponse.json({error:'Unable to load settings'},{status:503});}
}
export async function PATCH(request:Request){
 if(request.headers.get('origin')!==new URL(request.url).origin)return NextResponse.json({error:'Forbidden'},{status:403});
 const access=await authLib.getServerAccess();if(!access?.isAdmin||access.role==='moderator')return NextResponse.json({error:'Administrator required'},{status:403});
 const parsed=z.object({version:z.number().int().positive(),paid_orders_enabled:z.boolean(),support_requests_enabled:z.boolean()}).strict().safeParse(await request.json().catch(()=>null));
 if(!parsed.success)return NextResponse.json({error:'Invalid settings'},{status:400});
 const {error}=await supabaseAdmin.rpc('update_operational_settings',{actor_auth:access.user.id,expected_version:parsed.data.version,paid_enabled:parsed.data.paid_orders_enabled,support_enabled:parsed.data.support_requests_enabled});
 if(error)return NextResponse.json({error:'Settings changed or save failed. Reload before retrying.'},{status:409});
 return NextResponse.json({success:true});
}
