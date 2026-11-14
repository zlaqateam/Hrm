'use client';
import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Download, Pencil, Plus, Search } from 'lucide-react';
import { useMe } from '@/lib/auth';
import { db } from '@/lib/data';
import { useTable } from '@/lib/hooks';
import { downloadCSV, errMsg, fmtDate, todayStr } from '@/lib/format';
import { canManage, managedTeam } from '@/lib/permissions';
import { ROLE_LABEL, type Profile, type Role } from '@/lib/types';
import { Avatar, Badge, Button, ErrorNote, Field, Input, Modal, PageHeader, RequireRole, Select, Table, td } from '@/components/ui';

export default function EmployeesPage() {
  return (
    <RequireRole roles={['super_admin', 'admin']}>
      <Employees />
    </RequireRole>
  );
}

function Employees() {
  const { me } = useMe();
  const profiles = useTable('profiles', { order: ['full_name', 'asc'] });
  const departments = useTable('departments', { order: ['name', 'asc'] });
  const [q, setQ] = useState('');
  const [dept, setDept] = useState('all');
  const [showInactive, setShowInactive] = useState(false);
  const [editing, setEditing] = useState<Partial<Profile> | null>(null);

  const scope = useMemo(() => (me.role === 'super_admin' ? profiles.rows : profiles.rows.filter((p) => p.id === me.id || canManage(me, p))), [me, profiles.rows]);
  const rows = scope.filter(
    (p) =>
      (showInactive || p.status === 'active') &&
      (dept === 'all' || p.department_id === dept) &&
      (!q || `${p.full_name} ${p.email} ${p.employee_code} ${p.designation}`.toLowerCase().includes(q.toLowerCase())),
  );
  const dName = (id: string | null) => departments.rows.find((d) => d.id === id);
  const pName = (id: string | null) => profiles.rows.find((p) => p.id === id)?.full_name;

  return (
    <div>
      <PageHeader
        title="Employees"
        subtitle={`${rows.length} people`}
        actions={
          <>
            <Button
              variant="secondary"
              onClick={() =>
                downloadCSV('employees.csv', [
                  ['Code', 'Name', 'Email', 'Role', 'Department', 'Designation', 'Manager', 'Phone', 'Joined', 'Status'],
                  ...rows.map((p) => [p.employee_code, p.full_name, p.email, ROLE_LABEL[p.role], dName(p.department_id)?.name, p.designation, pName(p.manager_id), p.phone, p.join_date, p.status]),
                ])
              }
            >
              <Download size={16} /> CSV
            </Button>
            <Button onClick={() => setEditing({ role: 'member', department_id: me.role === 'admin' ? me.department_id : null, manager_id: me.role === 'admin' ? me.id : null, join_date: todayStr() })}>
              <Plus size={16} /> Add employee
            </Button>
          </>
        }
      />
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative">
          <Search size={15} className="absolute left-3 top-2.5 text-neutral-400" />
          <Input className="w-64 pl-9" placeholder="Search name, email, code" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <Select className="w-52" value={dept} onChange={(e) => setDept(e.target.value)}>
          <option value="all">All departments</option>
          {departments.rows.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </Select>
        <label className="flex items-center gap-2 text-sm text-neutral-600">
          <input type="checkbox" checked={showInactive} onChange={(e) => setShowInactive(e.target.checked)} /> Show inactive
        </label>
      </div>
      <Table head={['Employee', 'Code', 'Role', 'Department', 'Manager', 'Joined', 'Status', '']}>
        {rows.map((p) => {
          const d = dName(p.department_id);
          return (
            <tr key={p.id} className="hover:bg-neutral-50">
              <td className={td}>
                <Link href={`/employees/${p.id}`} className="flex items-center gap-3 hover:underline">
                  <Avatar name={p.full_name} size={32} />
                  <div>
                    <div className="font-medium">{p.full_name}</div>
                    <div className="text-xs text-neutral-500">
                      {p.designation} · {p.email}
                    </div>
                  </div>
                </Link>
              </td>
              <td className={td}>{p.employee_code}</td>
              <td className={td}>
                <Badge tone={p.role === 'super_admin' ? 'brand' : p.role === 'admin' ? 'violet' : 'neutral'}>{ROLE_LABEL[p.role]}</Badge>
              </td>
              <td className={td}>
                {d && (
                  <span className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full" style={{ background: d.color }} />
                    {d.name}
                  </span>
                )}
              </td>
              <td className={td}>{pName(p.manager_id) ?? '—'}</td>
              <td className={td}>{fmtDate(p.join_date)}</td>
              <td className={td}>
                <Badge tone={p.status === 'active' ? 'green' : 'neutral'}>{p.status}</Badge>
              </td>
              <td className={td}>
                {(me.role === 'super_admin' || canManage(me, p)) && (
                  <Button size="sm" variant="ghost" onClick={() => setEditing(p)} aria-label="Edit">
                    <Pencil size={14} />
                  </Button>
                )}
              </td>
            </tr>
          );
        })}
      </Table>
      {editing && <EmployeeForm initial={editing} onClose={() => setEditing(null)} departments={departments.rows} profiles={profiles.rows} />}
    </div>
  );
}

function EmployeeForm({ initial, onClose, departments, profiles }: { initial: Partial<Profile>; onClose: () => void; departments: { id: string; name: string }[]; profiles: Profile[] }) {
  const { me } = useMe();
  const isNew = !initial.id;
  const [f, setF] = useState({
    full_name: initial.full_name ?? '', email: initial.email ?? '', password: '', role: (initial.role ?? 'member') as Role,
    department_id: initial.department_id ?? '', manager_id: initial.manager_id ?? '', designation: initial.designation ?? '',
    phone: initial.phone ?? '', employee_code: initial.employee_code ?? '', join_date: initial.join_date ?? todayStr(), status: initial.status ?? 'active',
  });
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof f, v: string) => setF({ ...f, [k]: v });
  const isSuper = me.role === 'super_admin';
  const managers = managedTeam(me, profiles).filter((p) => p.role !== 'member' || p.id === me.id);

  async function save() {
    if (!f.full_name.trim()) return setErr('Name is required');
    setBusy(true);
    setErr('');
    try {
      if (isNew) {
        if (f.password.length < 8) throw new Error('Temporary password must be at least 8 characters');
        await db.createUser({
          email: f.email, password: f.password, full_name: f.full_name, role: isSuper ? f.role : 'member',
          department_id: isSuper ? f.department_id || null : me.department_id, manager_id: f.manager_id || null,
          designation: f.designation, phone: f.phone, employee_code: f.employee_code, join_date: f.join_date,
        });
      } else {
        await db.update('profiles', initial.id!, {
          full_name: f.full_name, designation: f.designation, phone: f.phone, employee_code: f.employee_code, join_date: f.join_date,
          manager_id: f.manager_id || null, status: f.status as Profile['status'],
          ...(isSuper ? { role: f.role, department_id: f.department_id || null } : {}),
        });
      }
      onClose();
    } catch (e) {
      setErr(errMsg(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={isNew ? 'Add employee' : `Edit · ${initial.full_name}`}
      wide
      footer={
        <div className="flex w-full items-center justify-between gap-3">
          <div className="min-w-0 flex-1">
            <ErrorNote text={err} />
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Button variant="secondary" onClick={onClose} disabled={busy}>
              Cancel
            </Button>
            <Button onClick={save} disabled={busy}>
              {busy ? 'Saving…' : isNew ? 'Create login' : 'Save'}
            </Button>
          </div>
        </div>
      }
    >
      <div className="grid gap-3.5 md:grid-cols-2">
        <Field label="Full name">
          <Input value={f.full_name} onChange={(e) => set('full_name', e.target.value)} />
        </Field>
        <Field label="Work email">
          <Input type="email" value={f.email} onChange={(e) => set('email', e.target.value)} disabled={!isNew} />
        </Field>
        {isNew && (
          <Field label="Temporary password" hint="Share privately. They can change it in Profile.">
            <Input type="text" value={f.password} onChange={(e) => set('password', e.target.value)} />
          </Field>
        )}
        <Field label="Employee code">
          <Input value={f.employee_code} onChange={(e) => set('employee_code', e.target.value)} placeholder="ZQ-020" />
        </Field>
        <Field label="Designation">
          <Input value={f.designation} onChange={(e) => set('designation', e.target.value)} />
        </Field>
        <Field label="Phone">
          <Input value={f.phone} onChange={(e) => set('phone', e.target.value)} />
        </Field>
        <Field label="Role">
          <Select value={f.role} onChange={(e) => set('role', e.target.value)} disabled={!isSuper}>
            <option value="member">Member</option>
            <option value="admin">Manager (Admin)</option>
            <option value="super_admin">Super Admin</option>
          </Select>
        </Field>
        <Field label="Department">
          <Select value={f.department_id} onChange={(e) => set('department_id', e.target.value)} disabled={!isSuper}>
            <option value="">None</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Reports to">
          <Select value={f.manager_id} onChange={(e) => set('manager_id', e.target.value)}>
            <option value="">None</option>
            {managers.map((p) => (
              <option key={p.id} value={p.id}>
                {p.full_name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Joining date">
          <Input type="date" value={f.join_date} onChange={(e) => set('join_date', e.target.value)} />
        </Field>
        {!isNew && (
          <Field label="Status" hint="Inactive users can't sign in">
            <Select value={f.status} onChange={(e) => set('status', e.target.value)}>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </Select>
          </Field>
        )}
      </div>
    </Modal>
  );
}
