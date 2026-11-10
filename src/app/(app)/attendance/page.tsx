'use client';
import { useMemo, useState } from 'react';
import { Camera, Coffee, Flame, LogIn, LogOut, MapPin, Play, User, Utensils } from 'lucide-react';
import { useMe } from '@/lib/auth';
import { db } from '@/lib/data';
import { useNow, useTable } from '@/lib/hooks';
import { useToast } from '@/lib/toast';
import { buzz, confetti } from '@/lib/delight';
import {
  MOODS, distanceMeters, errMsg, fmtClock, fmtDay, fmtDistance, fmtMinutes, fmtTime, minutesBetween, startOfToday, timeOnDate, todayStr,
} from '@/lib/format';
import { breakMinutes, liveStatus, onTimeStreak, workedMinutes } from '@/lib/metrics';
import { BREAK_LABEL, type BreakType } from '@/lib/types';
import { Badge, Button, Card, ErrorNote, Field, Modal, PageHeader, Table, Textarea, cn, td } from '@/components/ui';
import { AttendanceBadge, LiveBadge, Ring, SelfieImg } from '@/components/bits';
import { SelfieCamera } from '@/components/SelfieCamera';

const BREAK_ICON: Record<BreakType, typeof Coffee> = { tea: Coffee, lunch: Utensils, personal: User };
const MOOD_LABEL = ['Rough', 'Meh', 'Okay', 'Good', 'Great'];

export default function AttendancePage() {
  const { me, settings } = useMe();
  const toast = useToast();
  const today = todayStr();
  const todayIso = useMemo(() => startOfToday().toISOString(), []);
  const att = useTable('attendance', { filter: { user_id: me.id }, order: ['date', 'desc'], limit: 90 });
  const brk = useTable('breaks', { filter: { user_id: me.id }, gte: ['start_at', todayIso] });
  const holidays = useTable('holidays');
  const rec = att.rows.find((a) => a.date === today);
  const breaks = brk.rows.filter((b) => rec && b.attendance_id === rec.id).sort((a, b) => a.start_at.localeCompare(b.start_at));
  const live = liveStatus(rec, breaks);
  const now = useNow(1000);
  const streak = onTimeStreak(me.id, att.rows, settings, holidays.rows);
  const holidayToday = holidays.rows.find((h) => h.date === today);

  const [step, setStep] = useState<null | 'start' | 'wrap'>(null);
  const [camera, setCamera] = useState<null | 'in' | 'out'>(null);
  const [mood, setMood] = useState<number | null>(null);
  const [plan, setPlan] = useState('');
  const [summary, setSummary] = useState('');
  const [loc, setLoc] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [zoom, setZoom] = useState('');

  const openBreak = breaks.find((b) => !b.end_at);
  const teaUsed = breaks.filter((b) => b.type === 'tea').length;
  const used = (t: BreakType) => breaks.filter((b) => b.type === t).reduce((s, b) => s + minutesBetween(b.start_at, b.end_at), 0);

  async function location(): Promise<string | null> {
    if (!settings.capture_location && settings.geofence_mode === 'off') return null;
    if (typeof navigator === 'undefined' || !navigator.geolocation) return null;
    return new Promise((res) =>
      navigator.geolocation.getCurrentPosition(
        (p) => res(`${p.coords.latitude.toFixed(5)},${p.coords.longitude.toFixed(5)}`),
        () => res(null),
        { timeout: 7000, maximumAge: 60000, enableHighAccuracy: true },
      ),
    );
  }

  /** Geofence check. Returns a warning string (flag mode) or throws (block mode). */
  function checkFence(l: string | null): string | null {
    if (settings.geofence_mode === 'off' || settings.office_lat == null) return null;
    const d = distanceMeters(l, settings.office_lat, settings.office_lng);
    if (d === null) {
      if (settings.geofence_mode === 'block') throw new Error('Location is required to check in. Allow location access and try again.');
      return 'Location unavailable';
    }
    if (d > settings.office_radius_m) {
      if (settings.geofence_mode === 'block') throw new Error(`You're ${fmtDistance(d)} from the office. Check-in is only allowed within ${settings.office_radius_m} m.`);
      return `Outside office (${fmtDistance(d)})`;
    }
    return null;
  }

  async function run(fn: () => Promise<void>) {
    setBusy(true);
    setErr('');
    try {
      await fn();
      await Promise.all([att.reload(), brk.reload()]);
    } catch (e) {
      setErr(errMsg(e));
    } finally {
      setBusy(false);
    }
  }

  /** Step 1: location + geofence, then the "start your day" card or the camera */
  const beginCheckIn = () =>
    run(async () => {
      const l = await location();
      const warn = checkFence(l);
      if (warn) toast(warn, 'info', 'Your manager will see this on the record.');
      setLoc(l);
      if (settings.daily_plan_prompt || settings.mood_pulse) setStep('start');
      else if (settings.selfie_on_check_in) setCamera('in');
      else await checkIn(null, l);
    });

  const afterStart = () => {
    setStep(null);
    if (settings.selfie_on_check_in) setCamera('in');
    else run(() => checkIn(null, loc));
  };

  async function checkIn(selfie: string | null, l = loc) {
    const t = new Date();
    const ref = selfie ? await db.uploadFile('selfies', `${me.id}/${today}-in-${t.getTime()}.jpg`, selfie) : null;
    const lateAt = timeOnDate(today, settings.work_start).getTime() + settings.late_after_minutes * 60000;
    const late = t.getTime() > lateAt;
    await db.insert('attendance', {
      user_id: me.id, date: today, check_in: t.toISOString(), check_out: null, check_in_selfie: ref, check_out_selfie: null,
      check_in_location: l, check_out_location: null, status: late ? 'late' : 'present', work_minutes: 0, break_minutes: 0, notes: '',
      plan: plan.trim(), summary: '', mood,
    });
    setCamera(null);
    buzz(40);
    if (!late) confetti({ count: 90 });
    toast(late ? 'Checked in · marked late' : 'Checked in on time', late ? 'info' : 'success', late ? `Shift started at ${settings.work_start}` : streak ? `${streak + 1}-day on-time streak 🔥` : 'Have a great day!');
  }

  const beginCheckOut = () => {
    if (settings.daily_plan_prompt) {
      setSummary('');
      setStep('wrap');
    } else if (settings.selfie_on_check_out) setCamera('out');
    else run(() => checkOut(null));
  };
  const afterWrap = () => {
    setStep(null);
    if (settings.selfie_on_check_out) setCamera('out');
    else run(() => checkOut(null));
  };

  async function checkOut(selfie: string | null) {
    if (!rec) return;
    const t = new Date();
    const iso = t.toISOString();
    if (openBreak) await db.update('breaks', openBreak.id, { end_at: iso });
    const closed = breaks.map((b) => (b.end_at ? b : { ...b, end_at: iso }));
    const brMin = breakMinutes(rec, closed);
    const work = Math.max(0, minutesBetween(rec.check_in!, iso) - brMin);
    const [l, ref] = await Promise.all([location(), selfie ? db.uploadFile('selfies', `${me.id}/${today}-out-${t.getTime()}.jpg`, selfie) : Promise.resolve(null)]);
    await db.update('attendance', rec.id, {
      check_out: iso, check_out_selfie: ref, check_out_location: l, break_minutes: Math.round(brMin), work_minutes: Math.round(work),
      status: work < settings.half_day_minutes ? 'half_day' : rec.status, summary: summary.trim(),
    });
    setCamera(null);
    buzz(40);
    toast('Checked out', 'success', `You worked ${fmtMinutes(work)} today. Rest well.`);
  }

  const startBreak = (type: BreakType) =>
    run(async () => {
      if (!rec) return;
      if (type === 'tea' && teaUsed >= settings.max_tea_breaks) throw new Error(`Tea break limit reached (${settings.max_tea_breaks} per day).`);
      await db.insert('breaks', { attendance_id: rec.id, user_id: me.id, type, start_at: new Date().toISOString(), end_at: null });
      buzz();
      toast(`${BREAK_LABEL[type]} started`, 'info', `Limit ${settings.break_limits[type]} min`);
    });

  const endBreak = () =>
    run(async () => {
      if (!rec || !openBreak) return;
      const end = new Date().toISOString();
      await db.update('breaks', openBreak.id, { end_at: end });
      const total = breaks.reduce((s, b) => s + minutesBetween(b.start_at, b.id === openBreak.id ? end : b.end_at), 0);
      await db.update('attendance', rec.id, { break_minutes: Math.round(total) });
      buzz();
      toast('Back to work', 'success', `Break took ${fmtMinutes(minutesBetween(openBreak.start_at, end))}`);
    });

  const workedMin = rec ? workedMinutes(rec, breaks) : 0;
  const dayPct = (workedMin / settings.full_day_minutes) * 100;
  const breakSec = openBreak ? (now - new Date(openBreak.start_at).getTime()) / 1000 : 0;
  const breakLimit = openBreak ? settings.break_limits[openBreak.type] : 0;
  const breakPct = openBreak ? Math.min(100, (breakSec / 60 / breakLimit) * 100) : 0;
  const overLimit = openBreak && breakSec / 60 > breakLimit;

  return (
    <div>
      <PageHeader
        title="My Attendance"
        subtitle={`Shift ${settings.work_start} – ${settings.work_end} · grace ${settings.late_after_minutes} min`}
        actions={
          streak > 0 && (
            <Badge tone="amber" className="px-3 py-1 text-xs">
              <Flame size={13} /> {streak}-day on-time streak
            </Badge>
          )
        }
      />

      <div className="grid gap-5 lg:grid-cols-3">
        <Card className="relative overflow-hidden lg:col-span-2">
          {live.state === 'working' && <div className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-emerald-400/15 blur-3xl" />}
          {live.state === 'on_break' && <div className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-amber-400/20 blur-3xl" />}
          <div className="relative flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-xs uppercase tracking-widest text-neutral-400">{fmtDay(today)}</div>
              <div className="mt-1 text-5xl font-semibold tabular-nums tracking-tight sm:text-6xl">
                {new Date(now).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                <span className="ml-1 text-2xl text-neutral-300">{String(new Date(now).getSeconds()).padStart(2, '0')}</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <LiveBadge state={live.state} breakType={live.breakType} />
              {rec && <AttendanceBadge status={rec.status} />}
            </div>
          </div>

          {holidayToday && !rec && <div className="relative mt-4 rounded-xl bg-teal-50 px-4 py-3 text-sm text-teal-700">Today is a holiday: {holidayToday.name}. Enjoy! You can still check in if you&apos;re working.</div>}

          <div className="relative mt-6 grid grid-cols-3 gap-3 rounded-2xl bg-neutral-50 p-4 text-center">
            <div>
              <div className="text-xs text-neutral-500">Checked in</div>
              <div className="text-lg font-semibold">{fmtTime(rec?.check_in)}</div>
            </div>
            <div>
              <div className="text-xs text-neutral-500">Worked</div>
              <div className="text-lg font-semibold tabular-nums">{rec ? fmtClock(workedMin * 60) : '—'}</div>
            </div>
            <div>
              <div className="text-xs text-neutral-500">Checked out</div>
              <div className="text-lg font-semibold">{fmtTime(rec?.check_out)}</div>
            </div>
            {rec && (
              <div className="col-span-3 mt-1">
                <div className="h-1.5 overflow-hidden rounded-full bg-neutral-200">
                  <div className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-emerald-600 transition-[width] duration-1000" style={{ width: `${Math.min(100, dayPct)}%` }} />
                </div>
                <div className="mt-1 text-[11px] text-neutral-500">
                  {Math.round(dayPct)}% of a full day ({fmtMinutes(settings.full_day_minutes)})
                </div>
              </div>
            )}
          </div>

          {rec?.plan && (
            <div className="relative mt-3 rounded-xl border border-neutral-100 px-4 py-2.5 text-sm">
              <span className="text-neutral-400">Today&apos;s focus · </span>
              {rec.plan}
              {rec.mood && <span className="ml-2">{MOODS[rec.mood - 1]}</span>}
            </div>
          )}

          {openBreak && (
            <div className={cn('relative mt-4 flex animate-scale-in items-center gap-4 rounded-2xl p-4', overLimit ? 'bg-rose-50 ring-1 ring-rose-200' : 'bg-amber-50 ring-1 ring-amber-200')}>
              <Ring value={100 - breakPct} size={58} stroke={6} />
              <div className="flex-1">
                <div className="text-sm font-medium">{BREAK_LABEL[openBreak.type]} in progress</div>
                <div className="text-xs text-neutral-600">
                  Limit {breakLimit} min{overLimit ? ' · over the limit, please wrap up' : ` · ${Math.max(0, Math.ceil(breakLimit - breakSec / 60))} min left`}
                </div>
              </div>
              <div className="text-2xl font-semibold tabular-nums">{fmtClock(breakSec)}</div>
            </div>
          )}

          <div className="relative mt-3">
            <ErrorNote text={err} />
          </div>

          <div className="relative mt-5 flex flex-wrap gap-2">
            {!rec && (
              <Button size="lg" className={cn('w-full sm:w-auto', !busy && 'animate-pulse-ring')} onClick={beginCheckIn} disabled={busy}>
                {settings.selfie_on_check_in ? <Camera size={18} /> : <LogIn size={18} />} {busy ? 'Getting location…' : `Check in${settings.selfie_on_check_in ? ' with selfie' : ''}`}
              </Button>
            )}
            {rec && !rec.check_out && !openBreak && (
              <div className="grid w-full grid-cols-3 gap-2 sm:flex sm:w-auto">
                {(['tea', 'lunch', 'personal'] as BreakType[]).map((t) => {
                  const Icon = BREAK_ICON[t];
                  const disabled = busy || (t === 'tea' && teaUsed >= settings.max_tea_breaks);
                  return (
                    <Button key={t} variant="warning" onClick={() => startBreak(t)} disabled={disabled} className="flex-col gap-1 py-3 sm:flex-row sm:py-2">
                      <Icon size={16} />
                      <span>
                        {t === 'tea' ? 'Tea' : t === 'lunch' ? 'Lunch' : 'Personal'}
                        {t === 'tea' && ` ${teaUsed}/${settings.max_tea_breaks}`}
                      </span>
                    </Button>
                  );
                })}
              </div>
            )}
            {openBreak && (
              <Button variant="success" size="lg" className="w-full sm:w-auto" onClick={endBreak} disabled={busy}>
                <Play size={18} /> End break · back to work
              </Button>
            )}
            {rec && !rec.check_out && (
              <Button variant="danger" size={openBreak ? 'lg' : 'md'} className="w-full sm:w-auto" onClick={beginCheckOut} disabled={busy}>
                <LogOut size={16} /> Check out
              </Button>
            )}
            {rec?.check_out && (
              <div className="w-full animate-fade-in rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                Done for today. Worked {fmtMinutes(rec.work_minutes)}, breaks {fmtMinutes(rec.break_minutes)}.{rec.summary && ` Wrap-up: ${rec.summary}`}
              </div>
            )}
          </div>
        </Card>

        <Card title="Today's timeline">
          {!rec ? (
            <p className="text-sm text-neutral-500">Nothing yet. Check in to start your day.</p>
          ) : (
            <ol className="stagger relative space-y-4 border-l border-neutral-200 pl-5">
              <li>
                <span className="absolute -left-1.5 mt-1 h-3 w-3 rounded-full bg-emerald-500 ring-4 ring-surface" />
                <div className="flex items-center gap-3">
                  <SelfieImg refPath={rec.check_in_selfie} className="h-12 w-12" onClick={setZoom} />
                  <div>
                    <div className="text-sm font-medium">Checked in · {fmtTime(rec.check_in)}</div>
                    {rec.check_in_location && (
                      <a className="flex items-center gap-1 text-xs text-neutral-500 hover:underline" target="_blank" rel="noreferrer" href={`https://maps.google.com/?q=${rec.check_in_location}`}>
                        <MapPin size={11} /> {rec.check_in_location}
                      </a>
                    )}
                  </div>
                </div>
              </li>
              {breaks.map((b) => (
                <li key={b.id}>
                  <span className="absolute -left-1.5 mt-1 h-3 w-3 rounded-full bg-amber-400 ring-4 ring-surface" />
                  <div className="text-sm font-medium">{BREAK_LABEL[b.type]}</div>
                  <div className="text-xs text-neutral-500">
                    {fmtTime(b.start_at)} – {b.end_at ? fmtTime(b.end_at) : 'now'} · {fmtMinutes(minutesBetween(b.start_at, b.end_at))}
                    {minutesBetween(b.start_at, b.end_at) > settings.break_limits[b.type] && (
                      <Badge tone="red" className="ml-2">
                        over
                      </Badge>
                    )}
                  </div>
                </li>
              ))}
              {rec.check_out && (
                <li>
                  <span className="absolute -left-1.5 mt-1 h-3 w-3 rounded-full bg-neutral-800 ring-4 ring-surface" />
                  <div className="flex items-center gap-3">
                    <SelfieImg refPath={rec.check_out_selfie} className="h-12 w-12" onClick={setZoom} />
                    <div className="text-sm font-medium">Checked out · {fmtTime(rec.check_out)}</div>
                  </div>
                </li>
              )}
            </ol>
          )}
          <div className="mt-5 space-y-1 border-t border-neutral-100 pt-4 text-xs text-neutral-500">
            {(['tea', 'lunch', 'personal'] as BreakType[]).map((t) => (
              <div key={t} className="flex justify-between">
                <span>
                  {BREAK_LABEL[t]} (limit {settings.break_limits[t]}m each)
                </span>
                <span className="tabular-nums">{fmtMinutes(used(t))}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <h2 className="mb-3 mt-8 text-lg font-semibold">History</h2>
      <div className="space-y-2 md:hidden">
        {att.rows.slice(0, 30).map((a) => (
          <div key={a.id} className="flex items-center gap-3 rounded-2xl border border-neutral-200 bg-surface p-3">
            <SelfieImg refPath={a.check_in_selfie} className="h-10 w-10" onClick={setZoom} />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 text-sm font-medium">
                {fmtDay(a.date)} <AttendanceBadge status={a.status} />
              </div>
              <div className="text-xs text-neutral-500">
                {fmtTime(a.check_in)} → {fmtTime(a.check_out)} · breaks {fmtMinutes(a.break_minutes)}
              </div>
            </div>
            <div className="text-right text-sm font-semibold tabular-nums">{a.check_out ? fmtMinutes(a.work_minutes) : '—'}</div>
          </div>
        ))}
      </div>
      <Table className="hidden md:block" head={['Date', 'Status', 'In', 'Out', 'Breaks', 'Worked', 'Mood', 'Selfies']}>
        {att.rows.map((a) => (
          <tr key={a.id} className="transition hover:bg-neutral-50">
            <td className={td}>{fmtDay(a.date)}</td>
            <td className={td}>
              <AttendanceBadge status={a.status} />
            </td>
            <td className={td}>{fmtTime(a.check_in)}</td>
            <td className={td}>{fmtTime(a.check_out)}</td>
            <td className={td}>{fmtMinutes(a.break_minutes)}</td>
            <td className={td}>{a.check_out ? fmtMinutes(a.work_minutes) : '—'}</td>
            <td className={td}>{a.mood ? MOODS[a.mood - 1] : '—'}</td>
            <td className={td}>
              <div className="flex gap-1">
                <SelfieImg refPath={a.check_in_selfie} className="h-8 w-8" onClick={setZoom} />
                <SelfieImg refPath={a.check_out_selfie} className="h-8 w-8" onClick={setZoom} />
              </div>
            </td>
          </tr>
        ))}
      </Table>

      {/* Step: start your day */}
      <Modal open={step === 'start'} onClose={() => setStep(null)} title="Start your day">
        <div className="space-y-5">
          {settings.mood_pulse && (
            <div>
              <div className="mb-2 text-xs font-medium text-neutral-600">How are you feeling? (optional, only averages are shown to managers)</div>
              <div className="grid grid-cols-5 gap-2">
                {MOODS.map((m, i) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setMood(mood === i + 1 ? null : i + 1)}
                    className={cn('flex flex-col items-center gap-1 rounded-2xl border p-2.5 text-2xl transition active:scale-90', mood === i + 1 ? 'scale-105 border-neutral-800 bg-neutral-50 shadow-sm' : 'border-neutral-200 hover:border-neutral-400')}
                  >
                    <span className={cn(mood === i + 1 && 'animate-pop')}>{m}</span>
                    <span className="text-[10px] text-neutral-500">{MOOD_LABEL[i]}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
          {settings.daily_plan_prompt && (
            <Field label="What's your main focus today?" hint="Shared in the team standup">
              <Textarea rows={2} value={plan} onChange={(e) => setPlan(e.target.value)} placeholder="e.g. Ship the progress chart and review 2 PRs" maxLength={200} />
            </Field>
          )}
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={afterStart}>
              Skip
            </Button>
            <Button onClick={afterStart}>{settings.selfie_on_check_in ? <><Camera size={16} /> Continue to selfie</> : 'Check in'}</Button>
          </div>
        </div>
      </Modal>

      {/* Step: wrap up */}
      <Modal open={step === 'wrap'} onClose={() => setStep(null)} title="Wrap up your day">
        <div className="space-y-4">
          {rec?.plan && (
            <div className="rounded-xl bg-neutral-50 px-3 py-2 text-sm">
              <span className="text-neutral-400">This morning&apos;s focus: </span>
              {rec.plan}
            </div>
          )}
          <Field label="What did you get done?" hint="Shared in the team standup">
            <Textarea rows={3} value={summary} onChange={(e) => setSummary(e.target.value)} placeholder="e.g. Chart shipped to review, fixed 2 bugs" maxLength={300} />
          </Field>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={afterWrap}>
              Skip
            </Button>
            <Button variant="danger" onClick={afterWrap}>
              {settings.selfie_on_check_out ? <><Camera size={16} /> Continue to selfie</> : 'Check out'}
            </Button>
          </div>
        </div>
      </Modal>

      <SelfieCamera
        open={camera !== null}
        title={camera === 'in' ? 'Check-in selfie' : 'Check-out selfie'}
        busy={busy}
        onClose={() => setCamera(null)}
        onCapture={(d) => run(() => (camera === 'in' ? checkIn(d) : checkOut(d)))}
      />
      <Modal open={!!zoom} onClose={() => setZoom('')} title="Selfie">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={zoom} alt="selfie" className="w-full rounded-xl" />
      </Modal>
    </div>
  );
}
