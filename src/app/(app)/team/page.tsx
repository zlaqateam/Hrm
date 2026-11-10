'use client';
import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Coffee, LogOut, Search, UserCheck, UserX, Users } from 'lucide-react';
import { useMe } from '@/lib/auth';
import { useNow } from '@/lib/hooks';
import { useWorkspace } from '@/lib/workspace';
import { fmtMinutes, fmtTime, minutesBetween, todayStr } from '@/lib/format';
import { liveStatus, userStats, workedMinutes, type LiveState } from '@/lib/metrics';
import { managedTeam, visibleTeam } from '@/lib/permissions';
import { Avatar, Card, Input, PageHeader, Progress, Select, Stat, Tabs } from '@/components/ui';
import { LiveBadge } from '@/components/bits';

export default function TeamPage() {
  const { me, settings } = useMe();
  useNow(30000);
  const ws = useWorkspace(30, settings.current_cycle);
  const [dept, setDept] = useState('all');
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState<'all' | LiveState>('all');
  const today = todayStr();

  const base = useMemo(() => (me.role === 'member' ? visibleTeam(me, ws.profiles, settings) : managedTeam(me, ws.profiles)), [me, ws.profiles, settings]);

  const onLeave = new Set(ws.leaves.filter((l) => l.status === 'approved' && l.start_date <= today && l.end_date >= today).map((l) => l.user_id));

  const rows = base
    .filter((p) => (dept === 'all' || p.department_id === dept) && (!q || p.full_name.toLowerCase().includes(q.toLowerCase())))
    .map((p) => {
      const att = ws.attendance.find((a) => a.user_id === p.id && a.date === today);
      let live = liveStatus(att, ws.breaks);
      if (live.state === 'not_in' && onLeave.has(p.id)) live = { state: 'on_leave' };
      const stats = userStats(p, { attendance: ws.attendance, objectives: ws.objectives, krs: ws.krs, tasks: ws.tasks, leaves: ws.leaves, holidays: ws.holidays }, settings, 30);
      return { p, att, live, stats, worked: att ? workedMinutes(att, ws.breaks) : 0 };
    });

  const count = (s: LiveState) => rows.filter((r) => r.live.state === s).length;
  const total = rows.length || 1;
  const shown = filter === 'all' ? rows : rows.filter((r) => r.live.state === filter);
  const deptName = (id: string | null) => ws.departments.find((d) => d.id === id);

  return (
    <div>
      <PageHeader title="Team Tracker" subtitle="Live status and key percentages for every person" />

      <div className="mb-5 grid grid-cols-2 gap-4 md:grid-cols-5">
        <Stat label="People" value={rows.length} icon={<Users size={16} />} />
        <Stat label="Working" value={count('working')} sub={`${Math.round((count('working') / total) * 100)}%`} icon={<UserCheck size={16} />} tone="green" />
        <Stat label="On break" value={count('on_break')} sub={`${Math.round((count('on_break') / total) * 100)}%`} icon={<Coffee size={16} />} tone="amber" />
        <Stat label="Checked out" value={count('checked_out')} sub={`${Math.round((count('checked_out') / total) * 100)}%`} icon={<LogOut size={16} />} />
        <Stat label="Not in / leave" value={count('not_in') + count('on_leave')} sub={`${Math.round(((count('not_in') + count('on_leave')) / total) * 100)}%`} icon={<UserX size={16} />} tone="red" />
      </div>

      <div className="mb-5 flex flex-wrap items-center gap-3">
        <Tabs
          value={filter}
          onChange={setFilter}
          tabs={[
            { id: 'all', label: 'All' },
            { id: 'working', label: 'Working' },
            { id: 'on_break', label: 'On break' },
            { id: 'checked_out', label: 'Out' },
            { id: 'not_in', label: 'Not in' },
          ]}
        />
        <div className="relative">
          <Search size={15} className="absolute left-3 top-2.5 text-neutral-400" />
          <Input className="w-56 pl-9" placeholder="Search people" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        {me.role !== 'member' && (
          <Select className="w-52" value={dept} onChange={(e) => setDept(e.target.value)}>
            <option value="all">All departments</option>
            {ws.departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </Select>
        )}
      </div>

      <div className="stagger grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {shown.map(({ p, att, live, stats, worked }) => {
          const d = deptName(p.department_id);
          const card = (
            <Card interactive className="h-full">
              <div className="flex items-start gap-3">
                <Avatar name={p.full_name} size={42} />
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium">{p.full_name}</div>
                  <div className="truncate text-xs text-neutral-500">
                    {p.designation}
                    {d && (
                      <>
                        {' · '}
                        <span style={{ color: d.color }}>{d.name}</span>
                      </>
                    )}
                  </div>
                </div>
                <LiveBadge state={live.state} breakType={live.breakType} />
              </div>
              {att?.plan && <p className="mt-3 line-clamp-1 text-xs text-neutral-600">🎯 {att.plan}</p>}
              <div className="mt-4 grid grid-cols-3 gap-2 rounded-xl bg-neutral-50 p-3 text-center text-xs">
                <div>
                  <div className="text-neutral-500">In</div>
                  <div className="font-semibold">{fmtTime(att?.check_in)}</div>
                </div>
                <div>
                  <div className="text-neutral-500">{live.state === 'on_break' ? 'Break' : 'Worked'}</div>
                  <div className="font-semibold">{live.state === 'on_break' && live.since ? fmtMinutes(minutesBetween(live.since)) : att ? fmtMinutes(worked) : '—'}</div>
                </div>
                <div>
                  <div className="text-neutral-500">Score</div>
                  <div className="font-semibold">{Math.round(stats.score)}%</div>
                </div>
              </div>
              <div className="mt-3 space-y-2 text-xs">
                <Metric label="Attendance (30d)" v={stats.attendancePct} />
                <Metric label="Punctuality" v={stats.punctualityPct} />
                <Metric label="OKR progress" v={stats.okrPct} />
              </div>
            </Card>
          );
          return me.role === 'member' ? (
            <div key={p.id}>{card}</div>
          ) : (
            <Link key={p.id} href={`/employees/${p.id}`}>
              {card}
            </Link>
          );
        })}
      </div>
    </div>
  );
}

function Metric({ label, v }: { label: string; v: number | null }) {
  return (
    <div>
      <div className="mb-0.5 flex justify-between text-neutral-500">
        <span>{label}</span>
        <span className="tabular-nums">{v === null ? 'n/a' : `${Math.round(v)}%`}</span>
      </div>
      <Progress value={v ?? 0} />
    </div>
  );
}
