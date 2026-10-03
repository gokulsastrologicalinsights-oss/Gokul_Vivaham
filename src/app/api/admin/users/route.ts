import { NextResponse } from 'next/server';
import { authLib } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase/server';
export async function GET(request: Request) {
  const access=await authLib.getServerAccess();
  if(!access) return NextResponse.json({error:'Unauthorized'},{status:401});
  if(!access.isAdmin || !['admin','super_admin'].includes(access.role)) return NextResponse.json({error:'Forbidden'},{status:403});
  const params=new URL(request.url).searchParams;
  const page=Math.max(1,Number(params.get('page'))||1);
  const q=(params.get('q')||'').trim().slice(0,100);
  let query=supabaseAdmin.from('users').select('*,profile:profiles(*)',{count:'exact'}).order('created_at',{ascending:false});
  if(params.get('deleted')!=='true') query=query.is('deleted_at',null);
  if(q) {
    const safe=q.replace(/[^a-zA-Z0-9@ ._+-]/g,'');
    const {data:profiles}=await supabaseAdmin.from('profiles').select('user_id').or(`first_name.ilike.%${safe}%,last_name.ilike.%${safe}%,profile_id.ilike.%${safe}%`).limit(100);
    const ids=(profiles||[]).map(p=>p.user_id);
    query=query.or(`email.ilike.%${safe}%,mobile_number.ilike.%${safe}%${ids.length?`,id.in.(${ids.join(',')})`:''}`);
  }
  const {data,error,count}=await query.range((page-1)*25,page*25-1);
  if(error) return NextResponse.json({error:'Could not load members.'},{status:500});
  const {data:admins}=await supabaseAdmin.from('admin_users').select('auth_user_id');
  const adminIds=new Set((admins||[]).map(a=>a.auth_user_id));
  return NextResponse.json({users:(data||[]).map(u=>({...u,is_admin:adminIds.has(u.auth_user_id)})),total:count||0,page},{headers:{'Cache-Control':'no-store'}});
}
