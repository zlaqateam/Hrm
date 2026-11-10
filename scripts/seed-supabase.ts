/**
 * Seeds a Supabase project with the same demo data as demo mode,
 * including real auth logins (password: Zlaqa@123).
 *
 *   1. Run supabase/migrations/0001_schema.sql then 0003_v2_features.sql
 *   2. Fill .env.local (URL + SERVICE ROLE key)
 *   3. npm run seed:supabase
 */
import { createClient } from '@supabase/supabase-js';
import { buildSeed, DEMO_PASSWORD } from '../src/lib/data/seed';

try {
  process.loadEnvFile('.env.local');
} catch {
  /* env may come from the shell */
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error('Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}
const admin = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

async function main() {
  const seed = buildSeed();
  const idMap = new Map<string, string>();
  const { data: existing } = await admin.auth.admin.listUsers({ perPage: 1000 });

  for (const p of seed.profiles) {
    let id = existing?.users.find((u) => u.email === p.email)?.id;
    if (!id) {
      const { data, error } = await admin.auth.admin.createUser({
        email: p.email, password: DEMO_PASSWORD, email_confirm: true, user_metadata: { full_name: p.full_name },
      });
      if (error) throw new Error(`auth ${p.email}: ${error.message}`);
      id = data.user.id;
    }
    idMap.set(p.id, id);
    console.log('user', p.email);
  }

  // swap demo ids for real auth ids everywhere
  let json = JSON.stringify(seed);
  for (const [from, to] of idMap) json = json.split(from).join(to);
  const s = JSON.parse(json) as typeof seed;

  const up = async (table: string, rows: object[]) => {
    for (let i = 0; i < rows.length; i += 500) {
      const { error } = await admin.from(table).upsert(rows.slice(i, i + 500));
      if (error) throw new Error(`${table}: ${error.message}`);
    }
    console.log(`${table}: ${rows.length}`);
  };

  await up('org_settings', s.org_settings);
  await up('departments', s.departments.map((d) => ({ ...d, head_id: null })));
  await up('profiles', s.profiles);
  for (const d of s.departments) if (d.head_id) await admin.from('departments').update({ head_id: d.head_id }).eq('id', d.id);
  await up('attendance', s.attendance);
  await up('breaks', s.breaks);
  await up('okr_templates', s.okr_templates);
  await up('objectives', s.objectives.filter((o) => !o.parent_id));
  await up('objectives', s.objectives.filter((o) => o.parent_id));
  await up('key_results', s.key_results);
  await up('channels', s.channels);
  await up('messages', s.messages);
  await up('tasks', s.tasks);
  await up('leave_requests', s.leave_requests);
  await up('announcements', s.announcements);
  await up('holidays', s.holidays);
  await up('kudos', s.kudos);
  await up('notifications', s.notifications);
  await admin.from('audit_log').delete().not('id', 'is', null);

  console.log(`\nDone. Log in with superadmin@zlaqa.demo / ${DEMO_PASSWORD}`);
  console.log('Before going live: delete demo users and set NEXT_PUBLIC_SHOW_DEMO_LOGINS=false.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
