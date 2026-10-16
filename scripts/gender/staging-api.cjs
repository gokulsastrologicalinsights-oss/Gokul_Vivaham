/* eslint-disable @typescript-eslint/no-require-imports -- Existing Node CommonJS test runner. */
// Read-only end-to-end checks against an explicitly configured NON-PRODUCTION
// Supabase project and the app deployed against it. No users are created/deleted.
const {test,before}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {createClient}=require('@supabase/supabase-js');
const ready=Boolean(process.env.GENDER_TEST_SUPABASE_URL&&process.env.GENDER_TEST_PUBLISHABLE_KEY&&process.env.GENDER_TEST_APP_URL&&process.env.GENDER_TEST_FIXTURES);
let fixtures,clients;
before(async()=>{
  if(!ready)return;
  const url=new URL(process.env.GENDER_TEST_SUPABASE_URL);
  assert.notEqual(url.hostname,'rzhkwoeesgyekyutgyqr.supabase.co','Production tests are forbidden');
  fixtures=JSON.parse(fs.readFileSync(process.env.GENDER_TEST_FIXTURES,'utf8'));
  clients={};
  for(const role of ['male','female','secondMale','missing','invalid','admin']){
    const fixture=fixtures[role];assert.ok(fixture?.accessToken&&fixture.memberId&&fixture.profileId,`${role} fixture is required`);
    clients[role]=createClient(url.href,process.env.GENDER_TEST_PUBLISHABLE_KEY,{auth:{persistSession:false,autoRefreshToken:false},global:{headers:{Authorization:`Bearer ${fixture.accessToken}`}}});
    const {data,error}=await clients[role].auth.getUser(fixture.accessToken);assert.ifError(error);assert.ok(data.user);
    const account=await clients[role].from('users').select('id').eq('auth_user_id',data.user.id).single();assert.ifError(account.error);assert.equal(account.data.id,fixture.memberId);
    const profile=await clients[role].from('profiles').select('gender').eq('user_id',fixture.memberId).single();assert.ifError(profile.error);
    if(['male','secondMale'].includes(role))assert.equal(profile.data.gender,'Male');
    if(role==='female')assert.equal(profile.data.gender,'Female');
    if(role==='missing')assert.equal(profile.data.gender,null);
    if(role==='invalid')assert.ok(!['Male','Female',null].includes(profile.data.gender));
  }
  assert.equal(new Set(Object.values(fixtures).map(f=>f.memberId)).size,6,'Use six separate authenticated test accounts');
});
const options={skip:ready?false:'Requires staging URL, publishable key, app URL and separate authenticated fixtures'};
const list=async(role,filters={},page_size=500,page_offset=0)=>{
  const {data,error}=await clients[role].rpc('discover_profile_cards',{filters,page_size,page_offset});assert.ifError(error);return data;
};
async function app(role,path){return fetch(new URL(path,process.env.GENDER_TEST_APP_URL),{redirect:'manual',headers:role?{Cookie:`sb-access-token=${fixtures[role].accessToken}`}:{}});}
test('staging Supabase API enforces both gender directions and accurate pages',options,async()=>{
  for(const [role,gender] of [['male','Female'],['female','Male']]){
    const a=await list(role,{},1,0),b=await list(role,{},1,1);assert.ok(a.total>0);assert.equal(a.total,b.total);
    assert.ok(a.profiles.every(p=>p.gender===gender));if(b.profiles.length)assert.notEqual(a.profiles[0].id,b.profiles[0].id);
  }
});
test('staging invalid/missing gender and modified gender filters cannot discover profiles',options,async()=>{
  for(const role of ['missing','invalid'])assert.equal((await list(role)).total,0);
  assert.equal((await list('male',{gender:'Male'})).total,0);
});
test('staging direct table reads and manual profile URLs deny same gender',options,async()=>{
  const {data,error}=await clients.male.from('profiles').select('*').eq('user_id',fixtures.secondMale.memberId);assert.ifError(error);assert.deepEqual(data,[]);
  const response=await app('male',`/api/profiles/${fixtures.secondMale.profileId}`);assert.equal(response.status,404);
});
test('staging unauthenticated API and private Supabase photograph requests fail closed',options,async()=>{
  assert.equal((await app(null,'/api/matches')).status,401);
  if(!fixtures.female.privatePhotoPath)throw new Error('female.privatePhotoPath is required to test Storage');
  const {data,error}=await clients.male.storage.from('photos').download(fixtures.female.privatePhotoPath);assert.ok(error);assert.equal(data,null);
  if(!fixtures.secondMale.privatePhotoPath)throw new Error('secondMale.privatePhotoPath is required');
  assert.equal((await app('male','/api/photos?path='+encodeURIComponent(fixtures.secondMale.privatePhotoPath))).status,404);
});
test('staging verified MFA administrator retains intended database access',options,async()=>{
  const {data,error}=await clients.admin.from('profiles').select('user_id').in('user_id',[fixtures.male.memberId,fixtures.female.memberId]);assert.ifError(error);assert.equal(data.length,2);
});
