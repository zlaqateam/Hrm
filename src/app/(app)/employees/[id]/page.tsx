'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, Mail, Phone } from 'lucide-react';
import { useMe } from '@/lib/auth';
import { useWorkspace } from '@/lib/workspace';
import { fmtDate, fmtDay, fmtMinutes, fmtTime } from '@/lib/format';
import { krsOf, objectiveProgress, userStats } from '@/lib/metrics';
import { canManage } from '@/lib/permissions';
import { ROLE_LABEL } from '@/lib/types';
import { Avatar, Badge, Card, Empty, Modal, Progress, RequireRole, Spinner, Stat, Table, Tabs, td } from '@/components/ui';
import { AttendanceBadge, Bars, OkrStatusBadge, Ring, SelfieImg } from '@/components/bits';

export default function EmployeeDetailPage() {
  return (
    <RequireRole roles={['super_admin', 'admin']}>
      <Detail />
    </RequireRole>
  );
}

function Detail() {
  const { id } = useParams<{ id: string }>();
  const { me, settings } = useMe();
  const ws = useWorkspace(90, settings.current_cycle);
  const [days, setDays] = useState<'30' | '90'>('30');
  const [zoom, setZoom] = useState('');
  const p = ws.profiles.find((x) => x.id === id);

  if (ws.loading) return <div className="grid place-items-center py-24"><Spinner /></div>;
  if (!p) return <Empty text="Employee not found." />;
  if (me.role !== 'super_admin' && me.id !== p.id && !canManage(me, p)) return <Empty text="You can only view people in your team." />;

  const s = userStats(p, { attendance: ws.attendance, objectives: ws.objectives, krs: ws.krs, tasks: ws.tasks, leaves: ws.leaves, holidays: ws.holidays }, settings, Number(days));
  const recs = ws.attendance.filter((a) => a.user_id === p.id).sort((a, b) => b.date.localeCompare(a.date));
  const objs = ws.objectives.filter((o) => o.owner_id === p.id);
  const d = ws.departments.find((x) => x.id === p.department_id);
  const mgr = ws.profiles.find((x) => x.id === p.manager_id);
  const trend = recs.slice(0, 20).reverse().map((a) => ({ label: a.date, short: a.date.slice(8), value: Math.min(100, (a.work_minutes / settings.full_day_minutes) * 100) }));

  return (
    <div>
      <Link href="/employees" className="mb-4 inline-flex items-center gap-1 text-sm text-neutral-500 hover:text-neutral-800">
        <ArrowLeft size={15} /> Employees
      </Link>
      <Card className="mb-5">
        <div className="flex flex-wrap items-center gap-5">
          <Avatar name={p.full_name} size={64} />
          <div className="min-w-0 flex-1">
            <h1 className="text-xl font-semibold">{p.full_name}</h1>
            <p className="text-sm text-neutral-500">
              {p.designation} · {d?.name ?? 'No department'} · {p.employee_code}
            </p>
            <div className="mt-2 flex flex-wrap gap-3 text-xs text-neutral-500">
              <span className="flex items-center gap-1"><Mail size={12} /> {p.email}</span>
              {p.phone && <span className="flex items-center gap-1"><Phone size={12} /> {p.phone}</span>}
              <span>Joined {fmtDate(p.join_date)}</span>
              {mgr && <span>Reports to {mgr.full_name}</span>}
              <Badge tone={p.role === 'member' ? 'neutral' : 'violet'}>{ROLE_LABEL[p.role]}</Badge>
            </div>
          </div>
          <Ring value={s.score} size={90} label="score" />
        </div>
      </Card>

      <div className="mb-4 flex justify-end">
        <Tabs value={days} onChange={setDays} tabs={[{ id: '30', label: '30 days' }, { id: '90', label: '90 days' }]} />
      </div>
      <div className="mb-5 grid grid-cols-2 gap-4 md:grid-cols-4">
        <Stat label="Attendance" value={`${Math.round(s.attendancePct)}%`} sub={`${s.presentDays}/${s.workingDays} days`} tone="green" />
        <Stat label="Punctuality" value={`${Math.round(s.punctualityPct)}%`} sub={`${s.lateDays} late`} tone="amber" />
        <Stat label="OKR progress" value={s.okrPct === null ? 'n/a' : `${Math.round(s.okrPct)}%`} sub={`${s.objectives} objectives`} tone="violet" />
        <Stat label="Avg worked / day" value={fmtMinutes(s.avgWorkMinutes)} sub={`${s.tasksDone}/${s.tasksTotal} tasks done`} />
      </div>

      <div className="mb-5 grid gap-5 lg:grid-cols-2">
        <Card title="Worked hours vs full day (last 20 records)">{trend.length ? <Bars data={trend} /> : <Empty text="No records" />}</Card>
        <Card title={`OKRs · ${settings.current_cycle}`}>
          {objs.length ? (
            <div className="space-y-3">
              {objs.map((o) => (
                <div key={o.id}>
                  <div className="mb-1 flex items-center justify-between gap-2 text-sm">
                    <span className="truncate font-medium">{o.title}</span>
                    <OkrStatusBadge status={o.status} />
                  </div>
                  <Progress value={objectiveProgress(krsOf(o.id, ws.krs))} showLabel />
                </div>
              ))}
            </div>
          ) : (
            <Empty text="No OKRs this cycle" />
          )}
        </Card>
      </div>

      <h2 className="mb-3 text-lg font-semibold">Attendance log</h2>
      <Table head={['Date', 'Status', 'In', 'Out', 'Breaks', 'Worked', 'Selfies', 'Notes']}>
        {recs.slice(0, 40).map((a) => (
          <tr key={a.id}>
            <td className={td}>{fmtDay(a.date)}</td>
            <td className={td}><AttendanceBadge status={a.status} /></td>
            <td className={td}>{fmtTime(a.check_in)}</td>
            <td className={td}>{fmtTime(a.check_out)}</td>
            <td className={td}>{fmtMinutes(a.break_minutes)}</td>
            <td className={td}>{a.check_out ? fmtMinutes(a.work_minutes) : '—'}</td>
            <td className={td}>
              <div className="flex gap-1">
                <SelfieImg refPath={a.check_in_selfie} className="h-8 w-8" onClick={setZoom} />
                <SelfieImg refPath={a.check_out_selfie} className="h-8 w-8" onClick={setZoom} />
              </div>
            </td>
            <td className={`${td} max-w-xs truncate text-xs text-neutral-500`}>{a.notes}</td>
          </tr>
        ))}
      </Table>
      <Modal open={!!zoom} onClose={() => setZoom('')} title="Selfie">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={zoom} alt="selfie" className="w-full rounded-xl" />
      </Modal>
    </div>
  );
}
