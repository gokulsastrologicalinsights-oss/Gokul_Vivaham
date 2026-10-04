import {NextResponse} from 'next/server';
import {supabaseAdmin} from '@/lib/supabase/server';
export async function GET(){
 const {data,error}=await supabaseAdmin.from('sample_profiles').select('*').eq('published',true).order('id');
 if(error)return NextResponse.json({error:'Sample profiles are temporarily unavailable.'},{status:503});
 return NextResponse.json({profiles:data},{headers:{'Cache-Control':'no-store'}});
}
