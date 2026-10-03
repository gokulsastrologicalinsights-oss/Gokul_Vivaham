const fs=require('node:fs');const assert=require('node:assert/strict');const {randomUUID}=require('node:crypto');const {createClient}=require('@supabase/supabase-js');
const env=Object.fromEntries(fs.readFileSync('.env.local','utf8').split(/\r?\n/).filter(l=>l&&!l.startsWith('#')).map(l=>{const i=l.indexOf('=');return[l.slice(0,i),l.slice(i+1)];}));
const opts={auth:{persistSession:false,autoRefreshToken:false}};
const admin=createClient(env.NEXT_PUBLIC_SUPABASE_URL,env.SUPABASE_SERVICE_ROLE_KEY,opts);
const make=()=>createClient(env.NEXT_PUBLIC_SUPABASE_URL,env.NEXT_PUBLIC_SUPABASE_ANON_KEY,opts);
const base=env.NEXT_PUBLIC_SITE_URL,ids=[],paths=[];
const pdf=Buffer.from('%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj\n%%EOF');
async function main(){try{
 const password=fs.readFileSync('.admin-credentials.local.txt','utf8').match(/^Password: (.+)$/m)[1];
 const ownerLogin=await fetch(base+'/api/admin/login',{method:'POST',headers:{origin:base,'Content-Type':'application/json'},body:JSON.stringify({username:env.ADMIN_LOGIN_ID,password})});assert.equal(ownerLogin.status,200);const owner=await ownerLogin.json();
 const ownerClient=make();assert.equal((await ownerClient.auth.setSession(owner)).error,null);
 const clients=[],tokens=[];
 for(let i=0;i<2;i++){const email='document-test-'+randomUUID()+'@example.invalid',pass=randomUUID()+'Aa9!';const created=await admin.auth.admin.createUser({email,password:pass,email_confirm:true});assert.equal(created.error,null);ids.push(created.data.user.id);const client=make();const login=await client.auth.signInWithPassword({email,password:pass});assert.equal(login.error,null);clients.push(client);tokens.push(login.data.session.access_token);}
 const call=(url,method,body,token=tokens[0])=>fetch(base+url,{method,headers:{origin:base,cookie:'sb-access-token='+token,'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});
 const path=ids[0]+'/'+randomUUID()+'.pdf';paths.push(path);
 assert.equal((await clients[0].storage.from('id-proofs').upload(path,pdf,{contentType:'application/pdf'})).error,null);
 assert.ok((await clients[1].storage.from('id-proofs').download(path)).error);
 assert.ok((await clients[1].storage.from('id-proofs').createSignedUrl(path,60)).error);
 assert.ok((await clients[1].storage.from('id-proofs').upload(ids[0]+'/'+randomUUID()+'.pdf',pdf,{contentType:'application/pdf'})).error);
 assert.ok((await clients[0].storage.from('id-proofs').upload(ids[0]+'/'+randomUUID()+'.html',Buffer.from('bad'),{contentType:'text/html'})).error);
 assert.ok((await clients[0].storage.from('id-proofs').upload(ids[0]+'/'+randomUUID()+'.pdf',Buffer.alloc(5242881),{contentType:'application/pdf'})).error);
 const publicUrl=admin.storage.from('id-proofs').getPublicUrl(path).data.publicUrl;assert.notEqual((await fetch(publicUrl)).status,200);
 const ownSigned=await clients[0].storage.from('id-proofs').createSignedUrl(path,60);assert.equal(ownSigned.error,null);assert.equal((await fetch(ownSigned.data.signedUrl)).status,200);
 const adminSigned=await ownerClient.storage.from('id-proofs').createSignedUrl(path,60);assert.equal(adminSigned.error,null);
 const body={type:'id_proof',documentUrl:path,documentType:'Test ID'};
 assert.equal((await call('/api/verification/documents','POST',body,tokens[1])).status,409);
 const submit=await call('/api/verification/documents','POST',body);assert.equal(submit.status,200);let requestId=(await submit.json()).id;
 assert.ok((await clients[0].from('verification_requests').insert({user_id:ids[0],document_url:path,status:'approved'})).error);
 await clients[0].storage.from('id-proofs').remove([path]);assert.equal((await clients[0].storage.from('id-proofs').download(path)).error,null);
 assert.equal((await call('/api/admin/documents','GET',null)).status,403);
 const queue=await call('/api/admin/documents','GET',null,owner.access_token);assert.equal(queue.status,200);assert.ok((await queue.json()).requests.some(r=>r.id===requestId));
 assert.equal((await call('/api/admin/documents','PATCH',{requestId,status:'approved'})).status,403);
 assert.equal((await call('/api/admin/documents','PATCH',{requestId,status:'rejected'},owner.access_token)).status,400);
 assert.equal((await call('/api/admin/documents','PATCH',{requestId,status:'resubmit_requested',reason:'Upload a clearer copy.'},owner.access_token)).status,200);
 let profile=(await admin.from('profiles').select('id_verification_status,is_verified,id_verification_rejection_reason').eq('user_id',ids[0]).single()).data;assert.equal(profile.id_verification_status,'resubmit_requested');assert.equal(profile.is_verified,false);
 const resubmit=await call('/api/verification/documents','POST',body);assert.equal(resubmit.status,200);requestId=(await resubmit.json()).id;
 assert.equal((await call('/api/admin/documents','PATCH',{requestId,status:'approved'},owner.access_token)).status,200);
 profile=(await admin.from('profiles').select('id_verification_status,is_verified').eq('user_id',ids[0]).single()).data;assert.equal(profile.is_verified,true);assert.equal(profile.id_verification_status,'approved');
 assert.equal((await call('/api/admin/documents','PATCH',{requestId,status:'approved'},owner.access_token)).status,409);
 assert.equal((await call('/api/verification/documents','POST',body)).status,409);
 const hpath=ids[0]+'/'+randomUUID()+'.pdf';paths.push(hpath);assert.equal((await clients[0].storage.from('horoscopes').upload(hpath,pdf,{contentType:'application/pdf'})).error,null);
 const hs=await call('/api/verification/documents','POST',{type:'horoscope',documentUrl:hpath,documentType:'Horoscope'});assert.equal(hs.status,200);const hid=(await hs.json()).id;
 assert.equal((await call('/api/admin/documents','PATCH',{requestId:hid,status:'approved'},owner.access_token)).status,200);
 const hprofile=(await admin.from('profiles').select('horoscope_verification_status').eq('user_id',ids[0]).single()).data;assert.equal(hprofile.horoscope_verification_status,'approved');
 await clients[0].auth.signOut();const oldClient=createClient(env.NEXT_PUBLIC_SUPABASE_URL,env.NEXT_PUBLIC_SUPABASE_ANON_KEY,{...opts,global:{headers:{Authorization:'Bearer '+tokens[0]}}});assert.ok((await oldClient.storage.from('id-proofs').createSignedUrl(path,60)).error);
 console.log('PASS: private owned ID/PDF uploads; size/type limits; cross-user/public denial; owner/admin signed access; authenticated submission; resubmit/approve; profile badges; replay protection; logged-out access denied.');
 await ownerClient.auth.signOut({scope:'local'});
}finally{
 for(const bucket of ['id-proofs','horoscopes']) if(paths.length) await admin.storage.from(bucket).remove(paths);
 for(const id of ids){await admin.from('verification_requests').delete().eq('user_id',id);await admin.from('activity_logs').delete().eq('metadata->>target_user_id',id);const removed=await admin.auth.admin.deleteUser(id);assert.equal(removed.error,null);}
 console.log('Temporary documents and members removed.');
}}
main().catch(e=>{console.error(e.message);process.exitCode=1;});
