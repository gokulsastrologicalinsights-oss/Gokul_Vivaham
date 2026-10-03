import {NextResponse} from 'next/server';
import {z} from 'zod';
import {authLib} from '@/lib/auth';
import {supabaseAdmin} from '@/lib/supabase/server';
export async function GET(){
 const access=await authLib.getServerAccess();if(!access?.isAdmin)return NextResponse.json({error:'Forbidden'},{status:403});
 const {data,error}=await supabaseAdmin.from('support_requests').select('*').order('created_at',{ascending:false}).limit(200);
 if(error)return NextResponse.json({error:'Unable to load requests'},{status:500});
 return NextResponse.json(data,{headers:{'Cache-Control':'no-store'}});
}
export async function PATCH(request:Request){
 if(request.headers.get('origin')!==new URL(request.url).origin)return NextResponse.json({error:'Forbidden'},{status:403});
 const access=await authLib.getServerAccess();if(!access?.isAdmin)return NextResponse.json({error:'Forbidden'},{status:403});
 const parsed=z.object({requestId:z.uuid(),reply:z.string().trim().min(3).max(5000)}).strict().safeParse(await request.json().catch(()=>null));
 if(!parsed.success)return NextResponse.json({error:'A reply of 3–5000 characters is required'},{status:400});
 const {error}=await supabaseAdmin.rpc('reply_support_request',{actor:access.user.id,request_key:parsed.data.requestId,response_text:parsed.data.reply});
 if(error)return NextResponse.json({error:'Request unavailable or already resolved'},{status:409});
 return NextResponse.json({success:true});
}
