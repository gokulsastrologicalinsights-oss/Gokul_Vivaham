import {getOperationalSettings} from '@/lib/operational-settings';
import {NextResponse} from 'next/server';
import {z} from 'zod';
import {authLib} from '@/lib/auth';
import {supabaseAdmin} from '@/lib/supabase/server';
export async function GET(){
 const user=await authLib.getServerUser();if(!user)return NextResponse.json({error:'Please sign in to view support requests'},{status:401});
 const {data,error}=await supabaseAdmin.from('support_requests').select('*').eq('user_id',user.id).order('created_at',{ascending:false}).limit(100);
 if(error)return NextResponse.json({error:'Unable to load requests'},{status:500});
 return NextResponse.json(data,{headers:{'Cache-Control':'no-store'}});
}
export async function POST(request:Request){
 if(request.headers.get('origin')!==new URL(request.url).origin)return NextResponse.json({error:'Forbidden'},{status:403});
 const user=await authLib.getServerUser();if(!user)return NextResponse.json({error:'Please sign in before sending a request'},{status:401});
 try {if(!(await getOperationalSettings()).support_requests_enabled)return NextResponse.json({error:'New support requests are temporarily paused. Please use our published contact details.'},{status:503});}catch{return NextResponse.json({error:'Support is temporarily unavailable. Please retry.'},{status:503});}
 const parsed=z.object({name:z.string().trim().min(2).max(100),email:z.email().max(254),mobile:z.string().max(30),subject:z.string().trim().min(3).max(100),message:z.string().trim().min(10).max(5000)}).strict().safeParse(await request.json().catch(()=>null));
 if(!parsed.success)return NextResponse.json({error:'Enter a valid name, email and message (10–5000 characters)'},{status:400});
 const {data,error}=await supabaseAdmin.from('support_requests').insert({...parsed.data,user_id:user.id}).select('id').single();
 if(error)return NextResponse.json({error:'Unable to save request. Please retry.'},{status:500});
 return NextResponse.json(data,{status:201,headers:{'Cache-Control':'no-store'}});
}

