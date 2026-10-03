import {NextResponse} from 'next/server';
import {z} from 'zod';
import {authLib} from '@/lib/auth';
import {supabaseAdmin} from '@/lib/supabase/server';
export async function GET(){
 const access=await authLib.getServerAccess();
 if(!access?.isAdmin) return NextResponse.json({error:'Forbidden'},{status:403});
 const {data,error}=await supabaseAdmin.from('reports').select('*').order('created_at',{ascending:false}).limit(200);
 if(error) return NextResponse.json({error:'Unable to load reports'},{status:500});
 return NextResponse.json(data,{headers:{'Cache-Control':'no-store'}});
}
export async function PATCH(request:Request){
 if(request.headers.get('origin')!==new URL(request.url).origin) return NextResponse.json({error:'Forbidden'},{status:403});
 const access=await authLib.getServerAccess();
 if(!access?.isAdmin) return NextResponse.json({error:'Forbidden'},{status:403});
 const parsed=z.object({reportId:z.uuid(),action:z.enum(['warn','suspend','ban','dismiss']),notes:z.string().trim().min(3).max(2000)}).strict().safeParse(await request.json().catch(()=>null));
 if(!parsed.success) return NextResponse.json({error:'Decision and review notes required'},{status:400});
 const {error}=await supabaseAdmin.rpc('review_safety_report',{actor:access.user.id,report_key:parsed.data.reportId,decision:parsed.data.action,note:parsed.data.notes});
 if(error) return NextResponse.json({error:'Report unavailable, already reviewed, or protected account.'},{status:409});
 return NextResponse.json({success:true});
}
