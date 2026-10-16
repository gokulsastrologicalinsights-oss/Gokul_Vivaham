/* eslint-disable @typescript-eslint/no-require-imports -- Existing Node CommonJS test runner. */
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { PGlite } = require('@electric-sql/pglite');
const root = path.resolve(__dirname, '../..');
const migration = fs.readFileSync(path.join(root,'supabase/migrations/20261015122404_secure_gender_profile_discovery.sql'),'utf8');
const id = n => `00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
let db;
before(async () => {
  db = new PGlite();
  await db.exec(fs.readFileSync(path.join(__dirname,'fixtures/audited-schema.sql'),'utf8'));
  for (let n=1;n<=13;n++) {
    const gender = ({1:'Male',2:'Female',3:'Male',4:'Female',5:'Other',8:'Female',9:'Female',10:'Male',11:'Female',12:'Female',13:'Female'})[n] || null;
    await db.query('insert into auth.users values ($1)',[id(100+n)]);
    await db.query('insert into auth.sessions values ($1,$2,null)',[id(300+n),id(100+n)]);
    await db.query(`insert into public.users(id,auth_user_id,role,status,deleted_at,email_verified,mobile_verified)
      values ($1,$2,'user',$3,null,false,false)`,[id(n),id(100+n),n===12?'suspended':'active']);
    await db.query(`insert into public.profiles(id,user_id,profile_id,first_name,gender,age,city,religion,education,
      visibility,is_suspended,is_banned,deleted_at,is_verified,is_premium,moderation_status,profile_photo_visibility,album_photo_visibility,created_at)
      values ($1,$2,$3,'Fixture',$4,28,'Chennai','Hindu','Engineer',$5,$6,$7,$8,true,false,'approved','all_members','all_members',now())`,
      [id(200+n),id(n),`GV0741${String(n).padStart(4,'0')}`,gender,n===8?'private':'public',n===10,n===9,n===11?'2026-01-01':null]);
  }
  await db.query(`insert into public.admin_users(id,auth_user_id,role,is_super_admin) values ($1,$2,'super_admin',true)`,[id(700),id(107)]);
  await db.query('insert into public.blocked_users(id,blocker_user_id,blocked_user_id) values ($1,$2,$3)',[id(701),id(1),id(13)]);
  await db.query(`insert into public.subscription_plans(id,price,is_lifetime,advanced_filters_enabled,messaging_enabled,photo_viewing_enabled)
    values ($1,1499,false,true,true,true),($2,0,true,false,false,false)`,[id(800),id(801)]);
  await db.query(`insert into public.subscriptions(id,user_id,plan_id,payment_status,start_date,end_date,created_at)
    values ($1,$2,$3,'Completed',now()-interval '1 day',now()+interval '30 days',now()),
      ($4,$5,$6,'Completed',now(),null,now())`,[id(810),id(1),id(800),id(811),id(2),id(801)]);
  await db.query(`insert into public.membership_profile_views(viewer_user_id,viewed_profile_id,view_date_ist)
    values ($1,$2,(now() at time zone 'Asia/Kolkata')::date)`,[id(1),id(202)]);
  await db.query(`insert into public.match_requests(id,sender_user_id,receiver_user_id,status) values($1,$2,$3,'accepted')`,[id(820),id(1),id(2)]);
  await db.query('insert into public.chats(id,user_one,user_two) values ($1,$2,$3)',[id(830),id(1),id(2)]);
  await db.query(`insert into public.chat_messages(id,chat_id,sender_id,message,created_at) values ($1,$2,$3,'Existing paid conversation',now())`,[id(840),id(830),id(1)]);
  await db.query(`insert into public.featured_profiles(id,user_id,is_active,end_date) values($1,$2,true,now()+interval '1 day')`,[id(850),id(2)]);
  await db.query('insert into public.favorites(id,user_id,favorite_user_id) values($1,$2,$3)',[id(860),id(1),id(4)]);
  await db.query(`insert into storage.objects(id,bucket_id,name,owner) values ($1,'photos',$2,$3)`,[id(870),`${id(102)}/${id(880)}/display.webp`,id(102)]);
  await db.query(`insert into storage.objects(id,bucket_id,name,owner) values ($1,'chat-images',$2,$3)`,[id(871),`${id(101)}/message.webp`,id(101)]);
  await db.query('update chat_messages set image_url=$1 where id=$2',[`${id(101)}/message.webp`,id(840)]);
  await db.exec(migration);
});
after(async()=>{if(db)await db.close();});

async function asMember(n, callback, {aal='aal1', claims={}}={}) {
  await db.exec('begin');
  try {
    await db.query("select set_config('request.jwt.claims',$1,true)",[JSON.stringify({sub:id(100+n),session_id:id(300+n),role:'authenticated',aal,...claims})]);
    await db.exec('set local role authenticated');
    return await callback();
  } finally { await db.exec('rollback'); }
}
const cards=async (filters={},size=500,offset=0)=>(await db.query('select public.discover_profile_cards($1::jsonb,$2,$3) as result',[JSON.stringify(filters),size,offset])).rows[0].result;
const allowed=async n=>(await db.query('select public.can_discover_profile($1) as allowed',[id(n)])).rows[0].allowed;

test('male discovers eligible females only; hidden, blocked, banned, inactive and deleted accounts are excluded',async()=>{
  await asMember(1,async()=>{const result=await cards();assert.equal(result.total,2);assert.deepEqual(result.profiles.map(p=>p.user_id).sort(),[id(2),id(4)]);assert.equal(result.eligibleGender,'Female');assert.equal(await allowed(3),false);assert.equal(await allowed(2),true);});
});
test('female discovers eligible males only',async()=>{
  await asMember(2,async()=>{const result=await cards();assert.equal(result.total,2);assert.ok(result.profiles.every(p=>p.gender==='Male'));assert.equal(await allowed(4),false);});
});
test('missing and invalid stored gender fail closed while self-read still works',async()=>{
  for(const n of [5,6])await asMember(n,async()=>{assert.equal((await cards()).total,0);assert.equal(await allowed(2),false);assert.equal((await db.query('select count(*)::int n from profiles')).rows[0].n,1);});
});
test('direct same-gender AND full-row opposite-gender SELECTs cannot disclose private columns after view credit',async()=>{
  await asMember(1,async()=>{for(const n of [2,3])assert.deepEqual((await db.query('select * from profiles where user_id=$1',[id(n)])).rows,[]);});
});
test('forged filters, client IDs and metadata never change eligibility',async()=>{
  await asMember(1,async()=>{
    assert.equal((await cards({gender:'Male'})).total,0);
    assert.equal((await cards({userIds:[id(2),id(3)]})).total,1);
    await assert.rejects(()=>cards({actor:id(2),isAdmin:true}));
  },{claims:{user_metadata:{gender:'Female',role:'super_admin',is_admin:true}}});
});
test('count and page boundaries follow eligibility and every search filter',async()=>{
  await asMember(1,async()=>{
    const a=await cards({ageMin:25,location:'Chennai'},1,0);const b=await cards({ageMin:25,location:'Chennai'},1,1);
    assert.equal(a.total,2);assert.equal(b.total,2);assert.notEqual(a.profiles[0].id,b.profiles[0].id);
    assert.equal((await cards({ageMax:20})).total,0);
    assert.deepEqual((await cards({featured:true})).profiles.map(p=>p.user_id),[id(2)]);
    assert.deepEqual((await cards({shortlisted:true})).profiles.map(p=>p.user_id),[id(4)]);
  });
});
test('free members cannot bypass advanced-filter membership via direct RPC',async()=>{
  await asMember(2,async()=>{await assert.rejects(()=>cards({location:'Chennai'}));});
});
test('cards never contain birth date, contacts, document references or moderation notes',async()=>{
  await asMember(1,async()=>{for(const p of (await cards()).profiles)for(const key of ['date_of_birth','email','mobile_number','id_verification_document_url','warning_notes'])assert.equal(key in p,false);});
});
test('verified admin retains all profiles; MFA-less admin gets no exception',async()=>{
  await asMember(7,async()=>{const raw=(await db.query('select * from profiles')).rows;assert.equal(raw.length,13);assert.equal(await allowed(8),true);},{aal:'aal2'});
  await asMember(7,async()=>{assert.equal((await cards()).total,0);assert.equal(await allowed(8),false);});
});
test('members cannot change established gender, ownership, role or impersonate another identity',async()=>{
  for(const sql of ["update profiles set gender='Female'",`update profiles set user_id='${id(2)}'`,`update profiles set id='${id(999)}'`,"update users set role='admin'",`update users set auth_user_id='${id(102)}'`,`insert into admin_users(auth_user_id,role) values ('${id(101)}','super_admin')`]){
    await asMember(1,async()=>{await assert.rejects(()=>db.exec(sql));});
  }
  await asMember(6,async()=>{await db.exec("update profiles set gender='Male'");assert.equal((await cards()).total,3);});
});
test('new same-gender interests and favorites are denied by RLS',async()=>{
  for(const table of ['favorites','match_requests'])await asMember(1,async()=>{
    const columns=table==='favorites'?'user_id,favorite_user_id':'sender_user_id,receiver_user_id';
    await assert.rejects(()=>db.query(`insert into public.${table}(${columns}) values($1,$2)`,[id(1),id(3)]));
  });
});
test('existing accepted interests, paid messaging and free replies still use participant authorization',async()=>{
  for(const n of [1,2])await asMember(n,async()=>{
    assert.equal((await db.query('select * from match_requests')).rows.length,1);
    assert.equal((await db.query('select * from chats')).rows.length,1);
    assert.equal((await db.query('select * from chat_messages')).rows.length,1);
    await db.query('insert into chat_messages(id,chat_id,sender_id,message) values ($1,$2,$3,$4)',[id(900+n),id(830),id(n),'Authorized reply']);
  });
  await asMember(3,async()=>{assert.equal((await db.query('select * from chats')).rows.length,0);assert.equal((await db.query('select * from chat_messages')).rows.length,0);});
});
test('private Supabase photographs remain owner/admin-only even with guessed storage paths',async()=>{
  await asMember(1,async()=>{assert.equal((await db.query("select * from storage.objects where bucket_id='photos'")).rows.length,0);});
  await asMember(2,async()=>{assert.equal((await db.query("select * from storage.objects where bucket_id='photos'")).rows.length,1);});
  await asMember(7,async()=>{assert.equal((await db.query("select * from storage.objects where bucket_id='photos'")).rows.length,1);},{aal:'aal2'});
});
test('unauthenticated and revoked sessions cannot access discovery or private photographs',async()=>{
  for(const query of ['select * from profiles','select public.discover_profile_cards()',"select * from storage.objects where bucket_id='photos'"]){
    await db.exec('begin; set local role anon');
    try {const result=await db.query(query);assert.equal(result.rows.length,0);}catch(error){assert.ok(['42501'].includes(error.code));}finally{await db.exec('rollback');}
  }
  await asMember(1,async()=>{assert.equal(await allowed(2),false);await assert.rejects(()=>cards());},{claims:{session_id:id(999)}});
});
test('chat images are limited to uploader, verified admin and authorized message participants',async()=>{
  for(const n of [1,2])await asMember(n,async()=>{assert.equal((await db.query("select * from storage.objects where bucket_id='chat-images'")).rows.length,1);});
  await asMember(3,async()=>{assert.equal((await db.query("select * from storage.objects where bucket_id='chat-images'")).rows.length,0);});
  await asMember(7,async()=>{assert.equal((await db.query("select * from storage.objects where bucket_id='chat-images'")).rows.length,1);},{aal:'aal2'});
});
test('new definer functions have safe search paths, postgres ownership and no anonymous EXECUTE',async()=>{
  const rows=(await db.query(`select p.proname,p.proconfig,pg_get_userbyid(p.proowner) owner,
    has_function_privilege('anon',p.oid,'execute') anonymous from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where (n.nspname='public' and p.proname in ('discover_profile_cards','can_discover_profile'))
      or (n.nspname='private' and p.proname in ('profile_discoverable','chat_image_readable'))`)).rows;
  assert.equal(rows.length,4);for(const row of rows){assert.equal(row.owner,'postgres');assert.equal(row.anonymous,false);assert.ok(row.proconfig.some(v=>v.startsWith('search_path=')));}
});
