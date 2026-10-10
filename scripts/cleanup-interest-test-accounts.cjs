const fs = require('node:fs');
const { createClient } = require('@supabase/supabase-js');

const env = Object.fromEntries(
  fs.readFileSync('.env.local', 'utf8')
    .split(/\r?\n/)
    .filter((line) => line && !line.startsWith('#'))
    .map((line) => {
      const index = line.indexOf('=');
      return [line.slice(0, index), line.slice(index + 1).replace(/^"|"$/g, '')];
    }),
);

const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

async function main() {
  const listed = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (listed.error) throw listed.error;
  const users = listed.data.users.filter((user) => user.email?.startsWith('interest-check-'));
  const ids = users.map((user) => user.id);
  if (ids.length > 0) {
    const chatIds = ids.join(',');
    const chats = await admin.from('chats').delete().or(`user_one.in.(${chatIds}),user_two.in.(${chatIds})`);
    if (chats.error) console.error(`Chat cleanup failed: ${chats.error.message}`);
  }
  for (const user of users) {
    const notifications = await admin.from('notifications').delete().eq('user_id', user.id);
    if (notifications.error) console.error(`Notification cleanup failed for ${user.email}: ${notifications.error.message}`);
    const deleted = await admin.auth.admin.deleteUser(user.id);
    if (deleted.error) console.error(`Account cleanup failed for ${user.email} (${user.id}): ${deleted.error.message}`, deleted.error);
    else console.log(`Removed ${user.email}`);
  }
  console.log(`Found ${users.length} interest test accounts`);
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exitCode = 1;
});
