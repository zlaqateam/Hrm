'use client';
import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Plus, Trash2 } from 'lucide-react';
import { useMe } from '@/lib/auth';
import { db } from '@/lib/data';
import { useTable } from '@/lib/hooks';
import { useToast } from '@/lib/toast';
import { errMsg, parseDate, toDateStr, todayStr } from '@/lib/format';
import { managedTeam } from '@/lib/permissions';
import type { Attendance, Holiday, LeaveRequest } from '@/lib/types';
import { Avatar, Badge, Button, Card, ErrorNote, Field, Input, Modal, PageHeader, cn } from '@/components/ui';
import { AttendanceBadge } from '@/components/bits';

const WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const DOT: Record<string, string> = { present: 'bg-emerald-500', late: 'bg-amber-500', half_day: 'bg-violet-500', absent: 'bg-rose-500', on_leave: 'bg-teal-500' };

export default function CalendarPage() {
  const { me, settings } = useMe();
  const [cursor, setCursor] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const [picked, setPicked] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  const first = cursor;
  const last = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0);
  const gridStart = new Date(first);
  gridStart.setDate(first.getDate() - first.getDay());
  const cells = Array.from({ length: Math.ceil((first.getDay() + last.getDate()) / 7) * 7 }, (_, i) => {
    const d = new Date(gridStart);
    d.setDate(gridStart.getDate() + i);
    return d;
  });
  const from = toDateStr(cells[0]);
  const to = toDateStr(cells[cells.length - 1]);

  const holidays = useTable('holidays', { order: ['date', 'asc'] });
  const leaves = useTable('leave_requests', { lte: ['start_date', to] });
  const att = useTable('attendance', { filter: { user_id: me.id }, gte: ['date', from], lte: ['date', to] });
  const profiles = useTable('profiles');

  const team = useMemo(() => new Set(managedTeam(me, profiles.rows).map((p) => p.id)), [me, profiles.rows]);
  const name = (id: string) => profiles.rows.find((p) => p.id === id)?.full_name;
  const today = todayStr();

  const dayInfo = (ds: string) => {
    const hol = holidays.rows.find((h) => h.date === ds);
    const lv = leaves.rows.filter((l) => l.start_date <= ds && l.end_date >= ds && (l.status === 'approved' || l.user_id === me.id) && (team.has(l.user_id) || l.user_id === me.id));
    const a = att.rows.find((x) => x.date === ds);
    const anniv = profiles.rows.filter((p) => p.status === 'active' && p.join_date && p.join_date.slice(5) === ds.slice(5) && p.join_date.slice(0, 4) < ds.slice(0, 4));
    const off = settings.weekly_off.includes(parseDate(ds).getDay());
    return { hol, lv, a, anniv, off };
  };

  const move = (n: number) => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + n, 1));
  const upcoming = holidays.rows.filter((h) => h.date >= today).slice(0, 6);

  return (
    <div>
      <PageHeader
        title="Calendar"
        subtitle="Holidays, team leave, your attendance and work anniversaries"
        actions={
          me.role === 'super_admin' && (
            <Button onClick={() => setAdding(true)}>
              <Plus size={16} /> Add holiday
            </Button>
          )
        }
      />
      <div className="grid gap-5 lg:grid-cols-4">
        <Card className="lg:col-span-3">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold">{cursor.toLocaleDateString([], { month: 'long', year: 'numeric' })}</h2>
            <div className="flex gap-1">
              <Button variant="secondary" size="sm" onClick={() => move(-1)} aria-label="Previous month">
                <ChevronLeft size={16} />
              </Button>
              <Button variant="secondary" size="sm" onClick={() => setCursor(new Date(new Date().getFullYear(), new Date().getMonth(), 1))}>
                Today
              </Button>
              <Button variant="secondary" size="sm" onClick={() => move(1)} aria-label="Next month">
                <ChevronRight size={16} />
              </Button>
            </div>
          </div>
          <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-semibold uppercase tracking-wide text-neutral-400">
            {WEEK.map((w) => (
              <div key={w} className="py-1">
                <span className="sm:hidden">{w[0]}</span>
                <span className="hidden sm:inline">{w}</span>
              </div>
            ))}
          </div>
          <div key={from} className="grid animate-fade-in grid-cols-7 gap-1">
            {cells.map((d) => {
              const ds = toDateStr(d);
              const inMonth = d.getMonth() === cursor.getMonth();
              const { hol, lv, a, anniv, off } = dayInfo(ds);
              return (
                <button
                  key={ds}
                  onClick={() => setPicked(ds)}
                  className={cn(
                    'group relative flex min-h-[64px] flex-col rounded-xl border p-1.5 text-left transition hover:border-neutral-400 sm:min-h-[96px] sm:p-2',
                    inMonth ? 'border-neutral-200' : 'border-transparent opacity-40',
                    off && 'bg-neutral-50',
                    hol && 'bg-teal-50',
                    ds === today && 'ring-2 ring-brand',
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span className={cn('text-xs font-semibold sm:text-sm', ds === today && 'grid h-6 w-6 place-items-center rounded-full bg-brand text-on-brand')}>{d.getDate()}</span>
                    {a && <span className={cn('h-2 w-2 rounded-full', DOT[a.status])} title={a.status} />}
                  </div>
                  <div className="mt-1 hidden space-y-0.5 sm:block">
                    {hol && <div className="truncate rounded-md bg-teal-500/15 px-1.5 py-0.5 text-[10px] font-medium text-teal-700">{hol.name}</div>}
                    {lv.slice(0, 2).map((l) => (
                      <div key={l.id} className={cn('truncate rounded-md px-1.5 py-0.5 text-[10px]', l.status === 'approved' ? 'bg-violet-50 text-violet-700' : 'bg-amber-50 text-amber-700')}>
                        {name(l.user_id)?.split(' ')[0]} · {l.type}
                      </div>
                    ))}
                    {lv.length > 2 && <div className="text-[10px] text-neutral-400">+{lv.length - 2} more</div>}
                    {anniv.length > 0 && <div className="truncate text-[10px]">🎉 {anniv[0].full_name.split(' ')[0]}</div>}
                  </div>
                  <div className="mt-auto flex gap-0.5 sm:hidden">
                    {hol && <span className="h-1.5 w-1.5 rounded-full bg-teal-500" />}
                    {lv.length > 0 && <span className="h-1.5 w-1.5 rounded-full bg-violet-500" />}
                    {anniv.length > 0 && <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />}
                  </div>
                </button>
              );
            })}
          </div>
          <div className="mt-4 flex flex-wrap gap-3 text-xs text-neutral-500">
            {[['bg-emerald-500', 'Present'], ['bg-amber-500', 'Late'], ['bg-violet-500', 'Half day / leave'], ['bg-teal-500', 'Holiday']].map(([c, l]) => (
              <span key={l} className="flex items-center gap-1.5">
                <span className={cn('h-2 w-2 rounded-full', c)} /> {l}
              </span>
            ))}
          </div>
        </Card>

        <Card title="Upcoming holidays" className="h-fit">
          <div className="space-y-2">
            {upcoming.map((h) => (
              <div key={h.id} className="flex items-center gap-3 rounded-xl bg-neutral-50 p-2.5">
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-teal-500/15 text-center leading-none text-teal-700">
                  <div>
                    <div className="text-[9px] font-semibold uppercase">{parseDate(h.date).toLocaleDateString([], { month: 'short' })}</div>
                    <div className="text-sm font-bold">{parseDate(h.date).getDate()}</div>
                  </div>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">{h.name}</div>
                  <div className="text-xs text-neutral-500">{parseDate(h.date).toLocaleDateString([], { weekday: 'long' })}</div>
                </div>
              </div>
            ))}
            {!upcoming.length && <p className="text-sm text-neutral-500">None scheduled.</p>}
          </div>
        </Card>
      </div>

      {picked && <DayDetail ds={picked} info={dayInfo(picked)} name={name} canEdit={me.role === 'super_admin'} onClose={() => setPicked(null)} />}
      {adding && <AddHoliday onClose={() => setAdding(false)} />}
    </div>
  );
}

function DayDetail({ ds, info, name, canEdit, onClose }: { ds: string; info: { hol?: Holiday; lv: LeaveRequest[]; a?: Attendance; anniv: { id: string; full_name: string; join_date: string }[]; off: boolean }; name: (id: string) => string | undefined; canEdit: boolean; onClose: () => void }) {
  return (
    <Modal open onClose={onClose} title={parseDate(ds).toLocaleDateString([], { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}>
      <div className="space-y-3 text-sm">
        {info.off && <Badge>Weekly off</Badge>}
        {info.hol && (
          <div className="flex items-center justify-between rounded-xl bg-teal-50 px-3 py-2 text-teal-700">
            🏖️ {info.hol.name}
            {canEdit && (
              <button onClick={() => db.remove('holidays', info.hol!.id).then(onClose)} className="text-teal-700/70 hover:text-rose-600" aria-label="Delete holiday">
                <Trash2 size={14} />
              </button>
            )}
          </div>
        )}
        {info.a && (
          <div className="flex items-center gap-2">
            Your day: <AttendanceBadge status={info.a.status} />
          </div>
        )}
        {info.lv.length > 0 && (
          <div>
            <div className="mb-1 text-xs font-medium text-neutral-500">On leave</div>
            {info.lv.map((l) => (
              <div key={l.id} className="flex items-center gap-2 py-1">
                <Avatar name={name(l.user_id)} size={24} /> {name(l.user_id)} · {l.type}
                {l.status !== 'approved' && <Badge tone="amber">{l.status}</Badge>}
              </div>
            ))}
          </div>
        )}
        {info.anniv.map((p) => (
          <div key={p.id}>
            🎉 {p.full_name}: {Number(ds.slice(0, 4)) - Number(p.join_date.slice(0, 4))} year work anniversary
          </div>
        ))}
        {!info.hol && !info.a && !info.lv.length && !info.anniv.length && !info.off && <p className="text-neutral-500">Nothing on this day.</p>}
      </div>
    </Modal>
  );
}

function AddHoliday({ onClose }: { onClose: () => void }) {
  const toast = useToast();
  const [date, setDate] = useState('');
  const [name, setName] = useState('');
  const [err, setErr] = useState('');
  async function save() {
    if (!date || !name.trim()) return setErr('Date and name are required');
    try {
      await db.insert('holidays', { date, name: name.trim() });
      toast('Holiday added', 'success', 'It is excluded from working days everywhere.');
      onClose();
    } catch (e) {
      setErr(errMsg(e));
    }
  }
  return (
    <Modal open onClose={onClose} title="Add holiday">
      <div className="space-y-3">
        <Field label="Date">
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </Field>
        <Field label="Name">
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Onam" />
        </Field>
        <ErrorNote text={err} />
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={save}>Add</Button>
        </div>
      </div>
    </Modal>
  );
}
