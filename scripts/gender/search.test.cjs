/* eslint-disable @typescript-eslint/no-require-imports -- Existing Node CommonJS test runner. */
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),ts=require('typescript');
const root=path.resolve(__dirname,'../..');

function service(result, configured=true) {
  const calls=[],exports={};
  const source=ts.transpileModule(fs.readFileSync(path.join(root,'src/services/match.service.ts'),'utf8'),{
    compilerOptions:{module:ts.ModuleKind.CommonJS},
  }).outputText;
  vm.runInNewContext(source,{exports,require:()=>({supabase:{}}),URLSearchParams,console,
    process:{env:configured?{NEXT_PUBLIC_SUPABASE_URL:'https://test.supabase.co',NEXT_PUBLIC_SUPABASE_ANON_KEY:'test-key'}:{}},
    fetch:async url=>{calls.push(url);return {ok:true,json:async()=>result};},
  });
  return {matches:exports.matchService,calls};
}

test('search service preserves server eligibility, zero counts and pagination without forwarding gender',async()=>{
  for(const eligibleGender of ['Male','Female',null]) {
    const h=service({profiles:[],total:0,eligibleGender});
    const result=await h.matches.getMatches({gender:'Male',ageMin:25,ageMax:35,religion:'Hindu',
      caste:'Iyer',rasi:'Mesham',star:'Aswini',padam:'1',location:'Chennai',profession:'Engineer',limit:50,offset:50});
    assert.equal(result.eligibleGender,eligibleGender);assert.equal(result.total,0);
    const params=new URLSearchParams(h.calls[0].split('?')[1]);
    assert.equal(params.has('gender'),false);
    for(const [key,value] of Object.entries({ageMin:'25',ageMax:'35',religion:'Hindu',caste:'Iyer',
      rasi:'Mesham',star:'Aswini',padam:'1',location:'Chennai',profession:'Engineer',limit:'50',offset:'50'})) {
      assert.equal(params.get(key),value);
    }
  }
});

test('unconfigured search fails closed instead of showing unrestricted demo matches',async()=>{
  const h=service(null,false);const result=await h.matches.getMatches();
  assert.equal(result.data.length,0);assert.equal(result.total,0);assert.equal(result.eligibleGender,null);
  assert.equal(h.calls.length,0);
});
