const fs=require('node:fs');
const assert=require('node:assert/strict');
const {randomUUID,createHmac}=require('node:crypto');
const {createClient}=require('@supabase/supabase-js');
const env=Object.fromEntries(fs.readFileSync('.env.local','utf8').split(/\r?\n/).filter(l=>l&&!l.startsWith('#')).map(l=>{const i=l.indexOf('=');return [l.slice(0,i),l.slice(i+1)];}));
const options={auth:{persistSession:false,autoRefreshToken:false}};
const admin=createClient(env.NEXT_PUBLIC_SUPABASE_URL,env.SUPABASE_SERVICE_ROLE_KEY,options);
const ids=[];
function ok(r,label){if(r.error)throw new Error(label+': '+r.error.message);return r.data;}
const base=env.NEXT_PUBLIC_SITE_URL;
function request(route,token,init={}){return fetch(base+route,{redirect:'manual',...init,headers:{...(token?{cookie:'sb-access-token='+token}:{}),...init.headers}});}
function totp(secret){
  const alphabet='ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';let bits='';
  for(const c of secret.toUpperCase().replace(/=+$/,''))bits+=alphabet.indexOf(c).toString(2).padStart(5,'0');
  const bytes=[];for(let i=0;i+8<=bits.length;i+=8)bytes.push(parseInt(bits.slice(i,i+8),2));
  const counter=Buffer.alloc(8);counter.writeBigUInt64BE(BigInt(Math.floor(Date.now()/30000)));
  const hmac=createHmac('sha1',Buffer.from(bytes)).update(counter).digest();
  return ((hmac.readUInt32BE(hmac[19]&15)&0x7fffffff)%1000000).toString().padStart(6,'0');
}
async function main(){try{
  assert.equal((await request('/api/admin')).status,401);
  const email='auth-check-'+randomUUID()+'@example.invalid',password=randomUUID()+'Aa9!';
  const created=ok(await admin.auth.admin.createUser({email,password,email_confirm:true,user_metadata:{full_name:'Auth Security Check',role:'super_admin'}}),'test account');
  const id=created.user.id;ids.push(id);
  const member=createClient(env.NEXT_PUBLIC_SUPABASE_URL,env.NEXT_PUBLIC_SUPABASE_ANON_KEY,options);
  const login=ok(await member.auth.signInWithPassword({email,password}),'password login');
  let token=login.session.access_token;
  assert.equal((await request('/api/admin',token)).status,403);
  const roleResponse=await request('/api/auth/session',token);
  assert.equal(roleResponse.status,200);assert.equal((await roleResponse.json()).role,'user');
  const deniedPage=await request('/admin/dashboard',token);
  assert.equal(deniedPage.status,307);assert.ok(deniedPage.headers.get('location').endsWith('/dashboard'));
  assert.equal((await request('/api/auth/session',null,{method:'POST',headers:{authorization:'Bearer '+token,origin:'https://untrusted.example'}})).status,403);
  const synchronized=await request('/api/auth/session',null,{method:'POST',headers:{authorization:'Bearer '+token,origin:base}});
  assert.equal(synchronized.status,200);assert.match(synchronized.headers.get('set-cookie'),/HttpOnly/i);
  const pieces=token.split('.');pieces[1]=Buffer.from(JSON.stringify({sub:id,exp:Math.floor(Date.now()/1000)+3600,user_metadata:{role:'super_admin'}})).toString('base64url');
  assert.equal((await request('/api/admin',pieces.join('.'))).status,401);
  console.log('PASS: metadata role forgery, unsigned/tampered tokens, admin page/API denial, origin validation and HttpOnly cookie');
  ok(await admin.from('admin_users').insert({auth_user_id:id,email,role:'admin'}),'trusted temporary admin membership');
  assert.equal((await request('/api/admin',token)).status,403);
  assert.equal((await request('/api/payments/subscription-cleanup',token,{method:'POST'})).status,403);
  assert.ok((await member.from('profiles').update({is_verified:true}).eq('user_id',id)).error);
  const enrolled=ok(await member.auth.mfa.enroll({factorType:'totp',friendlyName:'Temporary security test'}),'authenticator enrolment');
  const verified=ok(await member.auth.mfa.challengeAndVerify({factorId:enrolled.id,code:totp(enrolled.totp.secret)}),'authenticator verification');
  token=verified.access_token;
  const allowed=await request('/api/admin',token);
  assert.equal(allowed.status,200);assert.equal((await allowed.json()).isAdmin,true);
  ok(await member.from('profiles').update({is_verified:true}).eq('user_id',id),'verified admin profile operation');
  console.log('PASS: administrator password alone is denied; real TOTP grants trusted admin API and database permissions');
  ok(await admin.from('profiles').update({is_suspended:true}).eq('user_id',id),'temporary suspension');
  assert.equal((await request('/api/admin',token)).status,401);
  assert.equal(ok(await member.from('users').select('id'),'suspended direct read').length,0);
  ok(await admin.from('profiles').update({is_suspended:false}).eq('user_id',id),'restore temporary suspension');
  ok(await admin.from('admin_users').delete().eq('auth_user_id',id),'revoke test admin membership');
  assert.equal((await request('/api/admin',token)).status,403);
  ok(await member.auth.signOut(),'logout');
  assert.equal((await request('/api/auth/session',token)).status,401);
  console.log('PASS: suspended accounts, revoked admins, and logged-out JWTs lose access immediately');
}finally{
  for(const id of ids){ok(await admin.from('admin_users').delete().eq('auth_user_id',id),'test membership cleanup');ok(await admin.auth.admin.deleteUser(id),'test account cleanup');}
  console.log('Removed temporary security-test account and authenticator');
}}
main().catch(e=>{console.error(e.message);process.exitCode=1;});
