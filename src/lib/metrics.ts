// All percentages and scores in one place, so the formula is easy to audit and change.
import type { Attendance, BreakRow, BreakType, Holiday, KeyResult, LeaveRequest, Objective, OrgSettings, Profile, Task } from './types';
import { addDays, clamp, minutesBetween, parseDate, toDateStr, todayStr } from './format';

export function krProgress(kr: KeyResult): number {
  if (kr.metric_type === 'boolean') return kr.current_value >= 1 ? 100 : 0;
  const span = kr.target_value - kr.start_value; // negative span = "lower is better"
  if (span === 0) return kr.current_value === kr.target_value ? 100 : 0;
  return clamp(((kr.current_value - kr.start_value) / span) * 100);
}

export function objectiveProgress(krs: KeyResult[]): number {
  if (!krs.length) return 0;
  const tw = krs.reduce((s, k) => s + (k.weight || 1), 0);
  return krs.reduce((s, k) => s + krProgress(k) * (k.weight || 1), 0) / tw;
}

export function krsOf(objectiveId: string, krs: KeyResult[]) {
  return krs.filter((k) => k.objective_id === objectiveId);
}

export function workingDays(from: Date, to: Date, weeklyOff: number[], holidays?: Set<string>): string[] {
  const out: string[] = [];
  const d = new Date(from);
  d.setHours(0, 0, 0, 0);
  const end = new Date(to);
  end.setHours(0, 0, 0, 0);
  while (d <= end) {
    const s = toDateStr(d);
    if (!weeklyOff.includes(d.getDay()) && !holidays?.has(s)) out.push(s);
    d.setDate(d.getDate() + 1);
  }
  return out;
}

export type LiveState = 'not_in' | 'working' | 'on_break' | 'checked_out' | 'on_leave';

export function liveStatus(att?: Attendance, breaks: BreakRow[] = []): { state: LiveState; breakType?: BreakType; since?: string } {
  if (!att || !att.check_in) return { state: 'not_in' };
  if (att.check_out) return { state: 'checked_out', since: att.check_out };
  const open = breaks.find((b) => b.attendance_id === att.id && !b.end_at);
  if (open) return { state: 'on_break', breakType: open.type, since: open.start_at };
  return { state: 'working', since: att.check_in };
}

export function breakMinutes(att: Attendance, breaks: BreakRow[]): number {
  return breaks.filter((b) => b.attendance_id === att.id).reduce((s, b) => s + minutesBetween(b.start_at, b.end_at), 0);
}

export function workedMinutes(att: Attendance, breaks: BreakRow[]): number {
  if (!att.check_in) return 0;
  if (att.check_out) return att.work_minutes;
  return Math.max(0, minutesBetween(att.check_in) - breakMinutes(att, breaks));
}

export interface UserStats {
  workingDays: number;
  presentDays: number;
  lateDays: number;
  halfDays: number;
  attendancePct: number;
  punctualityPct: number;
  okrPct: number | null;
  taskPct: number | null;
  score: number;
  avgWorkMinutes: number;
  tasksDone: number;
  tasksTotal: number;
  objectives: number;
}

function leaveDaysIn(userId: string, leaves: LeaveRequest[], days: Set<string>): number {
  let n = 0;
  for (const l of leaves) {
    if (l.user_id !== userId || l.status !== 'approved') continue;
    let d = parseDate(l.start_date);
    const end = parseDate(l.end_date);
    while (d <= end) {
      if (days.has(toDateStr(d))) n++;
      d = addDays(d, 1);
    }
  }
  return n;
}

export function userStats(
  user: Profile,
  data: { attendance: Attendance[]; objectives: Objective[]; krs: KeyResult[]; tasks: Task[]; leaves?: LeaveRequest[]; holidays?: Holiday[] },
  settings: OrgSettings,
  days = 30,
): UserStats {
  const to = new Date();
  const from = addDays(to, -(days - 1));
  const join = user.join_date ? parseDate(user.join_date) : from;
  const start = join > from ? join : from;
  const startStr = toDateStr(start);
  const today = todayStr();

  const mine = data.attendance.filter((a) => a.user_id === user.id && a.date >= startStr && a.check_in);
  const hasToday = mine.some((a) => a.date === today);
  const hol = new Set((data.holidays ?? []).map((h) => h.date));
  const wdList = workingDays(start, to, settings.weekly_off, hol).filter((d) => d !== today || hasToday);
  const leave = leaveDaysIn(user.id, data.leaves ?? [], new Set(wdList));
  const wd = Math.max(0, wdList.length - leave);

  const halfDays = mine.filter((a) => a.status === 'half_day').length;
  const present = mine.length - halfDays * 0.5;
  const late = mine.filter((a) => a.status === 'late').length;
  const attendancePct = wd ? clamp((present / wd) * 100) : 100;
  const punctualityPct = mine.length ? clamp(((mine.length - late) / mine.length) * 100) : 100;
  const closed = mine.filter((a) => a.check_out);
  const avgWorkMinutes = closed.length ? closed.reduce((s, a) => s + a.work_minutes, 0) / closed.length : 0;

  const objs = data.objectives.filter((o) => o.owner_id === user.id && o.cycle === settings.current_cycle);
  const okrPct = objs.length ? objs.reduce((s, o) => s + objectiveProgress(krsOf(o.id, data.krs)), 0) / objs.length : null;

  const myTasks = data.tasks.filter((t) => t.assignee_id === user.id);
  const done = myTasks.filter((t) => t.status === 'done').length;
  const taskPct = myTasks.length ? (done / myTasks.length) * 100 : null;

  // weighted score; metrics with no data are skipped and weights re-normalised
  const w = settings.performance_weights;
  const parts: [number | null, number][] = [[attendancePct, w.attendance], [punctualityPct, w.punctuality], [okrPct, w.okr], [taskPct, w.tasks]];
  const used = parts.filter(([v, wt]) => v !== null && wt > 0) as [number, number][];
  const tw = used.reduce((s, [, wt]) => s + wt, 0);
  const score = tw ? used.reduce((s, [v, wt]) => s + v * wt, 0) / tw : 0;

  return {
    workingDays: wd, presentDays: present, lateDays: late, halfDays, attendancePct, punctualityPct, okrPct, taskPct,
    score, avgWorkMinutes, tasksDone: done, tasksTotal: myTasks.length, objectives: objs.length,
  };
}

export function scoreTone(v: number): 'green' | 'amber' | 'red' {
  return v >= 75 ? 'green' : v >= 50 ? 'amber' : 'red';
}

/** Consecutive working days checked in on time (today counts once checked in). */
export function onTimeStreak(userId: string, attendance: Attendance[], settings: OrgSettings, holidays: Holiday[] = []): number {
  const hol = new Set(holidays.map((h) => h.date));
  const byDate = new Map(attendance.filter((a) => a.user_id === userId).map((a) => [a.date, a]));
  let d = new Date();
  if (!byDate.has(toDateStr(d))) d = addDays(d, -1);
  let n = 0;
  for (let i = 0; i < 180; i++, d = addDays(d, -1)) {
    const s = toDateStr(d);
    if (settings.weekly_off.includes(d.getDay()) || hol.has(s)) continue;
    const a = byDate.get(s);
    if (!a || a.status !== 'present') break;
    n++;
  }
  return n;
}
