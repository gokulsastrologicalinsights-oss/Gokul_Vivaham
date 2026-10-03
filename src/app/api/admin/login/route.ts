import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { resolveAccess } from '@/lib/auth/access';
export async function POST(request: Request) {
  if(request.headers.get('origin') !== new URL(request.url).origin) return NextResponse.json({error:'Forbidden'},{status:403});
  const body = await request.json().catch(() => null);
  if(typeof body?.username !== 'string' || typeof body?.password !== 'string' || body.password.length>200) return NextResponse.json({error:'Enter your admin ID and password.'},{status:400});
  const email = body.username.trim() === process.env.ADMIN_LOGIN_ID ? process.env.ADMIN_LOGIN_EMAIL : body.username.trim();
  if(!email) return NextResponse.json({error:'Invalid admin credentials.'},{status:401});
  const client = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,{auth:{persistSession:false,autoRefreshToken:false}});
  const {data,error} = await client.auth.signInWithPassword({email,password:body.password});
  if(error || !data.session) return NextResponse.json({error:'Invalid admin credentials.'},{status:401});
  const access = await resolveAccess(data.session.access_token);
  if(!access || !['admin','super_admin'].includes(access.role)) {
    await client.auth.signOut();
    return NextResponse.json({error:'Administrator access required.'},{status:403});
  }
  return NextResponse.json({access_token:data.session.access_token,refresh_token:data.session.refresh_token},{headers:{'Cache-Control':'no-store'}});
}
