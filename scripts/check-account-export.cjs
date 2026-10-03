const fs=require('node:fs'),assert=require('node:assert/strict'),{randomUUID}=require('node:crypto'),{createClient}=require('@supabase/supabase-js');
const env=Object.fromEntries(fs.readFileSync('.env.local','utf8').split(/\r?\n/).filter(l=>l&&!l.startsWith('#')).map(l=>{const i=l.indexOf('=');return[l.slice(0,i),l.slice(i+1)];}));
const admin=createClient(env.NEXT_PUBLIC_SUPABASE_URL,env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}});const ids=[];const base=env.NEXT_PUBLIC_SITE_URL;
async function run(){try{
 const clients=[],tokens=[];
 for(let n=0;n<2;n++){
  const email=`export-${randomUUID()}@example.invalid`,password=randomUUID()+'Aa9!';
  const created=await admin.auth.admin.createUser({email,password,email_confirm:true});assert.equal(created.error,null);ids.push(created.data.user.id);
  const client=createClient(env.NEXT_PUBLIC_SUPABASE_URL,env.NEXT_PUBLIC_SUPABASE_ANON_KEY,{auth:{persistSession:false,autoRefreshToken:false}});clients.push(client);
  const login=await client.auth.signInWithPassword({email,password});assert.equal(login.error,null);tokens.push(login.data.session.access_token);
 }
 const rows=Array.from({length:601},(_,i)=>({user_id:ids[0],title:'Pagination test '+i,message:'Isolated fixture',type:'test'}));
 assert.equal((await admin.from('notifications').insert(rows)).error,null);
 assert.equal((await admin.from('notifications').insert({user_id:ids[1],title:'Private other marker',message:'Must not leak',type:'test'})).error,null);
 const call=(token,path='')=>fetch(base+'/api/account/export'+path,{headers:token?{cookie:'sb-access-token='+token}:{}});
 assert.equal((await call()).status,401);
 assert.equal((await call(tokens[0],'?userId='+ids[1])).status,400);
 const response=await call(tokens[0]);const data=await response.json();assert.equal(response.status,200,JSON.stringify(data));
 assert.equal(data.user_account.id,ids[0]);assert.equal(data.notifications.length,601);assert.ok(data.notifications.every(row=>row.user_id===ids[0]));
 assert.ok(!JSON.stringify(data).includes('Private other marker'));
 assert.ok(Array.isArray(data.transactions)&&Array.isArray(data.chat_messages)&&Array.isArray(data.deletion_requests));
 assert.ok(response.headers.get('cache-control').includes('no-store'));
 console.log('PASS: anonymous denial, target override denial, own account binding, 601-row pagination, cross-user isolation, expanded sections and no-store.');
}finally{for(const id of ids)await admin.auth.admin.deleteUser(id);console.log('Temporary export accounts and records removed.');}}
run().catch(error=>{console.error(error.message);process.exitCode=1;});
