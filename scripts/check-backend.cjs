const fs = require('node:fs');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const { createClient } = require('@supabase/supabase-js');
const env = Object.fromEntries(fs.readFileSync('.env.local','utf8').split(/\r?\n/).filter(line=>line && !line.startsWith('#')).map(line=>{const i=line.indexOf('='); return [line.slice(0,i),line.slice(i+1)];}));
const options = {auth:{persistSession:false,autoRefreshToken:false}};
const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL,env.SUPABASE_SERVICE_ROLE_KEY,options);
const publicClient = createClient(env.NEXT_PUBLIC_SUPABASE_URL,env.NEXT_PUBLIC_SUPABASE_ANON_KEY,options);
const ids = [];
function ok(result,label) {if(result.error) throw new Error(label+': '+result.error.message); return result.data;}
async function main() {
  try {
    const plans=ok(await publicClient.from('subscription_plans').select('name,price,duration_days'),'public plans');
    assert.equal(plans.length,4);
    assert.deepEqual(plans.map(p=>Number(p.price)).sort((a,b)=>a-b),[0,1499,2999,5999]);
    console.log('PASS: public API returns the four real plans');
    const anonymousUsers=await publicClient.from('users').select('id');
    assert.ok(anonymousUsers.error || anonymousUsers.data.length===0);
    console.log('PASS: anonymous clients cannot read member accounts');
    const accounts=[];
    for(let i=0;i<2;i++) {
      const email='backend-check-'+randomUUID()+'@example.invalid';
      const password=randomUUID()+'Aa9!';
      const created=ok(await admin.auth.admin.createUser({email,password,email_confirm:true,user_metadata:{full_name:'Backend Check',gender:'Male',dob:'1995-01-01'}}),'create isolated test account');
      ids.push(created.user.id);
      const client=createClient(env.NEXT_PUBLIC_SUPABASE_URL,env.NEXT_PUBLIC_SUPABASE_ANON_KEY,options);
      const session=ok(await client.auth.signInWithPassword({email,password}),'real password login');
      const own=ok(await client.from('users').select('*'),'own account read');
      assert.equal(own.length,1); assert.equal(own[0].auth_user_id,created.user.id);
      const profile=ok(await client.from('profiles').select('*').eq('user_id',created.user.id).single(),'signup profile trigger');
      assert.equal(profile.first_name,'Backend'); assert.equal(profile.date_of_birth,'1995-01-01');
      const edited=ok(await client.from('profiles').update({about_me:'Backend integration check'}).eq('user_id',created.user.id).select().single(),'profile save');
      assert.equal(edited.about_me,'Backend integration check');
      ok(await admin.from('profiles').update({id_verification_status:'approved'}).eq('user_id',created.user.id),'server verification setup');
      ok(await client.from('profiles').update({about_me:'Verified member edit'}).eq('user_id',created.user.id).select().single(),'verified member profile edit');
      assert.ok((await client.from('profiles').update({horoscope_verification_status:'approved'}).eq('user_id',created.user.id)).error);
      assert.ok((await client.from('users').update({role:'admin'}).eq('id',created.user.id)).error);
      assert.ok((await client.from('users').update({email_verified:true}).eq('id',created.user.id)).error);
      assert.ok((await client.from('profiles').update({is_premium:true}).eq('user_id',created.user.id)).error);
      accounts.push({client,id:created.user.id,token:session.session.access_token});
    }
    assert.equal(ok(await accounts[0].client.from('users').select('id').eq('id',accounts[1].id),'cross-user read').length,0);
    assert.equal(ok(await accounts[0].client.from('profiles').update({about_me:'Unauthorized edit'}).eq('user_id',accounts[1].id).select(),'cross-user update').length,0);
    console.log('PASS: signup trigger, password login, profile save, user isolation, protected roles/verification/premium fields');
    const base=env.NEXT_PUBLIC_SITE_URL;
    assert.equal((await fetch(base+'/api/profile/contact-unlocks')).status,401);
    assert.equal((await fetch(base+'/api/payments/subscription-cleanup',{method:'POST'})).status,401);
    const cookie='sb-access-token='+accounts[0].token;
    const contacts=await fetch(base+'/api/profile/contact-unlocks',{headers:{cookie}});
    assert.equal(contacts.status,200); assert.deepEqual((await contacts.json()).unlocks,[]);
    const usage=await fetch(base+'/api/entitlements/usage',{headers:{cookie}});
    assert.equal(usage.status,200); assert.equal((await usage.json()).plan_key,'FREE');
    assert.equal((await fetch(base+'/api/payments/subscription-cleanup',{method:'POST',headers:{cookie}})).status,403);
    console.log('PASS: local authenticated APIs read real data; cleanup denies anonymous and ordinary members');
  } finally {
    for(const id of ids) ok(await admin.auth.admin.deleteUser(id),'remove isolated test account');
    console.log('Removed isolated setup test accounts');
  }
}
main().catch(error=>{console.error(error.message);process.exitCode=1;});
