/* eslint-disable @typescript-eslint/no-require-imports -- Existing Node CommonJS test runner. */
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),ts=require('typescript');
const root=path.resolve(__dirname,'../..');
const viewer='00000000-0000-4000-8000-000000000001';
const target='00000000-0000-4000-8000-000000000002';
function harness(file,{authorized=true,allowed=false,rows={},requestError=null}={}){
  const calls=[];
  function query(table){
    calls.push({table});let single=false;
    const builder=new Proxy({}, {get(_object,key){
      if(key==='then')return (resolve,reject)=>Promise.resolve({data:single?(rows[table]?.[0]||null):(rows[table]||[]),error:null}).then(resolve,reject);
      return (...args)=>{calls.push({table,method:key,args});if(['maybeSingle','single'].includes(key))single=true;return builder;};
    }});return builder;
  }
  const admin={from:query,rpc:async(name)=>{calls.push({privilegedRpc:name});throw new Error('A denied request consumed credit');}};
  const access=authorized?{user:{id:viewer},isAdmin:false,mfaRequired:false}:null;
  const requestClient={rpc:async(name,args)=>{calls.push({requestRpc:name,args});return {data:name==='can_discover_profile'?allowed:{profiles:[],total:0},error:requestError};}};
  const stubs={
    '@/lib/request-origin': (() => {
      const originExports = {};
      const originSource = ts.transpileModule(fs.readFileSync(path.join(root,'src/lib/request-origin.ts'),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText;
      vm.runInNewContext(originSource,{exports:originExports,URL});
      return originExports;
    })(),
    'server-only':{},
    'next/server':{NextResponse:{json:(body,options)=>Response.json(body,options)}},
    '@/lib/supabase/server':{supabaseAdmin:admin,createRequestClient:async()=>requestClient},
    '@/lib/auth':{authLib:{getServerAccess:async()=>access,getServerUser:async()=>access?.user}},
    '@/lib/membership/server':{requireMember:async()=>access?{memberId:viewer,authUserId:viewer,isAdmin:false}:null,membershipError:()=>({status:403,message:'Denied'}),getMemberEntitlements:async()=>{throw new Error('Denied request reached entitlements');}},
    '@/lib/profile-eligibility':{canDiscoverProfile:async()=>allowed},
    '@/lib/photo-access':{authorizePhotoPath:async()=>null},
    '@/lib/profile-card-photos':{withAuthorizedCardPhotos:async profiles=>profiles},
    '@/utils/generateCompatibility':{generateCompatibility:()=>{throw new Error('Denied request computed private compatibility');}},
  };
  const exports={};
  const source=ts.transpileModule(fs.readFileSync(path.join(root,file),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText;
  vm.runInNewContext(source,{exports,require:n=>n in stubs?stubs[n]:require(n),console,URL,Request,Response},{filename:file});
  return {exports,calls};
}
const request=body=>new Request('https://test.local/api',{method:'POST',headers:{'Content-Type':'application/json','Origin':'https://test.local'},body:JSON.stringify(body)});

test('direct profile URL returns 404 before credits or photos for an ineligible target',async()=>{
  const h=harness('src/app/api/profiles/[id]/route.ts',{rows:{profiles:[{id:target,user_id:target,first_name:'PRIVATE'}]}});
  const r=await h.exports.GET(new Request('https://test.local'),{params:Promise.resolve({id:'GV07410002'})});
  assert.equal(r.status,404);assert.ok(!JSON.stringify(await r.json()).includes('PRIVATE'));
  assert.equal(h.calls.some(c=>c.privilegedRpc||c.table==='gallery_images'),false);
});
test('contacts reject an ineligible target before purchase lookup, credits or private contact reads',async()=>{
  const h=harness('src/app/api/profile/contact-details/route.ts',{rows:{profiles:[{id:target,user_id:target}]}});
  const r=await h.exports.POST(request({profileUuid:target}));assert.equal(r.status,404);
  assert.equal(h.calls.some(c=>c.table==='users'||c.table==='contact_unlocks'||c.privilegedRpc),false);
});
test('new interests and both horoscope paths deny a target before private data or entitlements',async()=>{
  for(const [file,body] of [
    ['src/app/api/interests/route.ts',{receiverUserId:target}],
    ['src/app/api/horoscope/compatibility/route.ts',{targetUserId:target}],
    ['src/app/api/horoscope/reports/route.ts',{targetUserId:target,idempotencyKey:'fixture-request-key'}],
  ]){
    const h=harness(file,{rows:{users:[{id:viewer}]}});
    const r=await h.exports.POST(request(body));assert.equal(r.status,404,file);
    assert.equal(h.calls.some(c=>c.table==='profiles'||c.privilegedRpc),false,file);
  }
});
test('purchased contact history does not disclose a now-ineligible profile or its contact details',async()=>{
  const h=harness('src/app/api/profile/contact-unlocks/route.ts',{rows:{users:[{id:viewer}],contact_unlocks:[{profile:{user_id:target,first_name:'PRIVATE'}}]}});
  const r=await h.exports.GET(new Request('https://test.local'));assert.equal(r.status,200);assert.deepEqual((await r.json()).unlocks,[]);
  assert.equal(h.calls.filter(c=>c.table==='users'&&!c.method).length,1);
});
test('search rejects actor/admin payloads and forwards valid filters to request-scoped RPC',async()=>{
  const h=harness('src/app/api/matches/route.ts');
  assert.equal((await h.exports.GET(new Request('https://test.local?actor='+target+'&isAdmin=true'))).status,400);
  for (const gender of ['Male','Female','Other']) {
    assert.equal((await h.exports.GET(new Request('https://test.local?gender='+gender))).status,400);
  }
  assert.equal(h.calls.length,0,'Rejected filters must not reach discovery');
  const r=await h.exports.GET(new Request('https://test.local?ageMin=25&religion=Hindu&limit=1&offset=1'));
  assert.equal(r.status,200);const call=h.calls.find(c=>c.requestRpc);assert.equal(call.requestRpc,'discover_profile_cards');
  assert.equal('gender' in call.args.filters,false);assert.equal(call.args.filters.ageMin,25);assert.equal(call.args.filters.religion,'Hindu');
  assert.equal(call.args.page_offset,1);assert.equal(h.calls.some(c=>c.table==='profiles'),false);
});
test('eligibility helper uses only the request client and fails closed on an RPC error',async()=>{
  const h=harness('src/lib/profile-eligibility.ts',{allowed:true,requestError:{message:'schema unavailable'}});
  assert.equal(await h.exports.canDiscoverProfile(target),false);assert.equal(h.calls[0].requestRpc,'can_discover_profile');
});
test('unauthenticated profile, search, contact, interest and horoscope requests return 401',async()=>{
  for(const [file,method,args] of [
    ['src/app/api/profiles/[id]/route.ts','GET',[new Request('https://test.local'),{params:Promise.resolve({id:'GV07410002'})}]],
    ['src/app/api/matches/route.ts','GET',[new Request('https://test.local')]],
    ['src/app/api/profile/contact-details/route.ts','POST',[request({profileUuid:target})]],
    ['src/app/api/interests/route.ts','POST',[request({receiverUserId:target})]],
    ['src/app/api/horoscope/compatibility/route.ts','POST',[request({targetUserId:target})]],
    ['src/app/api/horoscope/reports/route.ts','POST',[request({targetUserId:target})]],
  ]){const h=harness(file,{authorized:false});assert.equal((await h.exports[method](...args)).status,401,file);assert.equal(h.calls.length,0);}
});
