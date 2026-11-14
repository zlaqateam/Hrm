'use client';
import { useEffect, useMemo, useState } from 'react';
import { firstName, notify } from '@/lib/notify';
import { useToast } from '@/lib/toast';
import { confetti } from '@/lib/delight';
import { ChevronLeft, ChevronRight, Plus, Trash2 } from 'lucide-react';
import { useMe } from '@/lib/auth';
import { db } from '@/lib/data';
import { useTable } from '@/lib/hooks';
import { errMsg, fmtDate, todayStr } from '@/lib/format';
import { canManage, managedTeam } from '@/lib/permissions';
import type { Task, TaskStatus } from '@/lib/types';
import { Avatar, Badge, Button, ErrorNote, Field, Input, Modal, PageHeader, Progress, Select, Textarea } from '@/components/ui';

const COLS: { id: TaskStatus; label: string }[] = [
  { id: 'todo', label: 'To do' },
  { id: 'in_progress', label: 'In progress' },
  { id: 'review', label: 'Review' },
  { id: 'done', label: 'Done' },
];

export default function TasksPage() {
  const { me } = useMe();
  const tasks = useTable('tasks', { order: ['created_at', 'desc'] });
  const profiles = useTable('profiles', { order: ['full_name', 'asc'] });
  const krs = useTable('key_results');
  const [who, setWho] = useState(me.role === 'member' ? me.id : 'all');
  const [creating, setCreating] = useState(false);
  const toast = useToast();
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get('new')) setCreating(true);
  }, []);

  const team = useMemo(() => managedTeam(me, profiles.rows), [me, profiles.rows]);
  const ids = new Set(team.map((p) => p.id));
  const visible = tasks.rows.filter((t) => (me.role === 'super_admin' || (t.assignee_id && ids.has(t.assignee_id)) || t.created_by === me.id || t.department_id === me.department_id) && (who === 'all' || t.assignee_id === who));
  const donePct = visible.length ? (visible.filter((t) => t.status === 'done').length / visible.length) * 100 : 0;
  const pName = (id: string | null) => profiles.rows.find((p) => p.id === id)?.full_name;

  function canEdit(t: Task) {
    if (t.assignee_id === me.id || t.created_by === me.id || me.role === 'super_admin') return true;
    const a = profiles.rows.find((p) => p.id === t.assignee_id);
    return !!a && canManage(me, a);
  }
  const move = (t: Task, dir: -1 | 1) => {
    const i = COLS.findIndex((c) => c.id === t.status) + dir;
    if (i >= 0 && i < COLS.length) {
      db.update('tasks', t.id, { status: COLS[i].id });
      if (COLS[i].id === 'done') {
        confetti({ count: 60 });
        toast('Task done', 'success', t.title);
      }
    }
  };

  return (
    <div>
      <PageHeader
        title="Tasks"
        subtitle={`${visible.length} tasks · ${Math.round(donePct)}% complete`}
        actions={
          <>
            <Select className="w-52" value={who} onChange={(e) => setWho(e.target.value)}>
              <option value="all">Everyone</option>
              {team.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.full_name}
                </option>
              ))}
            </Select>
            <Button onClick={() => setCreating(true)}>
              <Plus size={16} /> New task
            </Button>
          </>
        }
      />
      <Progress value={donePct} className="mb-5" showLabel />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {COLS.map((c) => {
          const col = visible.filter((t) => t.status === c.id);
          return (
            <div key={c.id} className="rounded-2xl bg-neutral-100/70 p-3">
              <div className="mb-3 flex items-center justify-between px-1 text-sm font-semibold">
                {c.label}
                <Badge>{col.length}</Badge>
              </div>
              <div className="space-y-2">
                {col.map((t) => {
                  const overdue = t.due_date && t.status !== 'done' && t.due_date < todayStr();
                  const kr = krs.rows.find((k) => k.id === t.key_result_id);
                  return (
                    <div key={t.id} className="card-hover animate-scale-in rounded-xl border border-neutral-200 bg-surface p-3 shadow-sm">
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-sm font-medium">{t.title}</span>
                        <Badge tone={t.priority === 'high' ? 'red' : t.priority === 'medium' ? 'amber' : 'neutral'}>{t.priority}</Badge>
                      </div>
                      {t.description && <p className="mt-1 line-clamp-2 text-xs text-neutral-500">{t.description}</p>}
                      {kr && <p className="mt-1 truncate text-[11px] text-violet-600">KR: {kr.title}</p>}
                      <div className="mt-3 flex items-center justify-between">
                        <div className="flex items-center gap-1.5 text-xs text-neutral-500">
                          <Avatar name={pName(t.assignee_id)} size={20} />
                          <span className={overdue ? 'font-medium text-rose-600' : ''}>{fmtDate(t.due_date)}</span>
                        </div>
                        {canEdit(t) && (
                          <div className="flex">
                            <button className="rounded p-1 text-neutral-400 hover:bg-neutral-100" onClick={() => move(t, -1)} aria-label="Move left">
                              <ChevronLeft size={15} />
                            </button>
                            <button className="rounded p-1 text-neutral-400 hover:bg-neutral-100" onClick={() => move(t, 1)} aria-label="Move right">
                              <ChevronRight size={15} />
                            </button>
                            {(t.created_by === me.id || me.role === 'super_admin') && (
                              <button className="rounded p-1 text-neutral-400 hover:bg-rose-50 hover:text-rose-600" onClick={() => confirm('Delete task?') && db.remove('tasks', t.id)} aria-label="Delete">
                                <Trash2 size={14} />
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
      {creating && <NewTask onClose={() => setCreating(false)} />}
    </div>
  );
}

function NewTask({ onClose }: { onClose: () => void }) {
  const { me } = useMe();
  const profiles = useTable('profiles', { order: ['full_name', 'asc'] });
  const objectives = useTable('objectives');
  const krs = useTable('key_results');
  const team = managedTeam(me, profiles.rows);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [assignee, setAssignee] = useState(me.id);
  const [priority, setPriority] = useState<Task['priority']>('medium');
  const [due, setDue] = useState('');
  const [kr, setKr] = useState('');
  const [err, setErr] = useState('');
  const toast = useToast();

  const ownerKrs = krs.rows.filter((k) => objectives.rows.find((o) => o.id === k.objective_id)?.owner_id === assignee);

  async function save() {
    if (!title.trim()) return setErr('Title is required');
    try {
      const a = profiles.rows.find((p) => p.id === assignee);
      await db.insert('tasks', { title, description, assignee_id: assignee, department_id: a?.department_id ?? null, status: 'todo', priority, due_date: due || null, key_result_id: kr || null, created_by: me.id });
      if (assignee !== me.id) await notify([assignee], { title: `New task from ${firstName(me.full_name)}`, body: title, link: '/tasks', kind: 'task' });
      toast('Task created', 'success', title);
      onClose();
    } catch (e) {
      setErr(errMsg(e));
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title="New task"
      footer={
        <div className="flex w-full items-center justify-between gap-3">
          <div className="min-w-0 flex-1">
            <ErrorNote text={err} />
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Button variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={save}>Create task</Button>
          </div>
        </div>
      }
    >
      <div className="space-y-3.5">
        <Field label="Title">
          <Input value={title} onChange={(e) => setTitle(e.target.value)} autoFocus />
        </Field>
        <Field label="Details">
          <Textarea value={description} onChange={(e) => setDescription(e.target.value)} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Assignee">
            <Select value={assignee} onChange={(e) => setAssignee(e.target.value)}>
              {team.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.full_name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Priority">
            <Select value={priority} onChange={(e) => setPriority(e.target.value as Task['priority'])}>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </Select>
          </Field>
          <Field label="Due date">
            <Input type="date" value={due} onChange={(e) => setDue(e.target.value)} />
          </Field>
          <Field label="Link to key result">
            <Select value={kr} onChange={(e) => setKr(e.target.value)}>
              <option value="">None</option>
              {ownerKrs.map((k) => (
                <option key={k.id} value={k.id}>
                  {k.title}
                </option>
              ))}
            </Select>
          </Field>
        </div>
      </div>
    </Modal>
  );
}
