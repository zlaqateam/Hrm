'use client';
import { useEffect, useMemo, useState } from 'react';
import { ChevronDown, ChevronUp, LayoutTemplate, Plus, Trash2 } from 'lucide-react';
import { useMe } from '@/lib/auth';
import { db } from '@/lib/data';
import { useTable } from '@/lib/hooks';
import { fmtDate, fmtDateTime, fmtValue } from '@/lib/format';
import { krProgress, krsOf, objectiveProgress } from '@/lib/metrics';
import { canEditObjective, managedTeam } from '@/lib/permissions';
import type { KeyResult, Objective, OkrStatus } from '@/lib/types';
import { Avatar, Badge, Button, Card, Empty, PageHeader, Progress, Select, Stat, Tabs } from '@/components/ui';
import { OkrStatusBadge, Ring } from '@/components/bits';
import { ApplyTemplateModal, KrUpdateModal, ObjectiveModal } from '@/components/okr';

type Tab = 'mine' | 'team' | 'company' | 'all';

export default function OkrsPage() {
  const { me, settings } = useMe();
  const [cycle, setCycle] = useState(settings.current_cycle);
  const [tab, setTab] = useState<Tab>(me.role === 'member' ? 'mine' : 'team');
  const [creating, setCreating] = useState(false);
  const [applying, setApplying] = useState<string | null>(null);
  const [krEdit, setKrEdit] = useState<KeyResult | null>(null);

  const profiles = useTable('profiles', { order: ['full_name', 'asc'] });
  const departments = useTable('departments', { order: ['name', 'asc'] });
  const objectives = useTable('objectives', { filter: { cycle }, order: ['created_at', 'asc'] });
  const krs = useTable('key_results');
  const templates = useTable('okr_templates', { order: ['name', 'asc'] });

  // ?template=<id> from the templates page opens the apply dialog
  useEffect(() => {
    const t = new URLSearchParams(window.location.search).get('template');
    if (t) setApplying(t);
  }, []);

  const team = useMemo(() => managedTeam(me, profiles.rows), [me, profiles.rows]);
  const teamIds = new Set(team.map((p) => p.id));
  const list = objectives.rows.filter((o) => {
    if (tab === 'mine') return o.owner_id === me.id;
    if (tab === 'team') return !!o.owner_id && teamIds.has(o.owner_id) && (o.level !== 'company' || me.role === 'super_admin');
    if (tab === 'company') return o.level === 'company' || o.level === 'department';
    return true;
  });
  const avg = list.length ? list.reduce((s, o) => s + objectiveProgress(krsOf(o.id, krs.rows)), 0) / list.length : 0;
  const canCreate = me.role !== 'member' || settings.members_can_create_okrs;

  const tabs: { id: Tab; label: string }[] = [
    { id: 'mine', label: 'My OKRs' },
    ...(me.role !== 'member' ? [{ id: 'team' as Tab, label: 'My team' }] : []),
    { id: 'company', label: 'Company & departments' },
    ...(me.role === 'super_admin' ? [{ id: 'all' as Tab, label: 'Everything' }] : []),
  ];

  return (
    <div>
      <PageHeader
        title="OKRs"
        subtitle="Objectives and key results, aligned from company to individual"
        actions={
          <>
            <Select className="w-36" value={cycle} onChange={(e) => setCycle(e.target.value)}>
              {settings.okr_cycles.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </Select>
            {me.role !== 'member' && (
              <Button variant="secondary" onClick={() => setApplying(templates.rows[0]?.id ?? '')}>
                <LayoutTemplate size={16} /> Apply template
              </Button>
            )}
            {canCreate && (
              <Button onClick={() => setCreating(true)}>
                <Plus size={16} /> New objective
              </Button>
            )}
          </>
        }
      />

      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <Tabs tabs={tabs} value={tab} onChange={setTab} />
      </div>

      <div className="mb-5 grid grid-cols-2 gap-4 md:grid-cols-4">
        <Stat label="Objectives" value={list.length} />
        <Stat label="Average progress" value={`${Math.round(avg)}%`} tone="violet" />
        <Stat label="At risk / off track" value={list.filter((o) => o.status === 'at_risk' || o.status === 'off_track').length} tone="amber" />
        <Stat label="Done" value={list.filter((o) => o.status === 'done').length} tone="green" />
      </div>

      {list.length ? (
        <div className="stagger grid gap-4 lg:grid-cols-2">
          {list.map((o) => (
            <ObjectiveCard
              key={o.id}
              o={o}
              krs={krsOf(o.id, krs.rows)}
              owner={profiles.rows.find((p) => p.id === o.owner_id)?.full_name}
              parent={objectives.rows.find((x) => x.id === o.parent_id)?.title}
              canEdit={canEditObjective(me, o, profiles.rows)}
              onKr={setKrEdit}
            />
          ))}
        </div>
      ) : (
        <Empty text={`No objectives here for ${cycle}.`}>{canCreate && <Button onClick={() => setCreating(true)}>Create the first one</Button>}</Empty>
      )}

      <ObjectiveModal open={creating} onClose={() => setCreating(false)} me={me} people={team} departments={departments.rows} settings={settings} objectives={objectives.rows} />
      {applying !== null && templates.rows.length > 0 && (
        <ApplyTemplateModal open onClose={() => setApplying(null)} templates={templates.rows} initialId={applying || undefined} people={team} departments={departments.rows} settings={settings} me={me} />
      )}
      {krEdit && <KrUpdateModal kr={krEdit} me={me} onClose={() => setKrEdit(null)} />}
    </div>
  );
}

function ObjectiveCard({ o, krs, owner, parent, canEdit, onKr }: { o: Objective; krs: KeyResult[]; owner?: string; parent?: string; canEdit: boolean; onKr: (k: KeyResult) => void }) {
  const [open, setOpen] = useState(true);
  const [history, setHistory] = useState(false);
  const updates = useTable('kr_updates', { in: ['key_result_id', krs.map((k) => k.id)], order: ['created_at', 'desc'], limit: 10 }, history && krs.length > 0);
  const progress = objectiveProgress(krs);

  return (
    <Card interactive>
      <div className="flex items-start gap-4">
        <Ring value={progress} size={64} stroke={7} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={o.level === 'company' ? 'brand' : o.level === 'department' ? 'violet' : 'neutral'}>{o.level}</Badge>
            {canEdit ? (
              <select className="rounded-full border border-neutral-200 px-2 py-0.5 text-[11px]" value={o.status} onChange={(e) => db.update('objectives', o.id, { status: e.target.value as OkrStatus })}>
                <option value="on_track">On track</option>
                <option value="at_risk">At risk</option>
                <option value="off_track">Off track</option>
                <option value="done">Done</option>
              </select>
            ) : (
              <OkrStatusBadge status={o.status} />
            )}
            {o.due_date && <span className="text-[11px] text-neutral-400">due {fmtDate(o.due_date)}</span>}
          </div>
          <h3 className="mt-1 font-semibold">{o.title}</h3>
          <div className="mt-1 flex items-center gap-2 text-xs text-neutral-500">
            <Avatar name={owner} size={18} /> {owner ?? 'Unassigned'}
            {parent && <span className="truncate">· aligns to “{parent}”</span>}
          </div>
        </div>
        <div className="flex flex-col gap-1">
          <button onClick={() => setOpen(!open)} className="rounded-lg p-1 text-neutral-400 hover:bg-neutral-100" aria-label="Toggle">
            {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
          {canEdit && (
            <button
              onClick={() => confirm('Delete this objective and its key results?') && db.remove('objectives', o.id).then(() => Promise.all(krs.map((k) => db.remove('key_results', k.id))))}
              className="rounded-lg p-1 text-neutral-400 hover:bg-rose-50 hover:text-rose-600"
              aria-label="Delete"
            >
              <Trash2 size={15} />
            </button>
          )}
        </div>
      </div>
      {open && (
        <div className="mt-4 space-y-3">
          {krs.map((k) => (
            <div key={k.id} className="rounded-xl border border-neutral-100 p-3">
              <div className="flex items-start justify-between gap-3">
                <span className="text-sm">{k.title}</span>
                {canEdit && (
                  <Button size="sm" variant="secondary" onClick={() => onKr(k)}>
                    Update
                  </Button>
                )}
              </div>
              <Progress className="mt-2" value={krProgress(k)} showLabel />
              <div className="mt-1 text-[11px] text-neutral-500">
                {fmtValue(Number(k.current_value), k.unit, k.metric_type)} of {fmtValue(Number(k.target_value), k.unit, k.metric_type)}
                {k.metric_type !== 'boolean' && ` · started at ${k.start_value}`}
                {k.weight !== 1 && ` · weight ${k.weight}`}
              </div>
            </div>
          ))}
          <button className="text-xs text-neutral-500 underline" onClick={() => setHistory(!history)}>
            {history ? 'Hide' : 'Show'} check-in history
          </button>
          {history && (
            <div className="space-y-1 text-xs text-neutral-600">
              {updates.rows.length ? (
                updates.rows.map((u) => (
                  <div key={u.id}>
                    {fmtDateTime(u.created_at)} · {krs.find((k) => k.id === u.key_result_id)?.title}: <b>{u.value}</b> {u.note && `— ${u.note}`}
                  </div>
                ))
              ) : (
                <div>No check-ins yet.</div>
              )}
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
