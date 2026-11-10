'use client';
import { useMemo, useState } from 'react';
import { Download, MapPin, Pencil } from 'lucide-react';
import { useMe } from '@/lib/auth';
import { db } from '@/lib/data';
import { useTable } from '@/lib/hooks';
import { MOODS, addDays, distanceMeters, downloadCSV, errMsg, fmtDay, fmtDistance, fmtMinutes, fmtTime, minutesBetween, timeOnDate, toDateStr } from '@/lib/format';
import { useToast } from '@/lib/toast';
import { managedTeam } from '@/lib/permissions';
import type { Attendance, AttendanceStatus } from '@/lib/types';
import { Avatar, Badge, Button, ErrorNote, Field, Input, Modal, PageHeader, RequireRole, Select, Stat, Table, Textarea, td } from '@/components/ui';
import { AttendanceBadge, SelfieImg } from '@/components/bits';

export default function RecordsPage() {
  return (
    <RequireRole roles={['super_admin', 'admin']}>
      <Records />
    </RequireRole>
  );
}

function Records() {
  const { me, settings } = useMe();
  const [from, setFrom] = useState(toDateStr(addDays(new Date(), -6)));
  const [to, setTo] = useState(toDateStr(new Date()));
  const [dept, setDept] = useState('all');
  const [person, setPerson] = useState('all');
  const [status, setStatus] = useState('all');
  const [zoom, setZoom] = useState('');
  const [edit, setEdit] = useState<Attendance | null>(null);

  const profiles = useTable('profiles', { order: ['full_name', 'asc'] });
  const departments = useTable('departments', { order: ['name', 'asc'] });
  const att = useTable('attendance', { gte: ['date', from], lte: ['date', to], order: ['date', 'desc'] });
  const brk = useTable('breaks', { gte: ['start_at', new Date(from + 'T00:00:00').toISOString()] });

  const team = useMemo(() => managedTeam(me, profiles.rows), [me, profiles.rows]);
  const teamIds = new Set(team.map((p) => p.id));
  const pName = (id: string) => profiles.rows.find((p) => p.id === id);

  const rows = att.rows.filter((a) => {
    if (!teamIds.has(a.user_id)) return false;
    const p = pName(a.user_id);
    if (dept !== 'all' && p?.department_id !== dept) return false;
    if (person !== 'all' && a.user_id !== person) return false;
    if (status !== 'all' && a.status !== status) return false;
    return true;
  });

  const late = rows.filter((r) => r.status === 'late').length;
  const avgWork = rows.filter((r) => r.check_out).reduce((s, r, _, arr) => s + r.work_minutes / arr.length, 0);
  const missingOut = rows.filter((r) => !r.check_out && r.date < toDateStr(new Date())).length;

  function exportCsv() {
    downloadCSV(`attendance_${from}_${to}.csv`, [
      ['Date', 'Employee', 'Code', 'Department', 'Status', 'Check in', 'Check out', 'Break min', 'Work min', 'In location', 'Notes'],
      ...rows.map((r) => {
        const p = pName(r.user_id);
        return [r.date, p?.full_name, p?.employee_code, departments.rows.find((d) => d.id === p?.department_id)?.name, r.status, fmtTime(r.check_in), fmtTime(r.check_out), r.break_minutes, r.work_minutes, r.check_in_location, r.notes];
      }),
    ]);
  }

  return (
    <div>
      <PageHeader
        title="Attendance Records"
        subtitle="Selfies, times, breaks and corrections for your team"
        actions={
          <Button variant="secondary" onClick={exportCsv}>
            <Download size={16} /> Export CSV
          </Button>
        }
      />
      <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-5">
        <Field label="From">
          <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        </Field>
        <Field label="To">
          <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </Field>
        <Field label="Department">
          <Select value={dept} onChange={(e) => setDept(e.target.value)}>
            <option value="all">All</option>
            {departments.rows.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Employee">
          <Select value={person} onChange={(e) => setPerson(e.target.value)}>
            <option value="all">All</option>
            {team.map((p) => (
              <option key={p.id} value={p.id}>
                {p.full_name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Status">
          <Select value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="all">All</option>
            {['present', 'late', 'half_day', 'absent', 'on_leave'].map((s) => (
              <option key={s} value={s}>
                {s.replace('_', ' ')}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      <div className="mb-5 grid grid-cols-2 gap-4 md:grid-cols-4">
        <Stat label="Records" value={rows.length} />
        <Stat label="Late" value={late} sub={rows.length ? `${Math.round((late / rows.length) * 100)}% of records` : ''} tone="amber" />
        <Stat label="Avg worked" value={fmtMinutes(avgWork)} />
        <Stat label="Missing check-out" value={missingOut} tone="red" />
      </div>

      <Table head={['Employee', 'Date', 'Status', 'In', 'Out', 'Breaks', 'Worked', 'Standup', 'Selfies', 'Location', '']}>
        {rows.map((r) => {
          const p = pName(r.user_id);
          const nBreaks = brk.rows.filter((b) => b.attendance_id === r.id).length;
          return (
            <tr key={r.id} className="hover:bg-neutral-50">
              <td className={td}>
                <div className="flex items-center gap-2">
                  <Avatar name={p?.full_name} size={28} />
                  <div>
                    <div className="font-medium">{p?.full_name}</div>
                    <div className="text-xs text-neutral-500">{p?.employee_code}</div>
                  </div>
                </div>
              </td>
              <td className={td}>{fmtDay(r.date)}</td>
              <td className={td}>
                <AttendanceBadge status={r.status} />
              </td>
              <td className={td}>{fmtTime(r.check_in)}</td>
              <td className={td}>{fmtTime(r.check_out)}</td>
              <td className={td}>
                {fmtMinutes(r.break_minutes)}
                {nBreaks > 0 && <span className="text-xs text-neutral-400"> · {nBreaks}</span>}
              </td>
              <td className={td}>{r.check_out ? fmtMinutes(r.work_minutes) : '—'}</td>
              <td className={`${td} max-w-[220px]`}>
                {r.plan || r.summary ? (
                  <div className="text-xs">
                    {r.plan && <div className="truncate" title={r.plan}>🎯 {r.plan}</div>}
                    {r.summary && <div className="truncate text-emerald-700" title={r.summary}>✅ {r.summary}</div>}
                  </div>
                ) : (
                  <span className="text-xs text-neutral-400">—</span>
                )}
              </td>
              <td className={td}>
                <div className="flex gap-1">
                  <SelfieImg refPath={r.check_in_selfie} className="h-9 w-9" onClick={setZoom} />
                  <SelfieImg refPath={r.check_out_selfie} className="h-9 w-9" onClick={setZoom} />
                </div>
              </td>
              <td className={td}>
                {r.check_in_location ? (
                  <a className="inline-flex items-center gap-1 text-xs text-neutral-500 hover:underline" target="_blank" rel="noreferrer" href={`https://maps.google.com/?q=${r.check_in_location}`}>
                    <MapPin size={12} /> Map
                  </a>
                ) : (
                  '—'
                )}
                {(() => {
                  const d = settings.geofence_mode !== 'off' ? distanceMeters(r.check_in_location, settings.office_lat, settings.office_lng) : null;
                  return d !== null && d > settings.office_radius_m ? <Badge tone="red" className="ml-1">Outside · {fmtDistance(d)}</Badge> : null;
                })()}
              </td>
              <td className={td}>
                <Button variant="ghost" size="sm" onClick={() => setEdit(r)} aria-label="Correct record">
                  <Pencil size={14} />
                </Button>
              </td>
            </tr>
          );
        })}
      </Table>
      {!rows.length && <p className="mt-4 text-center text-sm text-neutral-500">No records for these filters.</p>}

      <Modal open={!!zoom} onClose={() => setZoom('')} title="Selfie">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={zoom} alt="selfie" className="w-full rounded-xl" />
      </Modal>
      {edit && <EditRecord rec={edit} name={pName(edit.user_id)?.full_name ?? ''} onClose={() => setEdit(null)} />}
    </div>
  );
}

function EditRecord({ rec, name, onClose }: { rec: Attendance; name: string; onClose: () => void }) {
  const hhmm = (iso: string | null) => (iso ? new Date(iso).toTimeString().slice(0, 5) : '');
  const [status, setStatus] = useState<AttendanceStatus>(rec.status);
  const [inT, setInT] = useState(hhmm(rec.check_in));
  const [outT, setOutT] = useState(hhmm(rec.check_out));
  const [notes, setNotes] = useState(rec.notes);
  const [err, setErr] = useState('');
  const toast = useToast();

  async function save() {
    try {
      const check_in = inT ? timeOnDate(rec.date, inT).toISOString() : null;
      const check_out = outT ? timeOnDate(rec.date, outT).toISOString() : null;
      const work = check_in && check_out ? Math.max(0, Math.round(minutesBetween(check_in, check_out) - rec.break_minutes)) : rec.work_minutes;
      await db.update('attendance', rec.id, { status, check_in, check_out, work_minutes: work, notes });
      toast('Record corrected', 'success', 'Saved to the audit log');
      onClose();
    } catch (e) {
      setErr(errMsg(e));
    }
  }

  return (
    <Modal open onClose={onClose} title={`Correct record · ${name} · ${fmtDay(rec.date)}`}>
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Check-in time">
            <Input type="time" value={inT} onChange={(e) => setInT(e.target.value)} />
          </Field>
          <Field label="Check-out time">
            <Input type="time" value={outT} onChange={(e) => setOutT(e.target.value)} />
          </Field>
        </div>
        <Field label="Status">
          <Select value={status} onChange={(e) => setStatus(e.target.value as AttendanceStatus)}>
            {['present', 'late', 'half_day', 'absent', 'on_leave'].map((s) => (
              <option key={s} value={s}>
                {s.replace('_', ' ')}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Reason / notes" hint="Saved to the audit log">
          <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} />
        </Field>
        <ErrorNote text={err} />
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={save}>Save correction</Button>
        </div>
      </div>
    </Modal>
  );
}
