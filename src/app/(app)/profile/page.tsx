'use client';
import { useState } from 'react';
import { useMe } from '@/lib/auth';
import { db } from '@/lib/data';
import { useTable } from '@/lib/hooks';
import { errMsg, fmtDate } from '@/lib/format';
import { ROLE_LABEL } from '@/lib/types';
import { Avatar, Badge, Button, Card, ErrorNote, Field, Input, PageHeader } from '@/components/ui';

export default function ProfilePage() {
  const { me, refresh } = useMe();
  const departments = useTable('departments');
  const profiles = useTable('profiles');
  const [name, setName] = useState(me.full_name);
  const [phone, setPhone] = useState(me.phone);
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  const dept = departments.rows.find((d) => d.id === me.department_id);
  const mgr = profiles.rows.find((p) => p.id === me.manager_id);

  async function saveProfile() {
    setErr('');
    try {
      await db.update('profiles', me.id, { full_name: name, phone });
      await refresh();
      setMsg('Profile saved');
    } catch (e) {
      setErr(errMsg(e));
    }
  }
  async function savePw() {
    setErr('');
    if (pw.length < 8) return setErr('Password must be at least 8 characters');
    if (pw !== pw2) return setErr('Passwords do not match');
    try {
      await db.changePassword(pw);
      setPw('');
      setPw2('');
      setMsg('Password changed');
    } catch (e) {
      setErr(errMsg(e));
    }
  }

  return (
    <div className="max-w-3xl">
      <PageHeader title="My profile" />
      <Card className="mb-5">
        <div className="flex items-center gap-4">
          <Avatar name={me.full_name} size={60} />
          <div>
            <div className="text-lg font-semibold">{me.full_name}</div>
            <div className="text-sm text-neutral-500">
              {me.designation} · {dept?.name ?? 'No department'}
            </div>
            <div className="mt-1 flex flex-wrap gap-2 text-xs text-neutral-500">
              <Badge>{ROLE_LABEL[me.role]}</Badge>
              <span>{me.employee_code}</span>
              <span>Joined {fmtDate(me.join_date)}</span>
              {mgr && <span>Reports to {mgr.full_name}</span>}
            </div>
          </div>
        </div>
      </Card>
      {msg && <div className="mb-4 rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{msg}</div>}
      <ErrorNote text={err} />
      <div className="mt-4 grid gap-5 md:grid-cols-2">
        <Card title="Details">
          <div className="space-y-3">
            <Field label="Full name">
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </Field>
            <Field label="Phone">
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
            </Field>
            <Field label="Email" hint="Ask a Super Admin to change your email">
              <Input value={me.email} disabled />
            </Field>
            <Button onClick={saveProfile}>Save</Button>
          </div>
        </Card>
        <Card title="Change password">
          <div className="space-y-3">
            <Field label="New password">
              <Input type="password" value={pw} onChange={(e) => setPw(e.target.value)} />
            </Field>
            <Field label="Confirm">
              <Input type="password" value={pw2} onChange={(e) => setPw2(e.target.value)} />
            </Field>
            <Button onClick={savePw}>Update password</Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
