// POST /api/admin/users  (Supabase mode only)
// Creates an auth login + profile. Needs SUPABASE_SERVICE_ROLE_KEY on the server.
// Super Admin: any role/department. Manager: members in own department only.
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: Request) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !service) return NextResponse.json({ error: 'Server not configured: set SUPABASE_SERVICE_ROLE_KEY' }, { status: 500 });

  const token = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  if (!token) return NextResponse.json({ error: 'Not signed in' }, { status: 401 });

  const admin = createClient(url, service, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: who, error: whoErr } = await admin.auth.getUser(token);
  if (whoErr || !who.user) return NextResponse.json({ error: 'Invalid session' }, { status: 401 });

  const { data: caller } = await admin.from('profiles').select('*').eq('id', who.user.id).single();
  if (!caller || caller.role === 'member') return NextResponse.json({ error: 'Not allowed' }, { status: 403 });

  const body = await req.json();
  const email = String(body.email ?? '').trim().toLowerCase();
  const password = String(body.password ?? '');
  if (!/^\S+@\S+\.\S+$/.test(email)) return NextResponse.json({ error: 'Valid email required' }, { status: 400 });
  if (password.length < 8) return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 });

  let role = ['super_admin', 'admin', 'member'].includes(body.role) ? body.role : 'member';
  let department_id = body.department_id ?? null;
  if (caller.role === 'admin') {
    role = 'member';
    department_id = caller.department_id;
  }

  const { data: created, error } = await admin.auth.admin.createUser({
    email, password, email_confirm: true, user_metadata: { full_name: body.full_name },
  });
  if (error || !created.user) return NextResponse.json({ error: error?.message ?? 'Create failed' }, { status: 400 });

  const { data: profile, error: pErr } = await admin
    .from('profiles')
    .upsert({
      id: created.user.id, email, full_name: body.full_name ?? '', role, department_id,
      manager_id: body.manager_id ?? (caller.role === 'admin' ? caller.id : null),
      designation: body.designation ?? '', phone: body.phone ?? '', employee_code: body.employee_code ?? '',
      join_date: body.join_date || new Date().toISOString().slice(0, 10), status: 'active',
    })
    .select()
    .single();
  if (pErr) return NextResponse.json({ error: pErr.message }, { status: 400 });
  return NextResponse.json(profile);
}
