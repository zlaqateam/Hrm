'use client';
import { useState } from 'react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { useMe } from '@/lib/auth';
import { db } from '@/lib/data';
import { useWorkspace } from '@/lib/workspace';
import { errMsg, todayStr } from '@/lib/format';
import { krsOf, objectiveProgress } from '@/lib/metrics';
import { WIDGETS, type Department, type WidgetId } from '@/lib/types';
import { Avatar, Badge, Button, Card, ErrorNote, Field, Input, Modal, PageHeader, Progress, RequireRole, Select, Textarea, Toggle } from '@/components/ui';

export default function DepartmentsPage() {
  return (
    <RequireRole roles={['super_admin']}>
      <Departments />
    </RequireRole>
  );
}

function Departments() {
  const { settings } = useMe();
  const ws = useWorkspace(1, settings.current_cycle);
  const [editing, setEditing] = useState<Partial<Department> | null>(null);
  const today = todayStr();

  return (
    <div>
      <PageHeader
        title="Departments"
        subtitle="Structure, heads and a custom dashboard per department"
        actions={
          <Button onClick={() => setEditing({ name: '', description: '', color: '#059669', head_id: null, dashboard_widgets: null })}>
            <Plus size={16} /> New department
          </Button>
        }
      />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {ws.departments.map((d) => {
          const people = ws.profiles.filter((p) => p.department_id === d.id && p.status === 'active');
          const ids = new Set(people.map((p) => p.id));
          const present = ws.attendance.filter((a) => a.date === today && ids.has(a.user_id)).length;
          const objs = ws.objectives.filter((o) => o.department_id === d.id);
          const okr = objs.length ? objs.reduce((s, o) => s + objectiveProgress(krsOf(o.id, ws.krs)), 0) / objs.length : 0;
          const head = ws.profiles.find((p) => p.id === d.head_id);
          return (
            <Card key={d.id}>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <span className="h-10 w-2 rounded-full" style={{ background: d.color }} />
                  <div>
                    <h3 className="font-semibold">{d.name}</h3>
                    <p className="text-xs text-neutral-500">{d.description}</p>
                  </div>
                </div>
                <div className="flex gap-1">
                  <Button size="sm" variant="ghost" onClick={() => setEditing(d)} aria-label="Edit">
                    <Pencil size={14} />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => (people.length ? alert('Move people out of this department first.') : confirm(`Delete ${d.name}?`) && db.remove('departments', d.id))}
                    aria-label="Delete"
                  >
                    <Trash2 size={14} />
                  </Button>
                </div>
              </div>
              <div className="mt-4 flex items-center gap-2 text-sm">
                <Avatar name={head?.full_name} size={24} />
                <span className="text-neutral-600">{head ? head.full_name : 'No head assigned'}</span>
              </div>
              <div className="mt-4 space-y-2 text-xs">
                <div className="flex justify-between text-neutral-500">
                  <span>{people.length} people · present today</span>
                  <span>{people.length ? Math.round((present / people.length) * 100) : 0}%</span>
                </div>
                <Progress value={people.length ? (present / people.length) * 100 : 0} />
                <div className="flex justify-between text-neutral-500">
                  <span>OKR progress ({objs.length} objectives)</span>
                  <span>{Math.round(okr)}%</span>
                </div>
                <Progress value={okr} />
              </div>
              <div className="mt-3">
                <Badge tone={d.dashboard_widgets?.length ? 'violet' : 'neutral'}>{d.dashboard_widgets?.length ? `Custom dashboard · ${d.dashboard_widgets.length} widgets` : 'Uses role dashboards'}</Badge>
              </div>
            </Card>
          );
        })}
      </div>
      {editing && <DeptForm initial={editing} people={ws.profiles} onClose={() => setEditing(null)} />}
    </div>
  );
}

function DeptForm({ initial, people, onClose }: { initial: Partial<Department>; people: { id: string; full_name: string }[]; onClose: () => void }) {
  const [name, setName] = useState(initial.name ?? '');
  const [description, setDescription] = useState(initial.description ?? '');
  const [color, setColor] = useState(initial.color ?? '#059669');
  const [head, setHead] = useState(initial.head_id ?? '');
  const [custom, setCustom] = useState(!!initial.dashboard_widgets?.length);
  const [widgets, setWidgets] = useState<WidgetId[]>(initial.dashboard_widgets ?? ['welcome', 'my_shift', 'my_okrs', 'my_tasks', 'announcements']);
  const [err, setErr] = useState('');

  async function save() {
    if (!name.trim()) return setErr('Name is required');
    try {
      const row = { name, description, color, head_id: head || null, dashboard_widgets: custom ? widgets : null };
      if (initial.id) await db.update('departments', initial.id, row);
      else {
        const d = await db.insert('departments', row);
        await db.insert('channels', { name: name.toLowerCase().replace(/[^a-z0-9]+/g, '-'), description: `${name} team`, type: 'department', department_id: d.id, member_ids: [], created_by: head || people[0]?.id });
      }
      onClose();
    } catch (e) {
      setErr(errMsg(e));
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={initial.id ? `Edit ${initial.name}` : 'New department'}
      wide
      footer={
        <div className="flex w-full items-center justify-between gap-3">
          <div className="min-w-0 flex-1">
            <ErrorNote text={err} />
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Button variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={save}>Save</Button>
          </div>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="grid gap-3 md:grid-cols-3">
          <Field label="Name" className="md:col-span-2">
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </Field>
          <Field label="Colour">
            <Input type="color" className="h-10 p-1" value={color} onChange={(e) => setColor(e.target.value)} />
          </Field>
          <Field label="Description" className="md:col-span-2">
            <Textarea rows={1} value={description} onChange={(e) => setDescription(e.target.value)} />
          </Field>
          <Field label="Head">
            <Select value={head} onChange={(e) => setHead(e.target.value)}>
              <option value="">None</option>
              {people.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.full_name}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        <Toggle checked={custom} onChange={setCustom} label="Custom dashboard for this department" hint="Overrides the role dashboard for managers and members in this department" />
        {custom && (
          <div className="grid gap-2 sm:grid-cols-2">
            {WIDGETS.map((w) => (
              <label key={w.id} className="flex cursor-pointer items-start gap-2 rounded-xl border border-neutral-200 p-2.5 text-sm hover:bg-neutral-50">
                <input type="checkbox" className="mt-0.5" checked={widgets.includes(w.id)} onChange={(e) => setWidgets(e.target.checked ? [...widgets, w.id] : widgets.filter((x) => x !== w.id))} />
                <span>
                  <span className="block font-medium">{w.label}</span>
                  <span className="text-xs text-neutral-500">{w.description}</span>
                </span>
              </label>
            ))}
          </div>
        )}
      </div>
    </Modal>
  );
}
