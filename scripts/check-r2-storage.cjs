/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require('node:fs');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const { createClient } = require('@supabase/supabase-js');
const { S3Client, DeleteObjectsCommand, HeadObjectCommand } = require('@aws-sdk/client-s3');

const env = Object.fromEntries(
  fs.readFileSync('.env.local', 'utf8').split(/\r?\n/).filter(line => line && !line.startsWith('#')).map(line => {
    const separator = line.indexOf('=');
    return [line.slice(0, separator), line.slice(separator + 1)];
  }),
);
const required = [
  'NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_ROLE_KEY',
  'CLOUDFLARE_R2_URL', 'CLOUDFLARE_R2_ACCESS_KEY_ID', 'CLOUDFLARE_R2_SECRET_ACCESS_KEY',
  'R2_PROFILE_PHOTOS_BUCKET', 'R2_ID_PROOFS_BUCKET',
];
for (const name of required) if (!env[name]) throw new Error(`Missing ${name}`);

const base = (process.env.STORAGE_TEST_BASE_URL || env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3001').replace(/\/$/, '');
const opts = { auth: { persistSession: false, autoRefreshToken: false } };
const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, opts);
const makeClient = () => createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, opts);
const r2 = new S3Client({
  region: 'auto', endpoint: env.CLOUDFLARE_R2_URL,
  credentials: { accessKeyId: env.CLOUDFLARE_R2_ACCESS_KEY_ID, secretAccessKey: env.CLOUDFLARE_R2_SECRET_ACCESS_KEY },
});
const users = [];
const objects = { photos: new Set(), 'id-proofs': new Set() };
const png = fs.readFileSync('scripts/browser-fixture.png');
const pdf = Buffer.from('%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj\n%%EOF');

function headers(token, json = false) {
  return {
    origin: base,
    cookie: token ? `sb-access-token=${token}` : '',
    ...(env.VERCEL_OIDC_TOKEN ? { 'x-vercel-trusted-oidc-idp-token': env.VERCEL_OIDC_TOKEN } : {}),
    ...(json ? { 'Content-Type': 'application/json' } : {}),
  };
}
async function request(path, { method = 'GET', token = '', body, redirect = 'follow', origin = base } = {}) {
  return fetch(base + path, {
    method, redirect,
    headers: { ...headers(token, body !== undefined), origin },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
}
async function upload(bucket, name, bytes, type, token) {
  const form = new FormData();
  form.set('bucket', bucket);
  form.set('file', new File([bytes], name, { type }));
  return fetch(base + '/api/storage/upload', { method: 'POST', headers: headers(token), body: form });
}
async function createMember(label) {
  const email = `r2-${label}-${randomUUID()}@example.invalid`;
  const password = `${randomUUID()}Aa9!`;
  const created = await admin.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { full_name: `R2 ${label}` } });
  assert.equal(created.error, null);
  users.push(created.data.user.id);
  const client = makeClient();
  const login = await client.auth.signInWithPassword({ email, password });
  assert.equal(login.error, null);
  return { authId: created.data.user.id, token: login.data.session.access_token };
}
async function missing(bucket, key) {
  try { await r2.send(new HeadObjectCommand({ Bucket: env[bucket === 'photos' ? 'R2_PROFILE_PHOTOS_BUCKET' : 'R2_ID_PROOFS_BUCKET'], Key: key })); return false; }
  catch (error) { return error?.$metadata?.httpStatusCode === 404 || error?.name === 'NotFound'; }
}
async function cleanupObjects() {
  for (const [bucket, keys] of Object.entries(objects)) {
    if (!keys.size) continue;
    const Bucket = env[bucket === 'photos' ? 'R2_PROFILE_PHOTOS_BUCKET' : 'R2_ID_PROOFS_BUCKET'];
    await r2.send(new DeleteObjectsCommand({ Bucket, Delete: { Objects: [...keys].map(Key => ({ Key })), Quiet: true } })).catch(() => undefined);
  }
}

async function main() {
  try {
    const owner = await createMember('Owner');
    const viewer = await createMember('Viewer');

    const crossOrigin = await fetch(base + '/api/storage/upload', { method: 'POST', headers: { ...headers(owner.token), origin: 'https://attacker.invalid' } });
    assert.equal(crossOrigin.status, 403);
    const invalid = await upload('id-proofs', 'payload.html', Buffer.from('<html>bad</html>'), 'text/html', owner.token);
    assert.equal(invalid.status, 400);

    const documentUpload = await upload('id-proofs', 'identity.pdf', pdf, 'application/pdf', owner.token);
    assert.equal(documentUpload.status, 200);
    const documentPath = (await documentUpload.json()).url;
    objects['id-proofs'].add(documentPath);
    assert.ok(documentPath.startsWith(`${owner.authId}/`));
    assert.equal((await request(`/api/storage/signed-url?bucket=id-proofs&path=${encodeURIComponent(documentPath)}`, { token: viewer.token })).status, 403);
    assert.equal((await request(`/api/storage/signed-url?bucket=id-proofs&path=${encodeURIComponent(documentPath)}`)).status, 401);
    const signed = await request(`/api/storage/signed-url?bucket=id-proofs&path=${encodeURIComponent(documentPath)}`, { token: owner.token });
    assert.equal(signed.status, 200);
    assert.equal((await fetch((await signed.json()).url)).status, 200);
    assert.equal((await request('/api/storage/object', { method: 'DELETE', token: owner.token, body: { bucket: 'id-proofs', path: documentPath } })).status, 200);
    assert.equal(await missing('id-proofs', documentPath), true);
    objects['id-proofs'].delete(documentPath);

    const firstUpload = await upload('photos', 'profile.png', png, 'image/png', owner.token);
    assert.equal(firstUpload.status, 200);
    const first = await firstUpload.json();
    objects.photos.add(first.displayUrl); objects.photos.add(first.thumbnailUrl);
    const attached = await request('/api/photos', { method: 'POST', token: owner.token, body: { displayPath: first.displayUrl, thumbnailPath: first.thumbnailUrl, primary: true } });
    assert.equal(attached.status, 200);
    const photo = (await attached.json()).photo;
    assert.equal((await request(`/api/photos?path=${encodeURIComponent(first.displayUrl)}`, { token: owner.token })).status, 200);
    assert.equal((await request(`/api/photos?path=${encodeURIComponent(first.displayUrl)}`, { token: viewer.token })).status, 404);
    assert.equal((await request(`/api/photos?path=${encodeURIComponent(first.displayUrl)}`)).status, 404);

    const account = await admin.from('users').select('id').eq('auth_user_id', owner.authId).single();
    assert.equal(account.error, null);
    assert.equal((await admin.from('profiles').update({ visibility: 'public', profile_photo_visibility: 'all_members' }).eq('user_id', account.data.id)).error, null);
    assert.equal((await admin.from('gallery_images').update({ moderation_status: 'approved', privacy_level: 'public', is_private: false }).eq('id', photo.id)).error, null);
    assert.equal((await request(`/api/photos?path=${encodeURIComponent(first.displayUrl)}`, { token: viewer.token })).status, 200);

    const replacementUpload = await upload('photos', 'replacement.png', png, 'image/png', owner.token);
    assert.equal(replacementUpload.status, 200);
    const replacement = await replacementUpload.json();
    objects.photos.add(replacement.displayUrl); objects.photos.add(replacement.thumbnailUrl);
    const replaced = await request('/api/photos', { method: 'POST', token: owner.token, body: { displayPath: replacement.displayUrl, thumbnailPath: replacement.thumbnailUrl, primary: true, replacePhotoId: photo.id } });
    assert.equal(replaced.status, 200);
    assert.equal((await request(`/api/photos?path=${encodeURIComponent(replacement.displayUrl)}`, { token: owner.token })).status, 200);
    assert.equal((await request(`/api/photos?path=${encodeURIComponent(replacement.displayUrl)}`, { token: viewer.token })).status, 404);

    assert.equal((await request('/api/photos', { method: 'DELETE', token: owner.token, body: { photoId: photo.id } })).status, 200);
    for (const path of [first.displayUrl, first.thumbnailUrl, replacement.displayUrl, replacement.thumbnailUrl]) {
      assert.equal(await missing('photos', path), true);
      objects.photos.delete(path);
    }
    console.log('PASS: authenticated R2 upload, content validation, owner access, unauthenticated/cross-user denial, approved viewer access, replacement privacy, deletion, and R2 object cleanup.');
  } finally {
    await cleanupObjects();
    for (const authId of users) {
      const account = await admin.from('users').select('id').eq('auth_user_id', authId).maybeSingle();
      if (account.data?.id) {
        await admin.from('gallery_photo_versions').delete().eq('user_id', account.data.id);
        await admin.from('gallery_images').delete().eq('user_id', account.data.id);
        await admin.from('verification_requests').delete().eq('user_id', account.data.id);
      }
      await admin.auth.admin.deleteUser(authId);
    }
    console.log('Temporary R2 objects and synthetic members removed.');
  }
}

main().catch(error => { console.error(error.stack || error.message); process.exitCode = 1; });
