const fs=require('node:fs');const assert=require('node:assert/strict');const {randomUUID}=require('node:crypto');const {createClient}=require('@supabase/supabase-js');
const env=Object.fromEntries(fs.readFileSync('.env.local','utf8').split(/\r?\n/).filter(l=>l&&!l.startsWith('#')).map(l=>{const i=l.indexOf('=');return[l.slice(0,i),l.slice(i+1)];}));
const opts={auth:{persistSession:false,autoRefreshToken:false}},admin=createClient(env.NEXT_PUBLIC_SUPABASE_URL,env.SUPABASE_SERVICE_ROLE_KEY,opts),make=()=>createClient(env.NEXT_PUBLIC_SUPABASE_URL,env.NEXT_PUBLIC_SUPABASE_ANON_KEY,opts);
const base=env.NEXT_PUBLIC_SITE_URL,ids=[],paths=[];
const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jwN8AAAAASUVORK5CYII=','base64');
async function main(){try{
 const metadata={full_name:'Registration Test Member',gender:'Female',dob:'1998-04-12',age:'28',maritalStatus:'Never Married',religion:'Hindu',caste:'Test Community',subCaste:'Test Subcommunity',motherTongue:'Tamil',star:'Rohini',rasi:'Rishabam',padam:'2',gothram:'Test Gothram',height:'165',weight:'55',physicalStatus:'Normal',education:'B.Tech',occupation:'Engineer',companyName:'Test Company',annualIncome:'600000',workLocation:'Chennai',nativePlace:'Madurai',fatherName:'Test Father',fatherOccupation:'Teacher',motherName:'Test Mother',motherOccupation:'Teacher',siblings:'One sibling',familyType:'Nuclear',aboutMe:'Test member biography',partnerExpectations:'Test expectations',consentEligibility:true,consentTermsPrivacy:true,consentProcessing:true,consentAccuracy:true,clientIp:'Not collected',userAgent:'Registration test',profilePhotoUrl:'https://foreign.invalid/unreviewed.jpg',horoscopeUrl:'https://foreign.invalid/document.pdf',role:'super_admin'};
 const clients=[],tokens=[];
 for(let i=0;i<2;i++){const email='registration-test-'+randomUUID()+'@example.invalid',password=randomUUID()+'Aa9!';const created=await admin.auth.admin.createUser({email,password,email_confirm:true,user_metadata:i===0?metadata:{full_name:'Other Test Member'}});assert.equal(created.error,null);ids.push(created.data.user.id);const client=make();const login=await client.auth.signInWithPassword({email,password});assert.equal(login.error,null);clients.push(client);tokens.push(login.data.session.access_token);}
 const profile=await admin.from('profiles').select('*').eq('user_id',ids[0]).single();assert.equal(profile.error,null);
 const expected={first_name:'Registration',last_name:'Test Member',gender:metadata.gender,date_of_birth:metadata.dob,age:28,marital_status:metadata.maritalStatus,religion:metadata.religion,caste:metadata.caste,sub_caste:metadata.subCaste,mother_tongue:metadata.motherTongue,nakshatra:metadata.star,rasi:metadata.rasi,padam:metadata.padam,gothram:metadata.gothram,height_cm:165,weight_kg:55,physical_status:metadata.physicalStatus,education:metadata.education,occupation:metadata.occupation,company_name:metadata.companyName,annual_income:600000,city:metadata.workLocation,native_place:metadata.nativePlace,father_name:metadata.fatherName,father_occupation:metadata.fatherOccupation,mother_name:metadata.motherName,mother_occupation:metadata.motherOccupation,siblings:metadata.siblings,family_type:metadata.familyType,about_me:metadata.aboutMe,partner_expectations:metadata.partnerExpectations,is_verified:false,is_premium:false};
 for(const [key,value] of Object.entries(expected)) assert.equal(profile.data[key],value,'Persisted field: '+key);
 const consents=await admin.from('consent_logs').select('accepted').eq('user_id',ids[0]);assert.equal(consents.data.length,4);assert.ok(consents.data.every(c=>c.accepted));
 assert.equal((await admin.from('users').select('role').eq('id',ids[0]).single()).data.role,'user');
 assert.equal((await admin.from('gallery_images').select('id').eq('user_id',ids[0])).data.length,0);
 assert.equal((await admin.from('horoscope_uploads').select('id').eq('user_id',ids[0])).data.length,0);
 const password=fs.readFileSync('.admin-credentials.local.txt','utf8').match(/^Password: (.+)$/m)[1];const login=await fetch(base+'/api/admin/login',{method:'POST',headers:{origin:base,'Content-Type':'application/json'},body:JSON.stringify({username:env.ADMIN_LOGIN_ID,password})});assert.equal(login.status,200);const owner=await login.json();
 const call=(path,method='GET',body,token=tokens[0])=>fetch(base+path,{method,headers:{origin:base,cookie:'sb-access-token='+token,'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});
 const path=ids[0]+'/'+randomUUID()+'.png';paths.push(path);assert.equal((await clients[0].storage.from('photos').upload(path,png,{contentType:'image/png'})).error,null);
 assert.ok((await clients[1].storage.from('photos').download(path)).error);
 assert.equal((await call('/api/photos','POST',{path,primary:true},tokens[1])).status,409);
 const attached=await call('/api/photos','POST',{path,primary:true});assert.equal(attached.status,200);const photo=(await attached.json()).photo;
 assert.equal(photo.moderation_status,'pending');assert.equal(photo.image_url,'/api/photos?path='+path);
 assert.equal((await call(photo.image_url)).status,200);assert.equal((await call(photo.image_url,'GET',null,tokens[1])).status,404);assert.equal((await call(photo.image_url,'GET',null,'')).status,404);
 const rawPublic=admin.storage.from('photos').getPublicUrl(path).data.publicUrl;assert.notEqual((await fetch(rawPublic)).status,200);
 assert.ok((await clients[0].from('gallery_images').update({moderation_status:'approved'}).eq('id',photo.id)).error);
 assert.equal((await call('/api/admin/photos','PATCH',{photoId:photo.id,action:'approve'})).status,403);
 assert.equal((await call('/api/admin/photos','PATCH',{photoId:photo.id,action:'approve'},owner.access_token)).status,200);
 assert.equal((await call(photo.image_url,'GET',null,tokens[1])).status,200);
 assert.equal((await clients[0].from('gallery_images').update({privacy_level:'hidden',is_private:true}).eq('id',photo.id)).error,null);
 assert.equal((await call(photo.image_url,'GET',null,tokens[1])).status,404);assert.equal((await call(photo.image_url)).status,200);
 assert.equal((await clients[0].from('gallery_images').update({privacy_level:'premium_only',is_private:true}).eq('id',photo.id)).error,null);assert.equal((await call(photo.image_url,'GET',null,tokens[1])).status,404);
 assert.equal((await clients[0].from('gallery_images').update({privacy_level:'public',is_private:false}).eq('id',photo.id)).error,null);
 assert.equal((await call('/api/photos','POST',{path,primary:true})).status,200);assert.equal((await admin.from('gallery_images').select('id').eq('user_id',ids[0])).data.length,1);
 for(let i=0;i<3;i++){const more=ids[0]+'/'+randomUUID()+'.png';paths.push(more);assert.equal((await clients[0].storage.from('photos').upload(more,png,{contentType:'image/png'})).error,null);assert.equal((await call('/api/photos','POST',{path:more,primary:false})).status,i<2?200:409);}
 assert.equal((await call('/api/admin/photos','PATCH',{photoId:photo.id,action:'reject'},owner.access_token)).status,200);assert.equal((await call(photo.image_url,'GET',null,tokens[1])).status,404);
 const ownerClient=make();await ownerClient.auth.setSession(owner);await ownerClient.auth.signOut({scope:'local'});
 console.log('PASS: complete registration-field and consent persistence; signup metadata cannot promote roles/approve files; authenticated private photos; pending/hidden/premium denial; admin approval/rejection; idempotent attachment; three-photo cap.');
}finally{if(paths.length) await admin.storage.from('photos').remove(paths);for(const id of ids){await admin.from('activity_logs').delete().eq('metadata->>target_user_id',id);const removed=await admin.auth.admin.deleteUser(id);assert.equal(removed.error,null);}console.log('Temporary members and photos removed.');}}
main().catch(e=>{console.error(e.message);process.exitCode=1;});
