const fs=require('node:fs');
const {randomBytes}=require('node:crypto');
const {createClient}=require('@supabase/supabase-js');
const envPath='.env.local';
const env=Object.fromEntries(fs.readFileSync(envPath,'utf8').split(/\r?\n/).filter(l=>l&&!l.startsWith('#')).map(l=>{const i=l.indexOf('=');return [l.slice(0,i),l.slice(i+1)];}));
const admin=createClient(env.NEXT_PUBLIC_SUPABASE_URL,env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
async function main(){
  if(env.ADMIN_LOGIN_EMAIL)throw new Error('Owner login is already configured; refusing to replace credentials.');
  const {data:existing,error:readError}=await admin.from('admin_users').select('id').eq('password_login_allowed',true);
  if(readError)throw readError;if(existing.length)throw new Error('An owner account already exists; refusing to create a second one.');
  const password='GV-'+randomBytes(18).toString('base64url')+'!9a';
  const email='owner-'+randomBytes(8).toString('hex')+'@admin.gokulvivaham.invalid';
  const {data,error}=await admin.auth.admin.createUser({email,password,email_confirm:true,user_metadata:{full_name:'Gokul Vivaham Owner'}});
  if(error)throw error;
  const {error:membershipError}=await admin.from('admin_users').insert({auth_user_id:data.user.id,email,full_name:'Gokul Vivaham Owner',role:'super_admin',is_super_admin:true,password_login_allowed:true});
  if(membershipError){await admin.auth.admin.deleteUser(data.user.id);throw membershipError;}
  const {error:privacyError}=await admin.from('profiles').update({visibility:'private'}).eq('user_id',data.user.id);
  if(privacyError)throw privacyError;
  fs.appendFileSync(envPath,'\nADMIN_LOGIN_ID=admin\nADMIN_LOGIN_EMAIL='+email+'\n');
  fs.writeFileSync('.admin-credentials.local.txt','Private owner login\nURL: http://localhost:3001/admin/login\nAdmin ID: admin\nPassword: '+password+'\n\nThis is a unique initial password for this project. Do not share this file or commit it. Password authentication is handled by Supabase; this file is only for the owner.\n',{flag:'wx'});
  console.log('Created owner account. Credentials saved to .admin-credentials.local.txt; password not printed.');
}
main().catch(e=>{console.error(e.message);process.exitCode=1;});
