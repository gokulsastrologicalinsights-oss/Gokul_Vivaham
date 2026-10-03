import {NextResponse} from 'next/server';
import {z} from 'zod';
import {authLib} from '@/lib/auth';
import {supabaseAdmin} from '@/lib/supabase/server';
export async function GET(){
 const access=await authLib.getServerAccess();if(!access?.isAdmin||access.role==='moderator')return NextResponse.json({error:'Administrator required'},{status:403});
 const {data,error}=await supabaseAdmin.from('admin_announcements').select('*').order('created_at',{ascending:false}).limit(100);
 if(error)return NextResponse.json({error:'Unable to load announcements'},{status:500});
 return NextResponse.json(data,{headers:{'Cache-Control':'no-store'}});
}
export async function POST(request:Request){
 if(request.headers.get('origin')!==new URL(request.url).origin)return NextResponse.json({error:'Forbidden'},{status:403});
 const access=await authLib.getServerAccess();if(!access?.isAdmin||access.role==='moderator')return NextResponse.json({error:'Administrator required'},{status:403});
 const parsed=z.object({requestId:z.uuid(),title:z.string().trim().min(3).max(120),message:z.string().trim().min(3).max(2000)}).strict().safeParse(await request.json().catch(()=>null));
 if(!parsed.success)return NextResponse.json({error:'Enter a title and message within the allowed lengths'},{status:400});
 const {data,error}=await supabaseAdmin.rpc('publish_admin_announcement',{actor_auth:access.user.id,request_key:parsed.data.requestId,heading:parsed.data.title,body:parsed.data.message});
 if(error)return NextResponse.json({error:'Unable to publish; retry the same request'},{status:409});
 return NextResponse.json({recipientCount:data},{headers:{'Cache-Control':'no-store'}});
}
