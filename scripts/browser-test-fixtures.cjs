const fs=require('fs'),{randomUUID}=require('crypto'),{createClient}=require('@supabase/supabase-js');
const env=Object.fromEntries(fs.readFileSync('.env.local','utf8').split(/\r?\n/).filter(l=>l&&!l.startsWith('#')).map(l=>{const i=l.indexOf('=');return [l.slice(0,i),l.slice(i+1)]}));
const db=createClient(env.NEXT_PUBLIC_SUPABASE_URL,env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false}});
const file='.browser-test-fixtures.local.json';function ok(r){if(r.error)throw r.error;return r.data;}
(async()=>{
 if(process.argv[2]==='cleanup'){const state=JSON.parse(fs.readFileSync(file));for(const id of state.ids){for(const bucket of ['photos','id-proofs','horoscopes']){const files=ok(await db.storage.from(bucket).list(id));if(files.length)ok(await db.storage.from(bucket).remove(files.map(f=>id+'/'+f.name)));}ok(await db.from('chats').delete().or('user_one.eq.'+id+',user_two.eq.'+id));ok(await db.from('match_requests').delete().or('sender_user_id.eq.'+id+',receiver_user_id.eq.'+id));ok(await db.auth.admin.deleteUser(id));}fs.unlinkSync(file);console.log('Disposable browser members and related records removed.');return;}
 if(fs.existsSync(file))throw Error('Fixture file already exists');
 const state={ids:[],emails:[],chatId:null};fs.writeFileSync(file,JSON.stringify(state));
 for(let i=0;i<2;i++){const email='browser-qa-'+randomUUID()+'@example.invalid';const data=ok(await db.auth.admin.createUser({email,password:'Disposable-QA-2026!Only',email_confirm:true,user_metadata:{full_name:i?'Browser Partner Fixture':'Browser Member Fixture',gender:i?'Female':'Male',dob:i?'1998-04-12':'1996-04-12',age:i?'28':'30',religion:'Hindu',caste:'QA Fixture',motherTongue:'Tamil',workLocation:'Chennai'}}));state.ids.push(data.user.id);state.emails.push(email);fs.writeFileSync(file,JSON.stringify(state));ok(await db.from('profiles').update({moderation_status:'approved',visibility:'public'}).eq('user_id',data.user.id));}
 const plan=ok(await db.from('subscription_plans').select('id').ilike('name','%silver%').single());
 ok(await db.from('subscriptions').insert(state.ids.map(id=>({user_id:id,plan_id:plan.id,payment_status:'Completed',start_date:new Date().toISOString(),end_date:new Date(Date.now()+86400000).toISOString()}))));
 const interest=ok(await db.from('match_requests').insert({sender_user_id:state.ids[0],receiver_user_id:state.ids[1],status:'pending',message:'Disposable QA connection'}).select('id').single());ok(await db.from('match_requests').update({status:'accepted'}).eq('id',interest.id));
 const chat=ok(await db.from('chats').select('id').eq('user_one',state.ids[0]).eq('user_two',state.ids[1]).single());state.chatId=chat.id;fs.writeFileSync(file,JSON.stringify(state));console.log(JSON.stringify({emails:state.emails,chatId:state.chatId}));
})().catch(e=>{console.error(e.message);process.exitCode=1});


