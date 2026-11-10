'use client';
import { useEffect, useMemo, useState } from 'react';
import { Check, Plus, X } from 'lucide-react';
import { useMe } from '@/lib/auth';
import { db } from '@/lib/data';
import { useTable } from '@/lib/hooks';
import { errMsg, fmtDate, parseDate } from '@/lib/format';
import { workingDays } from '@/lib/metrics';
import { managedTeam } from '@/lib/permissions';
import { approversFor, firstName, notify } from '@/lib/notify';
import { useToast } from '@/lib/toast';
import type { LeaveRequest } from '@/lib/types';
import { Avatar, Badge, Button, Card, Empty, ErrorNote, Field, Input, Modal, PageHeader, Progress, Select, Table, Tabs, Textarea, td } from '@/components/ui';

const tone = (s: LeaveRequest['status']) => (s === 'approved' ? 'green' : s === 'rejected' ? 'red' : 'amber');

export default function LeavePage() {
  const { me, settings } = useMe();
  const leaves = useTable('leave_requests', { order: ['created_at', 'desc'] });
  const profiles = useTable('profiles');
  const [tab, setTab] = useState<'mine' | 'approvals' | 'all'>('mine');
  const [applying, setApplying] = useState(false);
  const toast = useToast();
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get('new')) setApplying(true);
  }, []);

  const team = useMemo(() => managedTeam(me, profiles.rows), [me, profiles.rows]);
  const teamIds = new Set(team.filter((p) => p.id !== me.id).map((p) => p.id));
  const year = String(new Date().getFullYear());
  const mine = leaves.rows.filter((l) => l.user_id === me.id);
  const approvals = leaves.rows.filter((l) => teamIds.has(l.user_id) && l.status === 'pending');
  const all = leaves.rows.filter((l) => teamIds.has(l.user_id) || l.user_id === me.id);
  const list = tab === 'mine' ? mine : tab === 'approvals' ? approvals : all;
  const pName = (id: string) => profiles.rows.find((p) => p.id === id)?.full_name;

  const decide = async (l: LeaveRequest, status: 'approved' | 'rejected') => {
    await db.update('leave_requests', l.id, { status, approver_id: me.id, decided_at: new Date().toISOString() });
    await notify([l.user_id], { title: `Your ${l.type} leave was ${status}`, body: `${fmtDate(l.start_date)} · ${l.days} day(s) · by ${firstName(me.full_name)}`, link: '/leave', kind: 'leave' });
    toast(`Leave ${status}`, status === 'approved' ? 'success' : 'info', `${pName(l.user_id)} has been notified`);
  };

  return (
    <div>
      <PageHeader
        title="Leave"
        subtitle="Apply, track balances and approve requests"
        actions={
          <Button onClick={() => setApplying(true)}>
            <Plus size={16} /> Apply for leave
          </Button>
        }
      />
      <div className="mb-5 grid grid-cols-2 gap-4 md:grid-cols-4">
        {settings.leave_types.map((t) => {
          const quota = settings.leave_quota[t] ?? 0;
          const used = mine.filter((l) => l.type === t && l.status === 'approved' && l.start_date.startsWith(year)).reduce((s, l) => s + Number(l.days), 0);
          return (
            <Card key={t}>
              <div className="text-xs text-neutral-500">{t}</div>
              <div className="mt-1 text-2xl font-semibold">
                {Math.max(0, quota - used)} <span className="text-sm font-normal text-neutral-400">/ {quota} left</span>
              </div>
              <Progress className="mt-2" value={quota ? (used / quota) * 100 : 0} />
            </Card>
          );
        })}
      </div>
      {me.role !== 'member' && (
        <div className="mb-4">
          <Tabs
            value={tab}
            onChange={setTab}
            tabs={[
              { id: 'mine', label: 'My requests' },
              { id: 'approvals', label: `Awaiting approval (${approvals.length})` },
              { id: 'all', label: 'Team history' },
            ]}
          />
        </div>
      )}
      {list.length ? (
        <Table head={['Person', 'Type', 'Dates', 'Days', 'Reason', 'Status', '']}>
          {list.map((l) => (
            <tr key={l.id}>
              <td className={td}>
                <span className="flex items-center gap-2">
                  <Avatar name={pName(l.user_id)} size={26} /> {pName(l.user_id)}
                </span>
              </td>
              <td className={td}>{l.type}</td>
              <td className={td}>
                {fmtDate(l.start_date)}
                {l.end_date !== l.start_date && ` – ${fmtDate(l.end_date)}`}
              </td>
              <td className={td}>{l.days}</td>
              <td className={`${td} max-w-xs truncate`}>{l.reason}</td>
              <td className={td}>
                <Badge tone={tone(l.status)}>{l.status}</Badge>
              </td>
              <td className={td}>
                {l.status === 'pending' && teamIds.has(l.user_id) && (
                  <div className="flex gap-1">
                    <Button size="sm" variant="success" onClick={() => decide(l, 'approved')}>
                      <Check size={14} />
                    </Button>
                    <Button size="sm" variant="danger" onClick={() => decide(l, 'rejected')}>
                      <X size={14} />
                    </Button>
                  </div>
                )}
                {l.status === 'pending' && l.user_id === me.id && (
                  <Button size="sm" variant="ghost" onClick={() => db.remove('leave_requests', l.id)}>
                    Cancel
                  </Button>
                )}
              </td>
            </tr>
          ))}
        </Table>
      ) : (
        <Empty text="No leave requests here." />
      )}
      {applying && <Apply onClose={() => setApplying(false)} profiles={profiles.rows} />}
    </div>
  );
}

function Apply({ onClose, profiles }: { onClose: () => void; profiles: import('@/lib/types').Profile[] }) {
  const { me, settings } = useMe();
  const toast = useToast();
  const [type, setType] = useState(settings.leave_types[0] ?? 'Casual');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [half, setHalf] = useState(false);
  const [reason, setReason] = useState('');
  const [err, setErr] = useState('');
  const days = from && to && to >= from ? (half ? 0.5 : workingDays(parseDate(from), parseDate(to), settings.weekly_off).length) : 0;

  async function save() {
    if (!from || !to || to < from) return setErr('Pick a valid date range');
    if (!days) return setErr('Selected range has no working days');
    try {
      await db.insert('leave_requests', { user_id: me.id, type, start_date: from, end_date: to, days, reason, status: 'pending', approver_id: null, decided_at: null });
      await notify(approversFor(me, profiles), { title: `${me.full_name} requested leave`, body: `${type} · ${days} day(s) from ${fmtDate(from)}`, link: '/leave', kind: 'leave' });
      toast('Leave request sent', 'success', 'Your approver has been notified');
      onClose();
    } catch (e) {
      setErr(errMsg(e));
    }
  }

  return (
    <Modal open onClose={onClose} title="Apply for leave">
      <div className="space-y-3">
        <Field label="Type">
          <Select value={type} onChange={(e) => setType(e.target.value)}>
            {settings.leave_types.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </Select>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="From">
            <Input type="date" value={from} onChange={(e) => { setFrom(e.target.value); if (!to) setTo(e.target.value); }} />
          </Field>
          <Field label="To">
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </Field>
        </div>
        {from && from === to && (
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={half} onChange={(e) => setHalf(e.target.checked)} /> Half day
          </label>
        )}
        <Field label="Reason">
          <Textarea value={reason} onChange={(e) => setReason(e.target.value)} />
        </Field>
        <p className="text-sm text-neutral-600">
          Working days: <b>{days}</b>
        </p>
        <ErrorNote text={err} />
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={save}>Submit</Button>
        </div>
      </div>
    </Modal>
  );
}
