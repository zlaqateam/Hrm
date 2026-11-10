'use client';
import { useEffect, useState } from 'react';
import { ArrowDown, ArrowUp, Download, LocateFixed, Plus, RotateCcw, Save, X } from 'lucide-react';
import { useToast } from '@/lib/toast';
import { useMe } from '@/lib/auth';
import { DATA_MODE, db } from '@/lib/data';
import { errMsg } from '@/lib/format';
import { MODULES, ROLE_LABEL, WIDGETS, type BreakType, type OrgSettings, type Role, type WidgetId } from '@/lib/types';
import { Badge, Button, Card, ErrorNote, Field, Input, PageHeader, RequireRole, Select, Tabs, Toggle, cn } from '@/components/ui';

type Tab = 'general' | 'attendance' | 'modules' | 'performance' | 'okrs' | 'leave' | 'dashboards' | 'data';
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function SettingsPage() {
  return (
    <RequireRole roles={['super_admin']}>
      <Settings />
    </RequireRole>
  );
}

function Settings() {
  const { settings } = useMe();
  const [s, setS] = useState<OrgSettings>(settings);
  const [tab, setTab] = useState<Tab>('general');
  const toast = useToast();
  const [err, setErr] = useState('');

  useEffect(() => setS(settings), [settings]);
  useEffect(() => {
    const t = new URLSearchParams(window.location.search).get('tab') as Tab | null;
    if (t) setTab(t);
  }, []);

  const set = <K extends keyof OrgSettings>(k: K, v: OrgSettings[K]) => setS((x) => ({ ...x, [k]: v }));
  const wSum = s.performance_weights.attendance + s.performance_weights.punctuality + s.performance_weights.okr + s.performance_weights.tasks;

  async function save() {
    setErr('');
    if (wSum !== 100) return setErr(`Performance weights must add up to 100 (now ${wSum}).`);
    try {
      const { id: _id, ...patch } = s;
      await db.update('org_settings', 1, { ...patch, updated_at: new Date().toISOString() });
      toast('Settings saved', 'success', 'Applied for everyone instantly');
    } catch (e) {
      setErr(errMsg(e));
    }
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: 'general', label: 'General' },
    { id: 'attendance', label: 'Attendance' },
    { id: 'modules', label: 'Modules' },
    { id: 'performance', label: 'Performance' },
    { id: 'okrs', label: 'OKRs' },
    { id: 'leave', label: 'Leave' },
    { id: 'dashboards', label: 'Dashboards' },
    { id: 'data', label: 'Data' },
  ];

  return (
    <div>
      <PageHeader
        title="Settings"
        subtitle="Super Admin controls for the whole organisation"
        actions={
          <>
            <Button onClick={save}>
              <Save size={16} /> Save changes
            </Button>
          </>
        }
      />
      <div className="mb-5 overflow-x-auto">
        <Tabs tabs={tabs} value={tab} onChange={setTab} />
      </div>
      <ErrorNote text={err} />

      <div className="mt-4">
        {tab === 'general' && (
          <Card className="grid gap-4 md:grid-cols-2">
            <Field label="Company name">
              <Input value={s.company_name} onChange={(e) => set('company_name', e.target.value)} />
            </Field>
            <Field label="Tagline">
              <Input value={s.tagline} onChange={(e) => set('tagline', e.target.value)} />
            </Field>
            <Field label="Brand colour" hint="Buttons, active nav, charts. Default near-black (white-first brand).">
              <div className="flex gap-2">
                <Input type="color" className="h-10 w-16 p-1" value={s.primary_color} onChange={(e) => set('primary_color', e.target.value)} />
                <Input value={s.primary_color} onChange={(e) => set('primary_color', e.target.value)} />
              </div>
            </Field>
            <Field label="Time zone" hint="IANA name, e.g. Asia/Kolkata">
              <Input value={s.timezone} onChange={(e) => set('timezone', e.target.value)} />
            </Field>
          </Card>
        )}

        {tab === 'attendance' && (
          <div className="space-y-4">
            <Card title="Shift" className="grid gap-4 md:grid-cols-3">
              <Field label="Work starts">
                <Input type="time" value={s.work_start} onChange={(e) => set('work_start', e.target.value)} />
              </Field>
              <Field label="Work ends">
                <Input type="time" value={s.work_end} onChange={(e) => set('work_end', e.target.value)} />
              </Field>
              <Field label="Late after (grace minutes)">
                <Input type="number" value={s.late_after_minutes} onChange={(e) => set('late_after_minutes', Number(e.target.value))} />
              </Field>
              <Field label="Half day if worked less than (min)">
                <Input type="number" value={s.half_day_minutes} onChange={(e) => set('half_day_minutes', Number(e.target.value))} />
              </Field>
              <Field label="Full day (min)">
                <Input type="number" value={s.full_day_minutes} onChange={(e) => set('full_day_minutes', Number(e.target.value))} />
              </Field>
              <Field label="Weekly off">
                <div className="flex flex-wrap gap-1">
                  {DAYS.map((d, i) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => set('weekly_off', s.weekly_off.includes(i) ? s.weekly_off.filter((x) => x !== i) : [...s.weekly_off, i])}
                      className={cn('rounded-lg px-2.5 py-1.5 text-xs font-medium', s.weekly_off.includes(i) ? 'bg-brand text-on-brand' : 'bg-neutral-100 text-neutral-600')}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </Field>
            </Card>
            <Card title="Verification" className="grid gap-3 md:grid-cols-3">
              <Toggle checked={s.selfie_on_check_in} onChange={(v) => set('selfie_on_check_in', v)} label="Selfie on check-in" />
              <Toggle checked={s.selfie_on_check_out} onChange={(v) => set('selfie_on_check_out', v)} label="Selfie on check-out" />
              <Toggle checked={s.capture_location} onChange={(v) => set('capture_location', v)} label="Capture GPS location" hint="Browser asks permission" />
            </Card>
            <Card title="Daily check-in experience" className="grid gap-3 md:grid-cols-2">
              <Toggle checked={s.daily_plan_prompt} onChange={(v) => set('daily_plan_prompt', v)} label="Daily standup prompts" hint="Ask for today's focus at check-in and a wrap-up at check-out" />
              <Toggle checked={s.mood_pulse} onChange={(v) => set('mood_pulse', v)} label="Mood pulse" hint="Optional 1-5 emoji at check-in. Managers only see averages." />
            </Card>
            <Card title="Geofence (office location)" className="grid gap-4 md:grid-cols-4">
              <Field label="Mode" hint="Flag = allow but mark outside. Block = refuse check-in outside.">
                <Select value={s.geofence_mode} onChange={(e) => set('geofence_mode', e.target.value as OrgSettings['geofence_mode'])}>
                  <option value="off">Off</option>
                  <option value="flag">Flag outside check-ins</option>
                  <option value="block">Block outside check-ins</option>
                </Select>
              </Field>
              <Field label="Office latitude">
                <Input type="number" step="0.00001" value={s.office_lat ?? ''} onChange={(e) => set('office_lat', e.target.value === '' ? null : Number(e.target.value))} />
              </Field>
              <Field label="Office longitude">
                <Input type="number" step="0.00001" value={s.office_lng ?? ''} onChange={(e) => set('office_lng', e.target.value === '' ? null : Number(e.target.value))} />
              </Field>
              <Field label="Radius (metres)">
                <Input type="number" value={s.office_radius_m} onChange={(e) => set('office_radius_m', Number(e.target.value))} />
              </Field>
              <div className="md:col-span-4">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() =>
                    navigator.geolocation?.getCurrentPosition(
                      (p) => {
                        setS((x) => ({ ...x, office_lat: Number(p.coords.latitude.toFixed(5)), office_lng: Number(p.coords.longitude.toFixed(5)) }));
                        toast('Office location set to where you are now', 'info', 'Remember to save');
                      },
                      () => toast('Could not get your location', 'error'),
                      { enableHighAccuracy: true, timeout: 8000 },
                    )
                  }
                >
                  <LocateFixed size={14} /> Use my current location
                </Button>
              </div>
            </Card>
            <Card title="Breaks" className="grid gap-4 md:grid-cols-4">
              {(['tea', 'lunch', 'personal'] as BreakType[]).map((b) => (
                <Field key={b} label={`${b[0].toUpperCase() + b.slice(1)} break limit (min)`}>
                  <Input type="number" value={s.break_limits[b]} onChange={(e) => set('break_limits', { ...s.break_limits, [b]: Number(e.target.value) })} />
                </Field>
              ))}
              <Field label="Max tea breaks per day">
                <Input type="number" value={s.max_tea_breaks} onChange={(e) => set('max_tea_breaks', Number(e.target.value))} />
              </Field>
            </Card>
          </div>
        )}

        {tab === 'modules' && (
          <Card className="grid gap-3 md:grid-cols-2">
            {MODULES.map((m) => (
              <Toggle key={m.id} checked={s.modules[m.id]} onChange={(v) => set('modules', { ...s.modules, [m.id]: v })} label={m.label} hint="Hides the module from navigation for everyone" />
            ))}
            <Toggle checked={s.members_see_team} onChange={(v) => set('members_see_team', v)} label="Members can see teammates' live status" hint="Department colleagues only. Selfies always stay private." />
            <div className="md:col-span-2">
              <ListEditor label="Kudos values (your culture words)" items={s.kudos_values} onChange={(v) => set('kudos_values', v)} placeholder="Curiosity" />
            </div>
          </Card>
        )}

        {tab === 'performance' && (
          <Card title={`Score weights (total ${wSum}/100)`} className="grid gap-4 md:grid-cols-4">
            {(['attendance', 'punctuality', 'okr', 'tasks'] as const).map((k) => (
              <Field key={k} label={k === 'okr' ? 'OKR progress' : k[0].toUpperCase() + k.slice(1)}>
                <Input type="number" min={0} max={100} value={s.performance_weights[k]} onChange={(e) => set('performance_weights', { ...s.performance_weights, [k]: Number(e.target.value) })} />
              </Field>
            ))}
          </Card>
        )}

        {tab === 'okrs' && (
          <Card className="space-y-4">
            <ListEditor label="OKR cycles" items={s.okr_cycles} onChange={(v) => set('okr_cycles', v)} placeholder="Q2 2027" />
            <Field label="Current cycle">
              <select className="rounded-xl border border-neutral-300 px-3 py-2 text-sm" value={s.current_cycle} onChange={(e) => set('current_cycle', e.target.value)}>
                {s.okr_cycles.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </Field>
            <Toggle checked={s.members_can_create_okrs} onChange={(v) => set('members_can_create_okrs', v)} label="Members can create their own individual OKRs" />
          </Card>
        )}

        {tab === 'leave' && (
          <Card className="space-y-4">
            <ListEditor label="Leave types" items={s.leave_types} onChange={(v) => set('leave_types', v)} placeholder="Maternity" />
            <div className="grid gap-3 md:grid-cols-4">
              {s.leave_types.map((t) => (
                <Field key={t} label={`${t} · days per year`}>
                  <Input type="number" value={s.leave_quota[t] ?? 0} onChange={(e) => set('leave_quota', { ...s.leave_quota, [t]: Number(e.target.value) })} />
                </Field>
              ))}
            </div>
          </Card>
        )}

        {tab === 'dashboards' && (
          <div className="grid gap-4 lg:grid-cols-3">
            {(['super_admin', 'admin', 'member'] as Role[]).map((r) => (
              <WidgetPicker key={r} title={`${ROLE_LABEL[r]} dashboard`} value={s.dashboard_widgets[r]} onChange={(v) => set('dashboard_widgets', { ...s.dashboard_widgets, [r]: v })} />
            ))}
            <p className="text-xs text-neutral-500 lg:col-span-3">Need a different layout for one department? Edit it in Departments → Custom dashboard.</p>
          </div>
        )}

        {tab === 'data' && (
          <Card className="space-y-4">
            <p className="text-sm">
              Data mode: <Badge tone={DATA_MODE === 'demo' ? 'amber' : 'green'}>{DATA_MODE}</Badge>
            </p>
            {DATA_MODE === 'demo' ? (
              <>
                <p className="text-sm text-neutral-600">Demo data lives in this browser only. Export a JSON backup or reset to the original demo data.</p>
                <div className="flex gap-2">
                  <Button
                    variant="secondary"
                    onClick={async () => {
                      const data = await db.exportAll?.();
                      const a = document.createElement('a');
                      a.href = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
                      a.download = 'zlaqa-team-os-backup.json';
                      a.click();
                    }}
                  >
                    <Download size={16} /> Export JSON
                  </Button>
                  <Button
                    variant="danger"
                    onClick={() => {
                      if (confirm('Reset all demo data? You will be signed out.')) {
                        db.resetDemo?.();
                        location.href = '/login';
                      }
                    }}
                  >
                    <RotateCcw size={16} /> Reset demo
                  </Button>
                </div>
              </>
            ) : (
              <p className="text-sm text-neutral-600">Connected to Supabase. Use Supabase backups (Database → Backups) or pg_dump for exports.</p>
            )}
          </Card>
        )}
      </div>
    </div>
  );
}

function ListEditor({ label, items, onChange, placeholder }: { label: string; items: string[]; onChange: (v: string[]) => void; placeholder: string }) {
  const [v, setV] = useState('');
  return (
    <Field label={label}>
      <div className="flex flex-wrap gap-2">
        {items.map((i) => (
          <Badge key={i} className="py-1 text-xs">
            {i}
            <button type="button" onClick={() => onChange(items.filter((x) => x !== i))} aria-label={`Remove ${i}`}>
              <X size={12} />
            </button>
          </Badge>
        ))}
        <div className="flex gap-1">
          <Input className="w-36 py-1" placeholder={placeholder} value={v} onChange={(e) => setV(e.target.value)} />
          <Button
            size="sm"
            variant="secondary"
            onClick={() => {
              if (v.trim() && !items.includes(v.trim())) onChange([...items, v.trim()]);
              setV('');
            }}
          >
            <Plus size={14} />
          </Button>
        </div>
      </div>
    </Field>
  );
}

function WidgetPicker({ title, value, onChange }: { title: string; value: WidgetId[]; onChange: (v: WidgetId[]) => void }) {
  const move = (i: number, d: -1 | 1) => {
    const j = i + d;
    if (j < 0 || j >= value.length) return;
    const next = [...value];
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  };
  const unused = WIDGETS.filter((w) => !value.includes(w.id));
  return (
    <Card title={title}>
      <div className="space-y-1.5">
        {value.map((id, i) => (
          <div key={id} className="flex items-center gap-2 rounded-xl bg-neutral-50 px-3 py-2 text-sm">
            <span className="w-5 text-xs text-neutral-400">{i + 1}</span>
            <span className="flex-1">{WIDGETS.find((w) => w.id === id)?.label}</span>
            <button onClick={() => move(i, -1)} className="text-neutral-400 hover:text-neutral-800" aria-label="Up"><ArrowUp size={14} /></button>
            <button onClick={() => move(i, 1)} className="text-neutral-400 hover:text-neutral-800" aria-label="Down"><ArrowDown size={14} /></button>
            <button onClick={() => onChange(value.filter((x) => x !== id))} className="text-neutral-400 hover:text-rose-600" aria-label="Remove"><X size={14} /></button>
          </div>
        ))}
      </div>
      {unused.length > 0 && (
        <div className="mt-4">
          <div className="mb-1.5 text-xs font-medium text-neutral-500">Add widget</div>
          <div className="flex flex-wrap gap-1.5">
            {unused.map((w) => (
              <button key={w.id} title={w.description} onClick={() => onChange([...value, w.id])} className="rounded-lg border border-dashed border-neutral-300 px-2 py-1 text-xs text-neutral-600 hover:border-neutral-500">
                + {w.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}
