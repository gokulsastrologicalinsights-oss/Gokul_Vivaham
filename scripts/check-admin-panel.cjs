const fs=require('node:fs');
const assert=require('node:assert/strict');
const {randomUUID}=require('node:crypto');
const {createClient}=require('@supabase/supabase-js');
const env=Object.fromEntries(fs.readFileSync('.env.local','utf8').split(/\r?\n/).filter(l=>l&&!l.startsWith('#')).map(l=>{const i=l.indexOf('=');return[l.slice(0,i),l.slice(i+1)];}));
const password=fs.readFileSync('.admin-credentials.local.txt','utf8').match(/^Password: (.+)$/m)[1];
const admin=createClient(env.NEXT_PUBLIC_SUPABASE_URL,env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
const base=env.NEXT_PUBLIC_SITE_URL;
let id;
async function main(){try{
  const login=await fetch(base+'/api/admin/login',{method:'POST',headers:{origin:base,'Content-Type':'application/json'},body:JSON.stringify({username:env.ADMIN_LOGIN_ID,password})});
  assert.equal(login.status,200);const owner=await login.json();
  const ownerClient=createClient(env.NEXT_PUBLIC_SUPABASE_URL,env.NEXT_PUBLIC_SUPABASE_ANON_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
  const session=await ownerClient.auth.setSession(owner);assert.equal(session.error,null);
  const ownerId=session.data.user.id;
  const hide=await admin.from('profiles').update({visibility:'private'}).eq('user_id',ownerId);assert.equal(hide.error,null);
  const request=(path,method='GET',body,token=owner.access_token)=>fetch(base+path,{method,headers:{origin:base,cookie:'sb-access-token='+token,'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});
  const sync=await fetch(base+'/api/auth/session',{method:'POST',headers:{origin:base,authorization:'Bearer '+owner.access_token}});assert.equal(sync.status,200);assert.equal((await sync.json()).isAdmin,true);
  const email='panel-test-'+randomUUID()+'@example.invalid',memberPassword=randomUUID()+'Aa9!';
  const created=await admin.auth.admin.createUser({email,password:memberPassword,email_confirm:true,user_metadata:{full_name:'Panel Test Member'}});assert.equal(created.error,null);id=created.data.user.id;
  const memberClient=createClient(env.NEXT_PUBLIC_SUPABASE_URL,env.NEXT_PUBLIC_SUPABASE_ANON_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
  const memberLogin=await memberClient.auth.signInWithPassword({email,password:memberPassword});assert.equal(memberLogin.error,null);
  const memberToken=memberLogin.data.session.access_token;
  assert.equal((await request('/api/admin/users','GET',null,memberToken)).status,403);
  assert.equal((await request('/api/admin/users/'+id,'PATCH',{profile:{first_name:'Unauthorized'}},memberToken)).status,403);
  assert.equal((await request('/api/admin/users/'+id,'DELETE',null,memberToken)).status,403);
  const list=await request('/api/admin/users?q='+encodeURIComponent(email));assert.equal(list.status,200);assert.equal((await list.json()).users[0].id,id);
  const detail=await request('/api/admin/users/'+id);assert.equal(detail.status,200);const d=await detail.json();assert.equal(d.account.email,email);assert.equal(d.profile.first_name,'Panel');assert.ok('preferences' in d && 'payments' in d && 'verification' in d);
  const emailChanged='edited-'+randomUUID()+'@example.invalid';
  const saved=await request('/api/admin/users/'+id,'PATCH',{account:{email:emailChanged,mobile_number:'9876543210'},profile:{first_name:'Edited Member',occupation:'Engineer',is_verified:true}});assert.equal(saved.status,200);
  const updated=await (await request('/api/admin/users/'+id)).json();assert.equal(updated.profile.first_name,'Edited Member');assert.equal(updated.account.email,emailChanged);assert.equal((await admin.auth.admin.getUserById(id)).data.user.email,emailChanged);
  assert.equal((await request('/api/admin/users/'+id,'PATCH',{account:{role:'super_admin'}})).status,400);
  assert.equal((await request('/api/admin/users/'+ownerId,'DELETE')).status,409);
  assert.equal((await request('/api/admin/users/'+id,'DELETE')).status,200);
  assert.equal((await request('/api/auth/session','GET',null,memberToken)).status,401);
  const deletedList=await (await request('/api/admin/users?q='+encodeURIComponent(emailChanged))).json();assert.equal(deletedList.users.length,0);
  assert.equal((await request('/api/admin/users/'+id,'POST',{action:'restore'})).status,200);
  assert.equal((await request('/api/auth/session','GET',null,memberToken)).status,200);
  const logs=await admin.from('activity_logs').select('action').eq('metadata->>target_user_id',id);assert.equal(logs.error,null);assert.deepEqual(logs.data.map(l=>l.action).sort(),['ADMIN_DELETE_MEMBER','ADMIN_EDIT_MEMBER','ADMIN_RESTORE_MEMBER'].sort());
  console.log('PASS: private owner password login; full records; member denial; profile/contact/login-email edits; protected admins; delete/login blocking; restore; audit history');
  await ownerClient.auth.signOut();
}finally{
  if(id){await admin.from('activity_logs').delete().eq('metadata->>target_user_id',id);const deleted=await admin.auth.admin.deleteUser(id);assert.equal(deleted.error,null);}
  console.log('Removed temporary panel-test account; owner account remains.');
}}
main().catch(e=>{console.error(e.message);process.exitCode=1;});
