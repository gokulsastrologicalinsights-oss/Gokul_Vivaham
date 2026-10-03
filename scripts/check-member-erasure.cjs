const fs=require('node:fs'),assert=require('node:assert/strict'),{randomUUID}=require('node:crypto'),{createClient}=require('@supabase/supabase-js');
const env=Object.fromEntries(fs.readFileSync('.env.local','utf8').split(/\r?\n/).filter(l=>l&&!l.startsWith('#')).map(l=>{const i=l.indexOf('=');return[l.slice(0,i),l.slice(i+1)];}));
const admin=createClient(env.NEXT_PUBLIC_SUPABASE_URL,env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
const base=env.NEXT_PUBLIC_SITE_URL;let id,jobId,ownerClient;
async function run(){try{
 const password=fs.readFileSync('.admin-credentials.local.txt','utf8').match(/^Password: (.+)$/m)[1];
 const login=await fetch(base+'/api/admin/login',{method:'POST',headers:{origin:base,'Content-Type':'application/json'},body:JSON.stringify({username:env.ADMIN_LOGIN_ID,password})});assert.equal(login.status,200);const owner=await login.json();
 ownerClient=createClient(env.NEXT_PUBLIC_SUPABASE_URL,env.NEXT_PUBLIC_SUPABASE_ANON_KEY,{auth:{persistSession:false,autoRefreshToken:false}});await ownerClient.auth.setSession(owner);
 const created=await admin.auth.admin.createUser({email:`erase-${randomUUID()}@example.invalid`,password:randomUUID()+'Aa9!',email_confirm:true});assert.equal(created.error,null);id=created.data.user.id;
 const path=id+'/'+randomUUID()+'.pdf';assert.equal((await admin.storage.from('horoscopes').upload(path,Buffer.from('%PDF-1.4\nTest'),{contentType:'application/pdf'})).error,null);
 const requested=await admin.from('deletion_requests').insert({user_id:id,status:'pending',is_permanent:true}).select('id').single();assert.equal(requested.error,null);
 const call=token=>fetch(base+'/api/admin/erasure',{method:'POST',headers:{origin:base,'Content-Type':'application/json',...(token?{cookie:'sb-access-token='+token}:{})},body:JSON.stringify({requestId:requested.data.id})});
 assert.equal((await call()).status,401);
 const erased=await call(owner.access_token);const result=await erased.json();assert.equal(erased.status,200,JSON.stringify(result));jobId=result.jobId;
 assert.equal((await admin.from('users').select('id').eq('id',id)).data.length,0);
 assert.equal((await admin.auth.admin.getUserById(id)).data.user,null);
 assert.ok((await admin.storage.from('horoscopes').download(path)).error);
 assert.equal((await call(owner.access_token)).status,200);
 assert.equal((await admin.from('erasure_jobs').select('state').eq('id',jobId).single()).data.state,'completed');
 console.log('PASS: anonymous denial, storage cleanup, database cleanup, Auth deletion, completed job and idempotent retry. Only isolated fixture erased.');
}finally{
 if(id){await admin.storage.from('horoscopes').list(id).then(async r=>{if(r.data?.length)await admin.storage.from('horoscopes').remove(r.data.map(f=>id+'/'+f.name));});await admin.auth.admin.deleteUser(id);await admin.from('erasure_jobs').delete().eq('auth_user_id',id);}
 if(ownerClient)await ownerClient.auth.signOut({scope:'local'});
}}
run().catch(error=>{console.error(error.message);process.exitCode=1;});
