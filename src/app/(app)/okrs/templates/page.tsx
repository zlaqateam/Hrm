'use client';
import { useState } from 'react';
import Link from 'next/link';
import { Copy, Pencil, Plus, Trash2 } from 'lucide-react';
import { useMe } from '@/lib/auth';
import { db } from '@/lib/data';
import { useTable } from '@/lib/hooks';
import { errMsg } from '@/lib/format';
import type { Department, OkrLevel, OkrTemplate, TemplateObjective } from '@/lib/types';
import { Badge, Button, Card, ErrorNote, Field, Input, Modal, PageHeader, RequireRole, Select, Tabs, Textarea } from '@/components/ui';
import { KrEditor, emptyKr } from '@/components/okr';

export default function TemplatesPage() {
  return (
    <RequireRole roles={['super_admin', 'admin']}>
      <Templates />
    </RequireRole>
  );
}

function Templates() {
  const { me } = useMe();
  const templates = useTable('okr_templates', { order: ['name', 'asc'] });
  const departments = useTable('departments', { order: ['name', 'asc'] });
  const [filter, setFilter] = useState<string>('all');
  const [editing, setEditing] = useState<Partial<OkrTemplate> | null>(null);

  const list = templates.rows.filter((t) => filter === 'all' || (filter === 'any' ? !t.department_id : t.department_id === filter));
  const dName = (id: string | null) => departments.rows.find((d) => d.id === id);

  return (
    <div>
      <PageHeader
        title="OKR Templates"
        subtitle="Reusable OKRs per department, role and level. Apply to many people in one click."
        actions={
          <Button onClick={() => setEditing({ name: '', description: '', department_id: me.role === 'admin' ? me.department_id : null, scope: 'individual', objectives: [{ title: '', description: '', key_results: [emptyKr()] }] })}>
            <Plus size={16} /> New template
          </Button>
        }
      />
      <div className="mb-5">
        <Tabs
          value={filter}
          onChange={setFilter}
          tabs={[{ id: 'all', label: 'All' }, { id: 'any', label: 'Any department' }, ...departments.rows.map((d) => ({ id: d.id, label: d.name }))]}
        />
      </div>
      <div className="stagger grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {list.map((t) => {
          const d = dName(t.department_id);
          const krCount = t.objectives.reduce((s, o) => s + o.key_results.length, 0);
          return (
            <Card key={t.id} interactive className="flex flex-col">
              <div className="flex flex-wrap gap-1.5">
                <Badge tone={t.scope === 'company' ? 'brand' : t.scope === 'department' ? 'violet' : 'neutral'}>{t.scope}</Badge>
                {d ? (
                  <Badge>
                    <span className="h-1.5 w-1.5 rounded-full" style={{ background: d.color }} /> {d.name}
                  </Badge>
                ) : (
                  <Badge tone="teal">Any department</Badge>
                )}
              </div>
              <h3 className="mt-2 font-semibold">{t.name}</h3>
              <p className="text-xs text-neutral-500">{t.description}</p>
              <ul className="mt-3 flex-1 space-y-1 text-sm">
                {t.objectives.map((o, i) => (
                  <li key={i} className="text-neutral-700">
                    • {o.title} <span className="text-xs text-neutral-400">({o.key_results.length} KRs)</span>
                  </li>
                ))}
              </ul>
              <div className="mt-4 flex items-center justify-between border-t border-neutral-100 pt-3">
                <span className="text-xs text-neutral-400">
                  {t.objectives.length} objectives · {krCount} KRs
                </span>
                <div className="flex gap-1">
                  <Button size="sm" variant="ghost" onClick={() => setEditing(t)} aria-label="Edit">
                    <Pencil size={14} />
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setEditing({ ...t, id: undefined, name: t.name + ' (copy)' })} aria-label="Duplicate">
                    <Copy size={14} />
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => confirm('Delete template?') && db.remove('okr_templates', t.id)} aria-label="Delete">
                    <Trash2 size={14} />
                  </Button>
                  <Link href={`/okrs?template=${t.id}`}>
                    <Button size="sm">Use</Button>
                  </Link>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
      {editing && <TemplateEditor initial={editing} departments={departments.rows} meId={me.id} lockDept={me.role === 'admin' ? me.department_id : undefined} onClose={() => setEditing(null)} />}
    </div>
  );
}

function TemplateEditor({ initial, departments, meId, lockDept, onClose }: { initial: Partial<OkrTemplate>; departments: Department[]; meId: string; lockDept?: string | null; onClose: () => void }) {
  const [name, setName] = useState(initial.name ?? '');
  const [description, setDescription] = useState(initial.description ?? '');
  const [dept, setDept] = useState(initial.department_id ?? '');
  const [scope, setScope] = useState<OkrLevel>(initial.scope ?? 'individual');
  const [objs, setObjs] = useState<TemplateObjective[]>(initial.objectives ?? []);
  const [err, setErr] = useState('');

  const setObj = (i: number, patch: Partial<TemplateObjective>) => setObjs(objs.map((o, j) => (j === i ? { ...o, ...patch } : o)));

  async function save() {
    if (!name.trim()) return setErr('Name is required');
    const clean = objs.filter((o) => o.title.trim()).map((o) => ({ ...o, key_results: o.key_results.filter((k) => k.title.trim()) }));
    if (!clean.length) return setErr('Add at least one objective');
    try {
      const row = { name, description, department_id: lockDept !== undefined ? lockDept : dept || null, scope, objectives: clean };
      if (initial.id) await db.update('okr_templates', initial.id, row);
      else await db.insert('okr_templates', { ...row, created_by: meId });
      onClose();
    } catch (e) {
      setErr(errMsg(e));
    }
  }

  return (
    <Modal open onClose={onClose} title={initial.id ? 'Edit template' : 'New template'} wide>
      <div className="space-y-4">
        <div className="grid gap-3 md:grid-cols-3">
          <Field label="Template name" className="md:col-span-3">
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Designer · Quarterly" />
          </Field>
          <Field label="Department">
            <Select value={lockDept !== undefined ? lockDept ?? '' : dept} onChange={(e) => setDept(e.target.value)} disabled={lockDept !== undefined}>
              <option value="">Any department</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Level when applied">
            <Select value={scope} onChange={(e) => setScope(e.target.value as OkrLevel)}>
              <option value="individual">Individual (member)</option>
              <option value="department">Department (manager)</option>
              <option value="company">Company</option>
            </Select>
          </Field>
          <Field label="Description">
            <Input value={description} onChange={(e) => setDescription(e.target.value)} />
          </Field>
        </div>
        {objs.map((o, i) => (
          <div key={i} className="space-y-2 rounded-2xl border border-neutral-200 p-3">
            <div className="flex gap-2">
              <Input placeholder={`Objective ${i + 1}`} value={o.title} onChange={(e) => setObj(i, { title: e.target.value })} />
              <Button variant="ghost" onClick={() => setObjs(objs.filter((_, j) => j !== i))} aria-label="Remove objective">
                <Trash2 size={15} />
              </Button>
            </div>
            <Textarea rows={1} placeholder="Description (optional)" value={o.description} onChange={(e) => setObj(i, { description: e.target.value })} />
            <KrEditor value={o.key_results} onChange={(k) => setObj(i, { key_results: k })} />
          </div>
        ))}
        <Button variant="secondary" onClick={() => setObjs([...objs, { title: '', description: '', key_results: [emptyKr()] }])}>
          <Plus size={15} /> Add objective
        </Button>
        <ErrorNote text={err} />
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={save}>Save template</Button>
        </div>
      </div>
    </Modal>
  );
}
