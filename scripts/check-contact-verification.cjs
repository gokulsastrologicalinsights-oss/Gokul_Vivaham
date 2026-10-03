const fs = require('node:fs');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const { createClient } = require('@supabase/supabase-js');
const env = Object.fromEntries(fs.readFileSync('.env.local','utf8').split(/\r?\n/).filter(l=>l&&!l.startsWith('#')).map(l=>{const i=l.indexOf('=');return [l.slice(0,i),l.slice(i+1)];}));
const opts = {auth:{persistSession:false,autoRefreshToken:false}};
const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL,env.SUPABASE_SERVICE_ROLE_KEY,opts);
const member = createClient(env.NEXT_PUBLIC_SUPABASE_URL,env.NEXT_PUBLIC_SUPABASE_ANON_KEY,opts);
const base = env.NEXT_PUBLIC_SITE_URL;
let id;
async function main() {
  try {
    const email = `contact-test-${randomUUID()}@example.invalid`;
    const password = randomUUID()+'Aa9!';
    const created = await admin.auth.admin.createUser({email,password,email_confirm:true});
    assert.equal(created.error,null);id=created.data.user.id;
    const login = await member.auth.signInWithPassword({email,password});assert.equal(login.error,null);
    let token = login.data.session.access_token;
    const call=(body,origin=base,cookie=token)=>fetch(base+'/api/verification/contact',{method:'POST',headers:{origin,cookie:'sb-access-token='+cookie,'Content-Type':'application/json'},body:JSON.stringify(body)});
    assert.equal((await call({field:'email'},base,'')).status,401);
    assert.equal((await call({field:'email'},'https://foreign.invalid')).status,403);
    assert.equal((await call({field:'email',email_verified:true})).status,400);
    assert.equal((await call({field:'mobile'})).status,409);
    const denied = await member.from('users').update({mobile_verified:true}).eq('auth_user_id',id);assert.ok(denied.error);
    const link = await admin.auth.admin.generateLink({type:'magiclink',email});assert.equal(link.error,null);
    const otp=link.data.properties.email_otp;
    const bad=await member.auth.verifyOtp({email,token:otp==='123456'?'654321':'123456',type:'email'});assert.ok(bad.error);
    const verified=await member.auth.verifyOtp({email,token:otp,type:'email'});assert.equal(verified.error,null);assert.equal(verified.data.user.id,id);
    token=verified.data.session.access_token;
    assert.equal((await call({field:'email'})).status,200);
    const row=await admin.from('users').select('email,email_verified,mobile_verified').eq('auth_user_id',id).single();assert.equal(row.error,null);assert.equal(row.data.email,email);assert.equal(row.data.email_verified,true);assert.equal(row.data.mobile_verified,false);
    const replay=await member.auth.verifyOtp({email,token:otp,type:'email'});assert.ok(replay.error);
    const settings=await fetch(env.NEXT_PUBLIC_SUPABASE_URL+'/auth/v1/settings',{headers:{apikey:env.NEXT_PUBLIC_SUPABASE_ANON_KEY}});const config=await settings.json();
    console.log('PASS: provider-issued email OTP; invalid/demo code and replay denied; confirmed email synchronized; unverified mobile, direct flag editing, anonymous and cross-origin requests denied.');
    console.log('Phone authentication enabled:',Boolean(config.external?.phone));
  } finally { if(id){const removed=await admin.auth.admin.deleteUser(id);assert.equal(removed.error,null);} console.log('Temporary verification account removed.'); }
}
main().catch(e=>{console.error(e.message);process.exitCode=1;});
