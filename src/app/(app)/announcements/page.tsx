'use client';
import { useState } from 'react';
import { Pin, Plus, Trash2 } from 'lucide-react';
import { useMe } from '@/lib/auth';
import { db } from '@/lib/data';
import { useTable } from '@/lib/hooks';
import { errMsg, fmtDateTime } from '@/lib/format';
import { isAdminOrAbove } from '@/lib/permissions';
import { Avatar, Badge, Button, Card, Empty, ErrorNote, Field, Input, Modal, PageHeader, Select, Textarea } from '@/components/ui';

export default function AnnouncementsPage() {
  const { me } = useMe();
  const ann = useTable('announcements', { order: ['created_at', 'desc'] });
  const profiles = useTable('profiles');
  const departments = useTable('departments', { order: ['name', 'asc'] });
  const [creating, setCreating] = useState(false);
  const admin = isAdminOrAbove(me);

  const list = ann.rows
    .filter((a) => !a.department_id || a.department_id === me.department_id || admin)
    .sort((a, b) => Number(b.pinned) - Number(a.pinned));

  return (
    <div>
      <PageHeader
        title="Announcements"
        subtitle="Company-wide and department updates"
        actions={
          admin && (
            <Button onClick={() => setCreating(true)}>
              <Plus size={16} /> New announcement
            </Button>
          )
        }
      />
      {list.length ? (
        <div className="space-y-4">
          {list.map((a) => {
            const d = departments.rows.find((x) => x.id === a.department_id);
            const author = profiles.rows.find((p) => p.id === a.created_by)?.full_name;
            return (
              <Card key={a.id} className={a.pinned ? 'ring-1 ring-amber-200' : ''}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      {a.pinned && <Badge tone="amber">Pinned</Badge>}
                      <Badge tone={d ? 'violet' : 'brand'}>{d ? d.name : 'Everyone'}</Badge>
                    </div>
                    <h3 className="mt-2 text-lg font-semibold">{a.title}</h3>
                  </div>
                  {admin && (
                    <div className="flex gap-1">
                      <Button size="sm" variant="ghost" onClick={() => db.update('announcements', a.id, { pinned: !a.pinned })} aria-label="Pin">
                        <Pin size={14} />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => confirm('Delete announcement?') && db.remove('announcements', a.id)} aria-label="Delete">
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  )}
                </div>
                <p className="mt-2 whitespace-pre-wrap text-sm text-neutral-700">{a.body}</p>
                <div className="mt-3 flex items-center gap-2 text-xs text-neutral-500">
                  <Avatar name={author} size={20} /> {author} · {fmtDateTime(a.created_at)}
                </div>
              </Card>
            );
          })}
        </div>
      ) : (
        <Empty text="No announcements yet." />
      )}
      {creating && <NewAnnouncement onClose={() => setCreating(false)} departments={departments.rows} />}
    </div>
  );
}

function NewAnnouncement({ onClose, departments }: { onClose: () => void; departments: { id: string; name: string }[] }) {
  const { me } = useMe();
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [dept, setDept] = useState(me.role === 'admin' ? me.department_id ?? '' : '');
  const [pinned, setPinned] = useState(false);
  const [err, setErr] = useState('');
  async function save() {
    if (!title.trim()) return setErr('Title is required');
    try {
      await db.insert('announcements', { title, body, department_id: dept || null, pinned, created_by: me.id });
      onClose();
    } catch (e) {
      setErr(errMsg(e));
    }
  }
  return (
    <Modal
      open
      onClose={onClose}
      title="New announcement"
      footer={
        <div className="flex w-full items-center justify-between gap-3">
          <div className="min-w-0 flex-1">
            <ErrorNote text={err} />
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Button variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={save}>Publish</Button>
          </div>
        </div>
      }
    >
      <div className="space-y-3.5">
        <Field label="Title">
          <Input value={title} onChange={(e) => setTitle(e.target.value)} />
        </Field>
        <Field label="Message">
          <Textarea rows={5} value={body} onChange={(e) => setBody(e.target.value)} />
        </Field>
        <Field label="Audience">
          <Select value={dept} onChange={(e) => setDept(e.target.value)}>
            <option value="">Everyone</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </Select>
        </Field>
        <label className="flex items-center gap-2 text-sm text-neutral-700">
          <input type="checkbox" checked={pinned} onChange={(e) => setPinned(e.target.checked)} /> Pin to top
        </label>
      </div>
    </Modal>
  );
}
