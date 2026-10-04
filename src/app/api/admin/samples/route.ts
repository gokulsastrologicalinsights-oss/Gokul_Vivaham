import {NextResponse} from 'next/server';
import {z} from 'zod';
import {authLib} from '@/lib/auth';
import {supabaseAdmin} from '@/lib/supabase/server';
const text=z.string().trim().min(1).max(150);
const input=z.object({id:z.string().regex(/^sample-[mf]\d{2}$/),name:text,age:z.number().int().min(21).max(80),city:text,education:text,occupation:text,about:z.string().trim().min(1).max(1500),published:z.boolean(),portrait_id:z.string().regex(/^sample-[mf]0[1-3]$/).optional()}).strict();
export async function GET(){
 const access=await authLib.getServerAccess();
 if(!access?.isAdmin)return NextResponse.json({error:'Administrator verification required.'},{status:403});
 const {data,error}=await supabaseAdmin.from('sample_profiles').select('*').order('id');
 if(error)return NextResponse.json({error:'Unable to load samples.'},{status:503});
 return NextResponse.json({profiles:data},{headers:{'Cache-Control':'no-store'}});
}
export async function PATCH(request:Request){
 if(request.headers.get('origin')!==new URL(request.url).origin)return NextResponse.json({error:'Forbidden'},{status:403});
 const access=await authLib.getServerAccess();
 if(!access?.isAdmin || !['admin','super_admin'].includes(access.role))return NextResponse.json({error:'Administrator verification required.'},{status:403});
 const parsed=input.safeParse(await request.json().catch(()=>null));
 if(!parsed.success)return NextResponse.json({error:'Check the sample details.'},{status:400});
 const {id,...changes}=parsed.data;
 const {data,error}=await supabaseAdmin.from('sample_profiles').update(changes).eq('id',id).select().single();
 if(error)return NextResponse.json({error:'Sample could not be saved.'},{status:409});
 return NextResponse.json({profile:data},{headers:{'Cache-Control':'no-store'}});
}


