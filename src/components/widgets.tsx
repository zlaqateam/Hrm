'use client';
// Dashboard widgets. Each widget is self-contained; Super Admin picks which ones
// appear per role (Settings > Dashboards) or per department (Departments).
import Link from 'next/link';
import { CalendarDays, CalendarRange, Clock, Coffee, Heart, Lightbulb, PartyPopper, Percent, Sparkles, Target, TriangleAlert, UserCheck, Users, CircleCheck, Flame } from 'lucide-react';
import type { Announcement, OrgSettings, Profile, WidgetId } from '@/lib/types';
import type { Workspace } from '@/lib/workspace';
import { MOODS, addDays, fmtDate, fmtMinutes, fmtTime, parseDate, timeAgo, toDateStr, todayStr } from '@/lib/format';
import { firstName } from '@/lib/notify';
import { krsOf, liveStatus, objectiveProgress, onTimeStreak, userStats, workedMinutes, workingDays } from '@/lib/metrics';
import { useNow } from '@/lib/hooks';
import { Avatar, Badge, Button, Card, Empty, Progress, Stat, cn, toneClass, type Tone } from './ui';
import { Bars, LiveBadge, OkrStatusBadge, Ring } from './bits';

export interface DashCtx {
  me: Profile;
  settings: OrgSettings;
  ws: Workspace;
  team: Profile[]; // people this user oversees / can see
  announcements: Announcement[];
}

const SPAN: Partial<Record<WidgetId, string>> = {
  welcome: 'md:col-span-2 xl:col-span-3',
  org_stats: 'md:col-span-2 xl:col-span-3',
  attendance_trend: 'md:col-span-2',
  dept_breakdown: 'md:col-span-2',
  insights: 'md:col-span-2',
};

export function Widget({ id, ctx }: { id: WidgetId; ctx: DashCtx }) {
  const C = REGISTRY[id];
  if (!C) return null;
  return (
    <div className={SPAN[id] ?? ''}>
      <C ctx={ctx} />
    </div>
  );
}

const REGISTRY: Record<WidgetId, (p: { ctx: DashCtx }) => React.ReactNode> = {
  welcome: Welcome,
  my_shift: MyShift,
  org_stats: OrgStats,
  team_status: TeamStatus,
  attendance_trend: AttendanceTrend,
  okr_progress: OkrProgress,
  my_okrs: MyOkrs,
  leaderboard: Leaderboard,
  dept_breakdown: DeptBreakdown,
  announcements: Announcements,
  my_tasks: MyTasks,
  leave_pending: LeavePending,
  my_performance: MyPerformance,
  insights: Insights,
  team_pulse: TeamPulse,
  standup: Standup,
  kudos: KudosWidget,
  celebrations: Celebrations,
};

function Welcome({ ctx }: { ctx: DashCtx }) {
  const now = useNow(30000);
  const h = new Date(now).getHours();
  const greet = h < 5 ? 'Working late' : h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
  const att = ctx.ws.attendance.find((a) => a.user_id === ctx.me.id && a.date === todayStr());
  const streak = onTimeStreak(ctx.me.id, ctx.ws.attendance, ctx.settings, ctx.ws.holidays);
  const m = ctx.settings.modules;
  const actions = [
    { href: '/attendance', label: att ? (att.check_out ? 'Day summary' : 'Breaks & check-out') : 'Check in', icon: Clock, show: true },
    { href: '/kudos?new=1', label: 'Send kudos', icon: Heart, show: m.kudos !== false },
    { href: '/leave?new=1', label: 'Apply leave', icon: CalendarDays, show: m.leave !== false },
    { href: '/calendar', label: 'Calendar', icon: CalendarRange, show: m.calendar !== false },
  ].filter((a) => a.show);
  return (
    <div className="relative overflow-hidden rounded-3xl bg-brand p-6 text-on-brand shadow-sm sm:p-8">
      <div className="pointer-events-none absolute -right-16 -top-20 h-64 w-64 animate-float rounded-full bg-emerald-400/25 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 right-40 h-56 w-56 animate-float rounded-full bg-violet-400/25 blur-3xl [animation-delay:-6s]" />
      <div className="relative flex flex-wrap items-end justify-between gap-6">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-on-brand/60">{ctx.settings.company_name}</p>
          <h2 className="mt-2 text-2xl font-semibold sm:text-4xl">
            {greet}, {firstName(ctx.me.full_name)}
          </h2>
          <p className="mt-1 text-on-brand/70">
            {new Date(now).toLocaleDateString([], { weekday: 'long', day: 'numeric', month: 'long' })} · {ctx.settings.tagline}
          </p>
          {streak > 1 && (
            <p className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-on-brand/10 px-3 py-1 text-xs font-medium">
              <Flame size={14} className="text-amber-400" /> {streak}-day on-time streak
            </p>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          {actions.map((a) => (
            <Link key={a.href} href={a.href} className="flex items-center gap-2 rounded-xl bg-on-brand/10 px-3.5 py-2 text-sm font-medium backdrop-blur transition hover:bg-on-brand/20 active:scale-95">
              <a.icon size={15} /> {a.label}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

function MyShift({ ctx }: { ctx: DashCtx }) {
  useNow(30000);
  const att = ctx.ws.attendance.find((a) => a.user_id === ctx.me.id && a.date === todayStr());
  const live = liveStatus(att, ctx.ws.breaks);
  return (
    <Card title="My shift today" action={<LiveBadge state={live.state} breakType={live.breakType} />}>
      {att ? (
        <div className="grid grid-cols-3 gap-3 text-center">
          <div>
            <div className="text-xs text-neutral-500">Check-in</div>
            <div className="text-lg font-semibold">{fmtTime(att.check_in)}</div>
          </div>
          <div>
            <div className="text-xs text-neutral-500">Worked</div>
            <div className="text-lg font-semibold">{fmtMinutes(workedMinutes(att, ctx.ws.breaks))}</div>
          </div>
          <div>
            <div className="text-xs text-neutral-500">Check-out</div>
            <div className="text-lg font-semibold">{fmtTime(att.check_out)}</div>
          </div>
        </div>
      ) : (
        <p className="text-sm text-neutral-500">You haven&apos;t checked in yet. Shift starts at {ctx.settings.work_start}.</p>
      )}
      <Link href="/attendance">
        <Button className="mt-4 w-full">{att ? (att.check_out ? 'View attendance' : 'Breaks & check-out') : 'Check in now'}</Button>
      </Link>
    </Card>
  );
}

function OrgStats({ ctx }: { ctx: DashCtx }) {
  const today = todayStr();
  const ids = new Set(ctx.team.map((p) => p.id));
  const todays = ctx.ws.attendance.filter((a) => a.date === today && ids.has(a.user_id));
  const onBreak = todays.filter((a) => liveStatus(a, ctx.ws.breaks).state === 'on_break').length;
  const late = todays.filter((a) => a.status === 'late').length;
  const objs = ctx.ws.objectives.filter((o) => o.owner_id && ids.has(o.owner_id));
  const okr = objs.length ? objs.reduce((s, o) => s + objectiveProgress(krsOf(o.id, ctx.ws.krs)), 0) / objs.length : 0;
  const presentPct = ctx.team.length ? (todays.length / ctx.team.length) * 100 : 0;
  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
      <Stat label="Headcount" value={ctx.team.length} icon={<Users size={16} />} />
      <Stat label="Present today" value={`${Math.round(presentPct)}%`} sub={`${todays.length} checked in`} icon={<UserCheck size={16} />} tone="green" />
      <Stat label="On break now" value={onBreak} icon={<Coffee size={16} />} tone="amber" />
      <Stat label="Late today" value={late} icon={<Clock size={16} />} tone="red" />
      <Stat label="Avg OKR progress" value={`${Math.round(okr)}%`} sub={ctx.settings.current_cycle} icon={<Target size={16} />} tone="violet" />
    </div>
  );
}

function TeamStatus({ ctx }: { ctx: DashCtx }) {
  useNow(30000);
  const today = todayStr();
  const order = { working: 0, on_break: 1, checked_out: 2, not_in: 3, on_leave: 4 };
  const rows = ctx.team
    .map((p) => {
      const att = ctx.ws.attendance.find((a) => a.user_id === p.id && a.date === today);
      return { p, att, live: liveStatus(att, ctx.ws.breaks) };
    })
    .sort((a, b) => order[a.live.state] - order[b.live.state]);
  return (
    <Card title="Live team status" action={<Link href="/team" className="text-xs text-neutral-500 hover:underline">Open tracker</Link>}>
      <div className="max-h-80 space-y-2 overflow-y-auto pr-1">
        {rows.map(({ p, att, live }) => (
          <div key={p.id} className="flex items-center gap-3">
            <Avatar name={p.full_name} size={30} />
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium">{p.full_name}</div>
              <div className="text-xs text-neutral-500">{att ? `In ${fmtTime(att.check_in)}` : p.designation}</div>
            </div>
            <LiveBadge state={live.state} breakType={live.breakType} />
          </div>
        ))}
      </div>
    </Card>
  );
}

function AttendanceTrend({ ctx }: { ctx: DashCtx }) {
  const days = workingDays(addDays(new Date(), -20), new Date(), ctx.settings.weekly_off).slice(-14);
  const ids = new Set(ctx.team.map((p) => p.id));
  const data = days.map((d) => {
    const n = ctx.ws.attendance.filter((a) => a.date === d && ids.has(a.user_id) && a.check_in).length;
    return { label: d, short: d.slice(8), value: ctx.team.length ? (n / ctx.team.length) * 100 : 0 };
  });
  const avg = data.length ? data.reduce((s, d) => s + d.value, 0) / data.length : 0;
  return (
    <Card title="Attendance · last 14 working days" action={<Badge tone="green">avg {Math.round(avg)}%</Badge>}>
      <Bars data={data} />
    </Card>
  );
}

function OkrProgress({ ctx }: { ctx: DashCtx }) {
  const ids = new Set(ctx.team.map((p) => p.id));
  const objs = ctx.ws.objectives
    .filter((o) => o.level === 'company' || o.level === 'department' || (o.owner_id && ids.has(o.owner_id)))
    .sort((a, b) => (a.level > b.level ? 1 : -1))
    .slice(0, 7);
  return (
    <Card title={`OKR progress · ${ctx.settings.current_cycle}`} action={<Link href="/okrs" className="text-xs text-neutral-500 hover:underline">All OKRs</Link>}>
      {objs.length ? (
        <div className="space-y-3">
          {objs.map((o) => (
            <div key={o.id}>
              <div className="mb-1 flex items-center justify-between gap-2">
                <span className="truncate text-sm font-medium">{o.title}</span>
                <Badge tone={o.level === 'company' ? 'brand' : 'neutral'}>{o.level}</Badge>
              </div>
              <Progress value={objectiveProgress(krsOf(o.id, ctx.ws.krs))} showLabel />
            </div>
          ))}
        </div>
      ) : (
        <Empty text="No OKRs this cycle yet." />
      )}
    </Card>
  );
}

function MyOkrs({ ctx }: { ctx: DashCtx }) {
  const objs = ctx.ws.objectives.filter((o) => o.owner_id === ctx.me.id);
  return (
    <Card title="My OKRs" action={<Link href="/okrs" className="text-xs text-neutral-500 hover:underline">Update</Link>}>
      {objs.length ? (
        <div className="space-y-4">
          {objs.map((o) => (
            <div key={o.id}>
              <div className="mb-1 flex items-center justify-between gap-2">
                <span className="text-sm font-medium">{o.title}</span>
                <OkrStatusBadge status={o.status} />
              </div>
              <Progress value={objectiveProgress(krsOf(o.id, ctx.ws.krs))} showLabel />
            </div>
          ))}
        </div>
      ) : (
        <Empty text="No objectives assigned for this cycle." />
      )}
    </Card>
  );
}

function Leaderboard({ ctx }: { ctx: DashCtx }) {
  const rows = ctx.team
    .map((p) => ({ p, s: userStats(p, { attendance: ctx.ws.attendance, objectives: ctx.ws.objectives, krs: ctx.ws.krs, tasks: ctx.ws.tasks, leaves: ctx.ws.leaves }, ctx.settings, 30) }))
    .sort((a, b) => b.s.score - a.s.score)
    .slice(0, 6);
  return (
    <Card title="Leaderboard · 30 days" action={<Link href="/performance" className="text-xs text-neutral-500 hover:underline">Details</Link>}>
      <div className="space-y-2.5">
        {rows.map(({ p, s }, i) => (
          <div key={p.id} className="flex items-center gap-3">
            <span className="w-5 text-center text-xs font-semibold text-neutral-400">{i + 1}</span>
            <Avatar name={p.full_name} size={28} />
            <span className="min-w-0 flex-1 truncate text-sm">{p.full_name}</span>
            <span className="text-sm font-semibold tabular-nums">{Math.round(s.score)}</span>
          </div>
        ))}
      </div>
    </Card>
  );
}

function DeptBreakdown({ ctx }: { ctx: DashCtx }) {
  const today = todayStr();
  return (
    <Card title="Departments">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-xs text-neutral-500">
            <tr>
              <th className="pb-2 font-medium">Department</th>
              <th className="pb-2 font-medium">People</th>
              <th className="pb-2 font-medium">Present</th>
              <th className="pb-2 font-medium">OKR avg</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {ctx.ws.departments.map((d) => {
              const people = ctx.team.filter((p) => p.department_id === d.id);
              const ids = new Set(people.map((p) => p.id));
              const present = ctx.ws.attendance.filter((a) => a.date === today && ids.has(a.user_id)).length;
              const objs = ctx.ws.objectives.filter((o) => o.owner_id && ids.has(o.owner_id));
              const okr = objs.length ? objs.reduce((s, o) => s + objectiveProgress(krsOf(o.id, ctx.ws.krs)), 0) / objs.length : 0;
              return (
                <tr key={d.id}>
                  <td className="py-2">
                    <span className="mr-2 inline-block h-2.5 w-2.5 rounded-full" style={{ background: d.color }} />
                    {d.name}
                  </td>
                  <td className="py-2 tabular-nums">{people.length}</td>
                  <td className="w-32 py-2">
                    <Progress value={people.length ? (present / people.length) * 100 : 0} showLabel />
                  </td>
                  <td className="w-32 py-2">
                    <Progress value={okr} showLabel />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function Announcements({ ctx }: { ctx: DashCtx }) {
  const list = ctx.announcements.slice(0, 3);
  return (
    <Card title="Announcements" action={<Link href="/announcements" className="text-xs text-neutral-500 hover:underline">All</Link>}>
      {list.length ? (
        <div className="space-y-3">
          {list.map((a) => (
            <div key={a.id} className="rounded-xl bg-neutral-50 p-3">
              <div className="flex items-center gap-2 text-sm font-medium">
                {a.pinned && <Badge tone="amber">Pinned</Badge>}
                {a.title}
              </div>
              <p className="mt-1 line-clamp-2 text-xs text-neutral-600">{a.body}</p>
            </div>
          ))}
        </div>
      ) : (
        <Empty text="Nothing new." />
      )}
    </Card>
  );
}

function MyTasks({ ctx }: { ctx: DashCtx }) {
  const list = ctx.ws.tasks.filter((t) => t.assignee_id === ctx.me.id && t.status !== 'done').slice(0, 6);
  return (
    <Card title="My open tasks" action={<Link href="/tasks" className="text-xs text-neutral-500 hover:underline">Board</Link>}>
      {list.length ? (
        <div className="space-y-2">
          {list.map((t) => (
            <div key={t.id} className="flex items-center justify-between gap-2 rounded-xl border border-neutral-100 px-3 py-2">
              <span className="truncate text-sm">{t.title}</span>
              <Badge tone={t.priority === 'high' ? 'red' : t.priority === 'medium' ? 'amber' : 'neutral'}>{fmtDate(t.due_date)}</Badge>
            </div>
          ))}
        </div>
      ) : (
        <Empty text="All clear 🎉" />
      )}
    </Card>
  );
}

function LeavePending({ ctx }: { ctx: DashCtx }) {
  const isMgr = ctx.me.role !== 'member';
  const ids = new Set(ctx.team.map((p) => p.id));
  const list = ctx.ws.leaves.filter((l) => l.status === 'pending' && (isMgr ? ids.has(l.user_id) && l.user_id !== ctx.me.id : l.user_id === ctx.me.id));
  const name = (id: string) => ctx.ws.profiles.find((p) => p.id === id)?.full_name ?? '—';
  return (
    <Card title={isMgr ? 'Leave awaiting approval' : 'My pending leave'} action={<Link href="/leave" className="text-xs text-neutral-500 hover:underline">Open</Link>}>
      {list.length ? (
        <div className="space-y-2">
          {list.slice(0, 5).map((l) => (
            <div key={l.id} className="flex items-center justify-between gap-2 text-sm">
              <span className="truncate">{isMgr ? name(l.user_id) : l.type}</span>
              <span className="text-xs text-neutral-500">
                {fmtDate(l.start_date)} · {l.days}d
              </span>
            </div>
          ))}
        </div>
      ) : (
        <Empty text="No pending requests." />
      )}
    </Card>
  );
}

function MyPerformance({ ctx }: { ctx: DashCtx }) {
  const s = userStats(ctx.me, { attendance: ctx.ws.attendance, objectives: ctx.ws.objectives, krs: ctx.ws.krs, tasks: ctx.ws.tasks, leaves: ctx.ws.leaves }, ctx.settings, 30);
  const rows: [string, number | null][] = [
    ['Attendance', s.attendancePct],
    ['Punctuality', s.punctualityPct],
    ['OKRs', s.okrPct],
    ['Tasks', s.taskPct],
  ];
  return (
    <Card title="My performance · 30 days" action={<Percent size={14} className="text-neutral-400" />}>
      <div className="flex items-center gap-5">
        <Ring value={s.score} label="score" />
        <div className="flex-1 space-y-2">
          {rows.map(([l, v]) => (
            <div key={l}>
              <div className="flex justify-between text-xs text-neutral-500">
                <span>{l}</span>
                <span>{v === null ? 'n/a' : `${Math.round(v)}%`}</span>
              </div>
              <Progress value={v ?? 0} />
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}

// ---------------- new widgets ----------------

interface Insight {
  tone: Tone;
  icon: typeof Sparkles;
  title: string;
  detail: string;
  href?: string;
}

function buildInsights(ctx: DashCtx): Insight[] {
  const out: Insight[] = [];
  const team = ctx.team.filter((p) => p.id !== ctx.me.id || ctx.me.role === 'super_admin');
  const ids = new Set(team.map((p) => p.id));
  const name = (id: string) => firstName(ctx.ws.profiles.find((p) => p.id === id)?.full_name);
  const today = todayStr();
  const weekAgo = toDateStr(addDays(new Date(), -7));
  const recent = ctx.ws.attendance.filter((a) => ids.has(a.user_id) && a.date >= weekAgo);

  const late = new Map<string, number>();
  recent.filter((a) => a.status === 'late').forEach((a) => late.set(a.user_id, (late.get(a.user_id) ?? 0) + 1));
  const frequent = [...late.entries()].filter(([, n]) => n >= 2).sort((a, b) => b[1] - a[1]);
  if (frequent.length)
    out.push({ tone: 'amber', icon: Clock, title: `${frequent.length} ${frequent.length === 1 ? 'person' : 'people'} late 2+ times this week`, detail: frequent.slice(0, 4).map(([id, n]) => `${name(id)} (${n})`).join(', '), href: '/attendance/records' });

  const missing = recent.filter((a) => a.date < today && !a.check_out);
  if (missing.length) out.push({ tone: 'red', icon: TriangleAlert, title: `${missing.length} missing check-out${missing.length > 1 ? 's' : ''}`, detail: 'Correct them in Attendance Records so hours stay accurate.', href: '/attendance/records' });

  const limit = ctx.settings.break_limits.tea * ctx.settings.max_tea_breaks + ctx.settings.break_limits.lunch;
  const avgBreak = new Map<string, number[]>();
  recent.filter((a) => a.check_out).forEach((a) => avgBreak.set(a.user_id, [...(avgBreak.get(a.user_id) ?? []), a.break_minutes]));
  const over = [...avgBreak.entries()].filter(([, l]) => l.reduce((s, x) => s + x, 0) / l.length > limit + 10);
  if (over.length) out.push({ tone: 'amber', icon: Coffee, title: `Long breaks: ${over.length} ${over.length === 1 ? 'person' : 'people'}`, detail: `Averaging over ${limit + 10} min/day: ${over.slice(0, 4).map(([id]) => name(id)).join(', ')}` });

  const risky = ctx.ws.objectives.filter((o) => o.owner_id && ids.has(o.owner_id) && o.status !== 'done' && (objectiveProgress(krsOf(o.id, ctx.ws.krs)) < 30 || o.status === 'off_track' || o.status === 'at_risk'));
  if (risky.length) out.push({ tone: 'red', icon: Target, title: `${risky.length} OKR${risky.length > 1 ? 's' : ''} need attention`, detail: risky.slice(0, 2).map((o) => o.title).join(' · '), href: '/okrs' });

  const pending = ctx.ws.leaves.filter((l) => l.status === 'pending' && ids.has(l.user_id) && l.user_id !== ctx.me.id);
  if (pending.length && ctx.me.role !== 'member') out.push({ tone: 'violet', icon: CalendarDays, title: `${pending.length} leave request${pending.length > 1 ? 's' : ''} waiting for you`, detail: pending.slice(0, 3).map((l) => name(l.user_id)).join(', '), href: '/leave' });

  const perfect = team.filter((p) => {
    const mine = recent.filter((a) => a.user_id === p.id);
    return mine.length >= 4 && mine.every((a) => a.status === 'present');
  });
  if (perfect.length) out.push({ tone: 'green', icon: Sparkles, title: `${perfect.length} on time every day this week`, detail: `${perfect.slice(0, 5).map((p) => firstName(p.full_name)).join(', ')}. Worth a kudos?`, href: '/kudos?new=1' });

  if (!out.length) out.push({ tone: 'green', icon: CircleCheck, title: 'All good', detail: 'No attendance, break or OKR issues detected this week.' });
  return out;
}

function Insights({ ctx }: { ctx: DashCtx }) {
  const list = buildInsights(ctx);
  return (
    <Card title={<><Lightbulb size={15} className="text-amber-500" /> Smart insights</>} action={<Badge>last 7 days</Badge>}>
      <div className="stagger grid gap-2 sm:grid-cols-2">
        {list.map((i) => {
          const body = (
            <div className="flex h-full gap-3 rounded-xl border border-neutral-100 p-3 transition hover:border-neutral-300">
              <span className={cn('grid h-9 w-9 shrink-0 place-items-center rounded-xl', toneClass(i.tone))}>
                <i.icon size={16} />
              </span>
              <div className="min-w-0">
                <div className="text-sm font-medium">{i.title}</div>
                <div className="text-xs text-neutral-500">{i.detail}</div>
              </div>
            </div>
          );
          return i.href ? <Link key={i.title} href={i.href}>{body}</Link> : <div key={i.title}>{body}</div>;
        })}
      </div>
    </Card>
  );
}

function TeamPulse({ ctx }: { ctx: DashCtx }) {
  const ids = new Set(ctx.team.map((p) => p.id));
  const days = workingDays(addDays(new Date(), -12), new Date(), ctx.settings.weekly_off).slice(-7);
  const avg = (d: string) => {
    const m = ctx.ws.attendance.filter((a) => a.date === d && ids.has(a.user_id) && a.mood).map((a) => a.mood as number);
    return m.length ? m.reduce((s, x) => s + x, 0) / m.length : 0;
  };
  const today = todayStr();
  const todayMoods = ctx.ws.attendance.filter((a) => a.date === today && ids.has(a.user_id) && a.mood);
  const t = avg(today);
  return (
    <Card title={<><Heart size={15} className="text-pink-500" /> Team pulse</>} action={<Badge>{todayMoods.length}/{ctx.team.length} shared today</Badge>}>
      <div className="flex items-center gap-4">
        <div className="text-5xl">{t ? MOODS[Math.round(t) - 1] : '·'}</div>
        <div>
          <div className="text-2xl font-semibold tabular-nums">{t ? t.toFixed(1) : '—'}<span className="text-sm text-neutral-400"> / 5</span></div>
          <div className="text-xs text-neutral-500">Average mood today. Individual answers stay private.</div>
        </div>
      </div>
      <div className="mt-4">
        <Bars data={days.map((d) => ({ label: d, short: parseDate(d).toLocaleDateString([], { weekday: 'narrow' }), value: avg(d) * 20 }))} height={90} suffix="" />
      </div>
    </Card>
  );
}

function Standup({ ctx }: { ctx: DashCtx }) {
  const ids = new Set(ctx.team.map((p) => p.id));
  const today = todayStr();
  const rows = ctx.ws.attendance.filter((a) => a.date === today && ids.has(a.user_id) && (a.plan || a.summary));
  const name = (id: string) => ctx.ws.profiles.find((p) => p.id === id)?.full_name;
  return (
    <Card title={<><Target size={15} className="text-violet-500" /> Daily standup</>} action={<Badge>{rows.length} shared</Badge>}>
      {rows.length ? (
        <div className="stagger max-h-80 space-y-3 overflow-y-auto pr-1">
          {rows.map((a) => (
            <div key={a.id} className="flex gap-3">
              <Avatar name={name(a.user_id)} size={30} />
              <div className="min-w-0">
                <div className="text-sm font-medium">{name(a.user_id)}</div>
                {a.plan && <div className="text-xs text-neutral-600">🎯 {a.plan}</div>}
                {a.summary && <div className="text-xs text-emerald-700">✅ {a.summary}</div>}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <Empty text="No plans shared yet today." />
      )}
    </Card>
  );
}

function KudosWidget({ ctx }: { ctx: DashCtx }) {
  const name = (id: string) => ctx.ws.profiles.find((p) => p.id === id)?.full_name;
  const list = ctx.ws.kudos.slice(0, 4);
  return (
    <Card title={<><Heart size={15} className="text-pink-500" /> Kudos</>} action={<Link href="/kudos?new=1" className="text-xs font-medium text-neutral-500 hover:underline">Send</Link>}>
      {list.length ? (
        <div className="stagger space-y-3">
          {list.map((k) => (
            <div key={k.id} className="rounded-xl bg-gradient-to-br from-pink-50 to-amber-50 p-3 dark:from-pink-500/10 dark:to-amber-500/10">
              <div className="flex items-center gap-1.5 text-xs">
                <Avatar name={name(k.from_id)} size={20} />
                <span className="font-medium">{firstName(name(k.from_id))}</span>
                <span className="text-neutral-400">→</span>
                <Avatar name={name(k.to_id)} size={20} />
                <span className="font-medium">{firstName(name(k.to_id))}</span>
                <Badge tone="pink" className="ml-auto">{k.value}</Badge>
              </div>
              <p className="mt-1.5 line-clamp-2 text-xs text-neutral-700">{k.message}</p>
              <div className="mt-1 text-[10px] text-neutral-400">{timeAgo(k.created_at)}</div>
            </div>
          ))}
        </div>
      ) : (
        <Empty text="No kudos yet. Be the first!" />
      )}
    </Card>
  );
}

function Celebrations({ ctx }: { ctx: DashCtx }) {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const soon = addDays(now, 30);
  const anniversaries = ctx.ws.profiles
    .filter((p) => p.status === 'active' && p.join_date)
    .map((p) => {
      const j = parseDate(p.join_date);
      const next = new Date(now.getFullYear(), j.getMonth(), j.getDate());
      if (next < now) next.setFullYear(now.getFullYear() + 1);
      return { p, next, years: next.getFullYear() - j.getFullYear() };
    })
    .filter((x) => x.years >= 1 && x.next <= soon)
    .sort((a, b) => a.next.getTime() - b.next.getTime());
  const holidays = ctx.ws.holidays.filter((h) => h.date >= toDateStr(now) && h.date <= toDateStr(addDays(now, 45)));
  return (
    <Card title={<><PartyPopper size={15} className="text-amber-500" /> Celebrations</>}>
      <div className="space-y-2">
        {anniversaries.map(({ p, next, years }) => (
          <div key={p.id} className="flex items-center gap-3 rounded-xl bg-amber-50 p-2.5">
            <Avatar name={p.full_name} size={30} />
            <div className="min-w-0 flex-1 text-sm">
              <div className="truncate font-medium">{p.full_name}</div>
              <div className="text-xs text-neutral-500">
                {years} year{years > 1 ? 's' : ''} at {ctx.settings.company_name} · {fmtDate(toDateStr(next))}
              </div>
            </div>
            <span className="text-lg">🎉</span>
          </div>
        ))}
        {holidays.map((h) => (
          <div key={h.id} className="flex items-center gap-3 rounded-xl bg-teal-50 p-2.5 text-sm">
            <span className="grid h-[30px] w-[30px] place-items-center rounded-full bg-teal-500/15 text-teal-700">
              <CalendarDays size={15} />
            </span>
            <div className="flex-1">
              <div className="font-medium">{h.name}</div>
              <div className="text-xs text-neutral-500">Holiday · {fmtDate(h.date)}</div>
            </div>
          </div>
        ))}
        {!anniversaries.length && !holidays.length && <Empty text="Nothing in the next 30 days." />}
      </div>
    </Card>
  );
}

export function pickWidgets(me: Profile, settings: OrgSettings, deptWidgets: WidgetId[] | null | undefined): WidgetId[] {
  if (me.role !== 'super_admin' && deptWidgets && deptWidgets.length) return deptWidgets;
  return settings.dashboard_widgets[me.role] ?? [];
}

export const sinceStr = (days: number) => toDateStr(addDays(new Date(), -days));
