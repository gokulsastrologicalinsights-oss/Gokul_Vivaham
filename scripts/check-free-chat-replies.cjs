const assert=require('node:assert/strict');
const {randomUUID}=require('node:crypto');
require('@next/env').loadEnvConfig(process.cwd());
const {createClient}=require('@supabase/supabase-js');
const options={auth:{persistSession:false,autoRefreshToken:false}};
const db=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.SUPABASE_SERVICE_ROLE_KEY,options);
const ids=[]; let chatId;
function ok(r){if(r.error)throw Error(r.error.message);return r.data;}
async function main(){try{
 const members=[];
 for(let i=0;i<2;i++){
  const email='chat-reply-qa-'+randomUUID()+'@example.invalid',password=randomUUID()+'Aa9!';
  const user=ok(await db.auth.admin.createUser({email,password,email_confirm:true,user_metadata:{full_name:'Chat Reply QA'}})).user;
  ids.push(user.id);
  ok(await db.from('profiles').update({moderation_status:'approved',visibility:'public'}).eq('user_id',user.id));
  const client=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,options);
  const login=ok(await client.auth.signInWithPassword({email,password}));
  members.push({client,token:login.session.access_token,id:user.id});
 }
 const [paid,free]=members;
 const plan=ok(await db.from('subscription_plans').select('id').ilike('name','%silver%').single());
 const subscription=ok(await db.from('subscriptions').insert({user_id:paid.id,plan_id:plan.id,payment_status:'Completed',start_date:new Date(Date.now()-60000).toISOString(),end_date:new Date(Date.now()+86400000).toISOString()}).select('id').single());
 const interest=ok(await db.from('match_requests').insert({sender_user_id:paid.id,receiver_user_id:free.id,status:'pending'}).select('id').single());
 ok(await db.from('match_requests').update({status:'accepted'}).eq('id',interest.id));
 const chats=ok(await db.from('chats').select('id').or(`and(user_one.eq.${paid.id},user_two.eq.${free.id}),and(user_one.eq.${free.id},user_two.eq.${paid.id})`));
 chatId=chats[0].id;
 assert.equal(ok(await free.client.from('chats').select('id').eq('id',chatId)).length,0);
 assert.ok((await free.client.from('chat_messages').insert({chat_id:chatId,sender_id:free.id,message:'Forbidden first message'})).error);
 ok(await paid.client.from('chat_messages').insert({chat_id:chatId,sender_id:paid.id,message:'Premium invitation'}));
 assert.equal(ok(await free.client.from('chats').select('id').eq('id',chatId)).length,1);
 ok(await free.client.from('chat_messages').insert({chat_id:chatId,sender_id:free.id,message:'Free member reply'}));
 assert.equal(ok(await paid.client.from('chat_messages').select('id').eq('chat_id',chatId)).length,2);
 const base=process.env.CHAT_TEST_BASE || 'https://gokulvivaham.vercel.app';
 const headers={cookie:'sb-access-token='+free.token};
 const usage=await fetch(base+'/api/entitlements/usage',{headers});assert.equal(usage.status,200);
 const entitlements=await usage.json();assert.equal(entitlements.plan_key,'FREE');assert.equal(entitlements.contacts_limit,0);
 const profile=ok(await db.from('profiles').select('profile_id').eq('user_id',paid.id).single());
 const contact=await fetch(base+'/api/profile/contact-details',{method:'POST',headers:{...headers,'Content-Type':'application/json'},body:JSON.stringify({profileId:profile.profile_id})});
 assert.equal(contact.status,403,'Free contact access must be denied');
 const contactBody=await contact.json();assert.ok(!contactBody.mobile_number && !contactBody.phone);
 ok(await db.from('blocked_users').insert({blocker_user_id:free.id,blocked_user_id:paid.id}));
 assert.equal(ok(await free.client.from('chats').select('id').eq('id',chatId)).length,0);
 ok(await db.from('blocked_users').delete().eq('blocker_user_id',free.id).eq('blocked_user_id',paid.id));
 ok(await db.from('subscriptions').update({end_date:new Date(Date.now()-1000).toISOString()}).eq('id',subscription.id));
 assert.equal(ok(await free.client.from('chats').select('id').eq('id',chatId)).length,0);
 assert.ok((await free.client.from('chat_messages').insert({chat_id:chatId,sender_id:free.id,message:'Denied after expiry'})).error);
 console.log('PASS: Free initiation denied; premium invitation enables replies; free entitlements remain zero; contact access denied; blocks and expiry revoke chat.');
 }finally{
  if(chatId){ok(await db.from('chat_messages').delete().eq('chat_id',chatId));ok(await db.from('chats').delete().eq('id',chatId));}
  for(const id of ids){ok(await db.from('match_requests').delete().or(`sender_user_id.eq.${id},receiver_user_id.eq.${id}`));ok(await db.auth.admin.deleteUser(id));}
  console.log('Temporary chat-test members and messages removed.');
 }}
main().catch(e=>{console.error(e.message);process.exitCode=1;});
