/* Deterministic route regressions: no external requests, accounts or payments. */
/* eslint-disable @typescript-eslint/no-require-imports -- CommonJS runner loads transpiled route modules. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
let checks = 0;
function check(value, message) { assert.ok(value, message); checks++; }
function load(relative, mocks = {}, cache = new Map()) {
  const file = path.resolve(__dirname, '..', relative);
  if (cache.has(file)) return cache.get(file).exports;
  const testModule = { exports: {} }; cache.set(file, testModule);
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText;
  const localRequire = id => {
    if (Object.hasOwn(mocks, id)) return mocks[id];
    if (id.startsWith('@/')) return load('src/' + id.slice(2) + '.ts', mocks, cache);
    return require(id);
  };
  vm.runInThisContext('(function(require,module,exports){' + code + '\n})', { filename: file })(localRequire, testModule, testModule.exports);
  return testModule.exports;
}
function database(results) {
  const calls = [];
  return {
    calls,
    from(table) {
      calls.push({ table, op: 'from' });
      const result = results[table]?.shift();
      if (!result) throw new Error('Unexpected query: ' + table);
      const chain = { then: (yes, no) => Promise.resolve(result).then(yes, no) };
      for (const method of ['select','eq','gte','gt','order','limit','or','insert','maybeSingle','single','is']) {
        chain[method] = (...args) => { calls.push({ table, op: method, args }); return chain; };
      }
      return chain;
    },
  };
}
const ok = data => ({ data, error: null });
const user = { id: '11111111-1111-4111-8111-111111111111' };
const target = { id: '22222222-2222-4222-8222-222222222222', user_id: '33333333-3333-4333-8333-333333333333', profile_id: 'GVTEST' };
const valid = { name: 'Test Visitor', email: 'visitor@example.invalid', mobile: '+91 90000 00000', subject: 'General Inquiry', message: 'Synthetic regression inquiry only.', website: '' };
const request = (body, origin = 'http://localhost:3001') => new Request('http://localhost:3001/api/support', { method: 'POST', headers: { origin, 'Content-Type': 'application/json' }, body: typeof body === 'string' ? body : JSON.stringify(body) });
function support(db, signedIn = true, enabled = true) {
  return load('src/app/api/support/route.ts', {
    '@/lib/auth': { authLib: { getServerUser: async () => signedIn ? user : null } },
    '@/lib/supabase/server': { supabaseAdmin: db },
    '@/lib/operational-settings': { getOperationalSettings: async () => ({ support_requests_enabled: enabled }) },
  });
}
(async () => {
  const { isSameOrigin } = load('src/lib/request-origin.ts');
  check(isSameOrigin(new Request('http://localhost:3001/api/support', { headers: { host: '127.0.0.1:3001', origin: 'http://127.0.0.1:3001' } })), 'actual request host accepted');
  check(!isSameOrigin(new Request('http://localhost:3001/api/support', { headers: { host: '127.0.0.1:3001', origin: 'https://foreign.invalid' } })), 'foreign origin rejected with actual host');
  check(!isSameOrigin(new Request('http://localhost:3001/api/support')), 'missing origin rejected');
  const { supportSchema } = load('src/validations/support.schema.ts');
  check(supportSchema.safeParse(valid).success, 'valid international phone accepted');
  check(supportSchema.safeParse({ ...valid, mobile: '' }).success, 'optional phone');
  check(!supportSchema.safeParse({ ...valid, mobile: 'nonsense' }).success, 'invalid phone rejected');
  check(!supportSchema.safeParse({ ...valid, website: 'spam' }).success, 'honeypot rejected');
  check(!supportSchema.safeParse({ ...valid, name: '   ' }).success, 'blank name rejected');
  check(!supportSchema.safeParse({ ...valid, message: 'short' }).success, 'short message rejected');
  check(!supportSchema.safeParse({ ...valid, email: 'invalid' }).success, 'invalid email rejected');
  check(!supportSchema.safeParse({ ...valid, subject: 'unknown' }).success, 'unknown subject rejected');
  check((await support(database({})).POST(request(valid, 'https://foreign.invalid'))).status === 403, 'foreign origin denied');
  check((await support(database({}), false).POST(request(valid))).status === 401, 'guest inquiry denied honestly');
  check((await support(database({})).POST(request('{'))).status === 400, 'malformed JSON rejected');
  check((await support(database({})).POST(request({ ...valid, website: 'spam' }))).status === 400, 'server honeypot rejected');
  check((await support(database({})).POST(request('x'.repeat(40000)))).status === 413, 'oversize rejected');
  check((await support(database({}), true, false).POST(request(valid))).status === 503, 'paused workflow denied');
  check((await support(database({ support_requests: [{ count: 5, error: null }] })).POST(request(valid))).status === 429, 'persistent throttle');
  check((await support(database({ support_requests: [{ count: null, error: new Error('offline') }] })).POST(request(valid))).status === 503, 'throttle lookup fails closed');
  check((await support(database({ support_requests: [{ count: 0, error: null }, { data: null, error: new Error('offline') }] })).POST(request(valid))).status === 503, 'save failure never succeeds');
  const saved = await support(database({ support_requests: [{ count: 0, error: null }, ok({ id: 'ticket-reference' })] })).POST(request(valid));
  check(saved.status === 201 && (await saved.json()).id === 'ticket-reference', 'persisted reference returned');
  check(saved.headers.get('Cache-Control') === 'no-store', 'support responses not cached');


  function contactRoute({contact=null,lookupError=false,discoverable=true,purchased=false,rpcError=false,signedIn=true}={}) {
    const db=database({
      profiles:[ok([{id:target.id,user_id:target.user_id}])],
      users:[ok({id:target.user_id}),{data:contact,error:lookupError?new Error('lookup failed'):null}],
      contact_unlocks:[ok(purchased?{id:'unlock'}:null)],
    });
    db.rpc=async()=>{db.calls.push({op:'rpc'});return rpcError?{data:null,error:new Error('limit reached')} : ok({already_revealed:false,used:1,limit:15,remaining:14});};
    const route=load('src/app/api/profile/contact-details/route.ts',{
      '@/lib/supabase/server':{supabaseAdmin:db},
      '@/lib/membership/server':{requireMember:async()=>signedIn?{authUserId:user.id,memberId:user.id,isAdmin:false}:null,membershipError:()=>({message:'Contact unavailable',status:409})},
      '@/lib/profile-eligibility':{canDiscoverProfile:async()=>discoverable},
    });
    return {db,route};
  }
  const contact={email:'member@example.invalid',mobile_number:'+910000000000'};
  let c=contactRoute({contact});
  let response=await c.route.POST(request({profileId:'GVTEST'}));
  check(response.status===200&&(await response.json()).remaining===14,'current transactional membership reveal succeeds');
  check(c.db.calls.findIndex(x=>x.table==='users'&&x.op==='maybeSingle')<c.db.calls.findIndex(x=>x.op==='rpc'),'contact lookup precedes transaction');
  c=contactRoute({lookupError:true});
  response=await c.route.POST(request({profileId:'GVTEST'}));
  check(response.status===409&&!c.db.calls.some(x=>x.op==='rpc'),'lookup failure consumes no credit');
  c=contactRoute({contact:{email:' ',mobile_number:''}});
  check((await c.route.POST(request({profileId:'GVTEST'}))).status===409&&!c.db.calls.some(x=>x.op==='rpc'),'empty contact consumes no credit');
  c=contactRoute({contact,rpcError:true});
  response=await c.route.POST(request({profileId:'GVTEST'}));
  check(response.status===409&&!(await response.json()).email,'quota failure does not return contacts');
  c=contactRoute({contact,purchased:true});
  check((await c.route.POST(request({profileId:'GVTEST'}))).status===200&&!c.db.calls.some(x=>x.op==='rpc'),'purchased unlock consumes no membership credit');
  c=contactRoute({contact,discoverable:false});
  check((await c.route.POST(request({profileId:'GVTEST'}))).status===404&&!c.db.calls.some(x=>x.op==='rpc'),'current trusted discovery gate remains enforced');
  c=contactRoute({signedIn:false});
  check((await c.route.POST(request({profileId:'GVTEST'}))).status===401,'anonymous contact request denied');
  c=contactRoute({contact});
  check((await c.route.POST(request({profileId:'GVTEST'},'https://foreign.invalid'))).status===403,'foreign contact origin denied');
  const {SUBSCRIPTION_PLANS}=load('src/constants/payments.ts');
  check(SUBSCRIPTION_PLANS.GOLD.durationLabel==='3 calendar months'&&SUBSCRIPTION_PLANS.DIAMOND.durationLabel==='6 calendar months','current calendar plan labels preserved');
  console.log('PASS: '+checks+' release information-page/support/contact assertions.');
})().catch(error=>{console.error(error);process.exitCode=1;});
