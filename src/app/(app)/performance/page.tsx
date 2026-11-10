'use client';
import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Download } from 'lucide-react';
import { useMe } from '@/lib/auth';
import { useWorkspace } from '@/lib/workspace';
import { downloadCSV, fmtMinutes } from '@/lib/format';
import { userStats, scoreTone } from '@/lib/metrics';
import { managedTeam, visibleTeam } from '@/lib/permissions';
import { Avatar, Badge, Button, Card, PageHeader, Progress, Select, Spinner, Table, Tabs, td } from '@/components/ui';
import { HBars, Ring } from '@/components/bits';

export default function PerformancePage() {
  const { me, settings } = useMe();
  const [days, setDays] = useState<'7' | '30' | '90'>('30');
  const [dept, setDept] = useState('all');
  const ws = useWorkspace(Number(days), settings.current_cycle);
  const w = settings.performance_weights;

  const people = useMemo(() => (me.role === 'member' ? visibleTeam(me, ws.profiles, settings) : managedTeam(me, ws.profiles)), [me, ws.profiles, settings]);
  const rows = people
    .filter((p) => dept === 'all' || p.department_id === dept)
    .map((p) => ({ p, s: userStats(p, { attendance: ws.attendance, objectives: ws.objectives, krs: ws.krs, tasks: ws.tasks, leaves: ws.leaves, holidays: ws.holidays }, settings, Number(days)) }))
    .sort((a, b) => b.s.score - a.s.score);
  const mine = userStats(me, { attendance: ws.attendance, objectives: ws.objectives, krs: ws.krs, tasks: ws.tasks, leaves: ws.leaves, holidays: ws.holidays }, settings, Number(days));
  const myRank = rows.findIndex((r) => r.p.id === me.id) + 1;

  const deptAvg = ws.departments
    .map((d) => {
      const rs = rows.filter((r) => r.p.department_id === d.id);
      return { label: d.name, value: rs.length ? rs.reduce((s, r) => s + r.s.score, 0) / rs.length : 0, color: d.color, n: rs.length };
    })
    .filter((d) => d.n > 0);

  const n = (v: number | null) => (v === null ? 'n/a' : `${Math.round(v)}%`);

  function exportCsv() {
    downloadCSV(`performance_${days}d.csv`, [
      ['Rank', 'Name', 'Code', 'Score', 'Attendance %', 'Punctuality %', 'OKR %', 'Task %', 'Present days', 'Late days', 'Avg worked'],
      ...rows.map((r, i) => [i + 1, r.p.full_name, r.p.employee_code, Math.round(r.s.score), n(r.s.attendancePct), n(r.s.punctualityPct), n(r.s.okrPct), n(r.s.taskPct), r.s.presentDays, r.s.lateDays, fmtMinutes(r.s.avgWorkMinutes)]),
    ]);
  }

  if (ws.loading) return <div className="grid place-items-center py-24"><Spinner /></div>;

  return (
    <div>
      <PageHeader
        title="Performance"
        subtitle={`Score = Attendance ${w.attendance}% · Punctuality ${w.punctuality}% · OKRs ${w.okr}% · Tasks ${w.tasks}%`}
        actions={
          <>
            <Tabs value={days} onChange={setDays} tabs={[{ id: '7', label: '7 days' }, { id: '30', label: '30 days' }, { id: '90', label: '90 days' }]} />
            {me.role !== 'member' && (
              <Button variant="secondary" onClick={exportCsv}>
                <Download size={16} /> CSV
              </Button>
            )}
          </>
        }
      />

      <div className="mb-5 grid gap-5 lg:grid-cols-3">
        <Card title="My score">
          <div className="flex items-center gap-5">
            <Ring value={mine.score} size={110} label={myRank ? `rank ${myRank}` : 'score'} />
            <div className="flex-1 space-y-2 text-xs">
              {(
                [
                  ['Attendance', mine.attendancePct, `${mine.presentDays}/${mine.workingDays} days`],
                  ['Punctuality', mine.punctualityPct, `${mine.lateDays} late`],
                  ['OKRs', mine.okrPct, `${mine.objectives} objectives`],
                  ['Tasks', mine.taskPct, `${mine.tasksDone}/${mine.tasksTotal} done`],
                ] as [string, number | null, string][]
              ).map(([l, v, sub]) => (
                <div key={l}>
                  <div className="flex justify-between text-neutral-500">
                    <span>
                      {l} <span className="text-neutral-400">· {sub}</span>
                    </span>
                    <span className="font-medium text-neutral-700">{n(v)}</span>
                  </div>
                  <Progress value={v ?? 0} />
                </div>
              ))}
            </div>
          </div>
        </Card>
        <Card title="Department averages" className="lg:col-span-2">
          {deptAvg.length ? <HBars data={deptAvg} /> : <p className="text-sm text-neutral-500">No data.</p>}
        </Card>
      </div>

      {me.role !== 'member' && (
        <div className="mb-3 flex justify-end">
          <Select className="w-56" value={dept} onChange={(e) => setDept(e.target.value)}>
            <option value="all">All departments</option>
            {ws.departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </Select>
        </div>
      )}

      <Table head={['#', 'Person', 'Score', 'Attendance', 'Punctuality', 'OKRs', 'Tasks', 'Avg worked']}>
        {rows.map(({ p, s }, i) => (
          <tr key={p.id} className={p.id === me.id ? 'bg-amber-50/50' : ''}>
            <td className={td}>{i + 1}</td>
            <td className={td}>
              {me.role !== 'member' ? (
                <Link href={`/employees/${p.id}`} className="flex items-center gap-2 hover:underline">
                  <Avatar name={p.full_name} size={28} /> {p.full_name}
                </Link>
              ) : (
                <span className="flex items-center gap-2">
                  <Avatar name={p.full_name} size={28} /> {p.full_name}
                </span>
              )}
            </td>
            <td className={td}>
              <Badge tone={scoreTone(s.score)}>{Math.round(s.score)}</Badge>
            </td>
            <td className={`${td} w-36`}>
              <Progress value={s.attendancePct} showLabel />
            </td>
            <td className={`${td} w-36`}>
              <Progress value={s.punctualityPct} showLabel />
            </td>
            <td className={`${td} w-36`}>{s.okrPct === null ? <span className="text-xs text-neutral-400">n/a</span> : <Progress value={s.okrPct} showLabel />}</td>
            <td className={`${td} w-36`}>{s.taskPct === null ? <span className="text-xs text-neutral-400">n/a</span> : <Progress value={s.taskPct} showLabel />}</td>
            <td className={td}>{fmtMinutes(s.avgWorkMinutes)}</td>
          </tr>
        ))}
      </Table>
      <p className="mt-3 text-xs text-neutral-400">Metrics with no data (n/a) are left out and the remaining weights are re-balanced. Approved leave does not count as absence.</p>
    </div>
  );
}
