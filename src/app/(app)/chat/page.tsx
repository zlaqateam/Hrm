'use client';
import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { Hash, Lock, MessageCircle, Plus, Send, Trash2, Users } from 'lucide-react';
import { useMe } from '@/lib/auth';
import { db } from '@/lib/data';
import { useTable } from '@/lib/hooks';
import { errMsg, fmtTime, parseDate } from '@/lib/format';
import { firstName, notify } from '@/lib/notify';
import type { Channel } from '@/lib/types';
import { Avatar, Button, ErrorNote, Field, Input, Modal, Select, cn } from '@/components/ui';

export default function ChatPage() {
  const { me } = useMe();
  const channels = useTable('channels', { order: ['created_at', 'asc'] });
  const profiles = useTable('profiles', { order: ['full_name', 'asc'] });
  const departments = useTable('departments');
  const [active, setActive] = useState('');
  const [text, setText] = useState('');
  const [newCh, setNewCh] = useState(false);
  const [newDm, setNewDm] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  const visible = useMemo(
    () =>
      channels.rows.filter(
        (c) => c.type === 'public' || (c.type === 'department' && c.department_id === me.department_id) || c.member_ids.includes(me.id) || c.created_by === me.id || me.role === 'super_admin',
      ),
    [channels.rows, me],
  );
  useEffect(() => {
    if (!active && visible.length) setActive(visible[0].id);
  }, [visible, active]);

  const msgs = useTable('messages', { filter: { channel_id: active }, order: ['created_at', 'desc'], limit: 200 }, !!active);
  const list = [...msgs.rows].reverse();
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [list.length, active]);

  const pName = (id: string) => profiles.rows.find((p) => p.id === id)?.full_name ?? 'Someone';
  const isDm = (c: Channel) => c.type === 'private' && c.member_ids.length === 2 && c.name === 'dm';
  const label = (c: Channel) => (isDm(c) ? pName(c.member_ids.find((x) => x !== me.id) ?? me.id) : c.name);
  const ch = visible.find((c) => c.id === active);

  async function send(e: FormEvent) {
    e.preventDefault();
    const body = text.trim();
    if (!body || !active) return;
    setText('');
    await db.insert('messages', { channel_id: active, user_id: me.id, body });
    if (!ch) return;
    // DMs notify the other person; @mentions notify whoever is named
    const mentioned = profiles.rows.filter((p) => p.id !== me.id && body.toLowerCase().includes('@' + firstName(p.full_name).toLowerCase())).map((p) => p.id);
    const targets = isDm(ch) ? ch.member_ids.filter((x) => x !== me.id) : mentioned;
    if (targets.length)
      notify(targets, { title: isDm(ch) ? `Message from ${firstName(me.full_name)}` : `${firstName(me.full_name)} mentioned you in #${ch.name}`, body: body.slice(0, 120), link: '/chat', kind: 'chat' });
  }

  const groups: [string, Channel[]][] = [
    ['Channels', visible.filter((c) => c.type === 'public')],
    ['Departments', visible.filter((c) => c.type === 'department')],
    ['Private', visible.filter((c) => c.type === 'private' && !isDm(c))],
    ['Direct messages', visible.filter(isDm)],
  ];

  let lastDay = '';

  return (
    <div className="-mx-4 -mb-28 -mt-6 flex h-[calc(100dvh-56px-76px)] sm:-mx-6 lg:-mx-8 lg:-mb-8 lg:-mt-8 lg:h-[calc(100vh-56px)]">
      <aside className="hidden w-64 shrink-0 flex-col border-r border-neutral-200 bg-surface md:flex">
        <div className="flex items-center justify-between border-b border-neutral-200 p-4">
          <span className="font-semibold">Team Chat</span>
          <div className="flex gap-1">
            <button className="rounded-lg p-1.5 hover:bg-neutral-100" title="Direct message" onClick={() => setNewDm(true)}>
              <MessageCircle size={16} />
            </button>
            <button className="rounded-lg p-1.5 hover:bg-neutral-100" title="New channel" onClick={() => setNewCh(true)}>
              <Plus size={16} />
            </button>
          </div>
        </div>
        <div className="flex-1 space-y-4 overflow-y-auto p-3">
          {groups.map(([g, cs]) =>
            cs.length ? (
              <div key={g}>
                <div className="px-2 pb-1 text-[10px] font-semibold uppercase tracking-widest text-neutral-400">{g}</div>
                {cs.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => setActive(c.id)}
                    className={cn('flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm', active === c.id ? 'bg-brand text-on-brand' : 'text-neutral-700 hover:bg-neutral-100')}
                  >
                    {isDm(c) ? <Avatar name={label(c)} size={18} /> : c.type === 'private' ? <Lock size={14} /> : c.type === 'department' ? <Users size={14} /> : <Hash size={14} />}
                    <span className="truncate">{label(c)}</span>
                  </button>
                ))}
              </div>
            ) : null,
          )}
        </div>
      </aside>

      <section className="flex min-w-0 flex-1 flex-col bg-surface">
        <header className="flex items-center gap-3 border-b border-neutral-200 px-4 py-3">
          <Select className="w-44 md:hidden" value={active} onChange={(e) => setActive(e.target.value)}>
            {visible.map((c) => (
              <option key={c.id} value={c.id}>
                {label(c)}
              </option>
            ))}
          </Select>
          <div className="hidden md:block">
            <div className="font-semibold">{ch ? (isDm(ch) ? label(ch) : `# ${ch.name}`) : ''}</div>
            <div className="text-xs text-neutral-500">{ch?.description}</div>
          </div>
          {ch && (ch.created_by === me.id || me.role === 'super_admin') && ch.type !== 'department' && (
            <button className="ml-auto rounded-lg p-1.5 text-neutral-400 hover:bg-rose-50 hover:text-rose-600" title="Delete channel" onClick={() => confirm('Delete this channel and its messages?') && db.remove('channels', ch.id).then(() => setActive(''))}>
              <Trash2 size={16} />
            </button>
          )}
        </header>

        <div className="flex-1 space-y-1 overflow-y-auto px-4 py-4">
          {list.map((m, i) => {
            const day = parseDate(m.created_at).toDateString();
            const showDay = day !== lastDay;
            lastDay = day;
            const prev = list[i - 1];
            const compact = !showDay && prev && prev.user_id === m.user_id && new Date(m.created_at).getTime() - new Date(prev.created_at).getTime() < 5 * 60000;
            return (
              <div key={m.id}>
                {showDay && (
                  <div className="my-4 flex items-center gap-3 text-[11px] text-neutral-400">
                    <div className="h-px flex-1 bg-neutral-200" />
                    {new Date(m.created_at).toLocaleDateString([], { weekday: 'long', day: 'numeric', month: 'short' })}
                    <div className="h-px flex-1 bg-neutral-200" />
                  </div>
                )}
                <div className={cn('group flex animate-fade-in gap-3 rounded-lg px-2 hover:bg-neutral-50', compact ? 'py-0.5' : 'pt-2', m.user_id === me.id && 'bg-neutral-50/50')}>
                  <div className="w-8 shrink-0">{!compact && <Avatar name={pName(m.user_id)} size={32} />}</div>
                  <div className="min-w-0 flex-1">
                    {!compact && (
                      <div className="flex items-baseline gap-2">
                        <span className="text-sm font-semibold">{pName(m.user_id)}</span>
                        <span className="text-[11px] text-neutral-400">{fmtTime(m.created_at)}</span>
                      </div>
                    )}
                    <p className="whitespace-pre-wrap break-words text-sm text-neutral-800">{m.body}</p>
                  </div>
                  {(m.user_id === me.id || me.role === 'super_admin') && (
                    <button className="invisible self-center text-neutral-300 hover:text-rose-500 group-hover:visible" onClick={() => db.remove('messages', m.id)} aria-label="Delete message">
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
          {!list.length && <p className="py-16 text-center text-sm text-neutral-400">No messages yet. Say hi 👋</p>}
          <div ref={endRef} />
        </div>

        <form onSubmit={send} className="flex gap-2 border-t border-neutral-200 p-3">
          <Input
            placeholder={ch ? `Message ${isDm(ch) ? label(ch) : '#' + ch.name} · use @name to mention` : 'Pick a channel'}
            value={text}
            onChange={(e) => setText(e.target.value)}
            disabled={!ch}
            maxLength={4000}
          />
          <Button type="submit" disabled={!text.trim()}>
            <Send size={16} />
          </Button>
        </form>
      </section>

      {newCh && <NewChannel onClose={() => setNewCh(false)} onCreated={setActive} departments={departments.rows} profiles={profiles.rows} />}
      {newDm && (
        <Modal open onClose={() => setNewDm(false)} title="Direct message">
          <div className="max-h-96 space-y-1 overflow-y-auto">
            {profiles.rows
              .filter((p) => p.id !== me.id && p.status === 'active')
              .map((p) => (
                <button
                  key={p.id}
                  className="flex w-full items-center gap-3 rounded-xl p-2 text-left hover:bg-neutral-100"
                  onClick={async () => {
                    const existing = channels.rows.find((c) => c.name === 'dm' && c.type === 'private' && c.member_ids.includes(me.id) && c.member_ids.includes(p.id));
                    const c = existing ?? (await db.insert('channels', { name: 'dm', description: 'Direct message', type: 'private', department_id: null, member_ids: [me.id, p.id], created_by: me.id }));
                    setActive(c.id);
                    setNewDm(false);
                  }}
                >
                  <Avatar name={p.full_name} size={30} />
                  <div>
                    <div className="text-sm font-medium">{p.full_name}</div>
                    <div className="text-xs text-neutral-500">{p.designation}</div>
                  </div>
                </button>
              ))}
          </div>
        </Modal>
      )}
    </div>
  );
}

function NewChannel({ onClose, onCreated, departments, profiles }: { onClose: () => void; onCreated: (id: string) => void; departments: { id: string; name: string }[]; profiles: { id: string; full_name: string }[] }) {
  const { me } = useMe();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<Channel['type']>(me.role === 'member' ? 'private' : 'public');
  const [dept, setDept] = useState(me.department_id ?? '');
  const [members, setMembers] = useState<string[]>([me.id]);
  const [err, setErr] = useState('');

  async function save() {
    const slug = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    if (!slug) return setErr('Name is required');
    try {
      const c = await db.insert('channels', {
        name: slug, description, type, department_id: type === 'department' ? dept || null : null,
        member_ids: type === 'private' ? Array.from(new Set([me.id, ...members])) : [], created_by: me.id,
      });
      onCreated(c.id);
      onClose();
    } catch (e) {
      setErr(errMsg(e));
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title="New channel"
      footer={
        <div className="flex w-full items-center justify-between gap-3">
          <div className="min-w-0 flex-1">
            <ErrorNote text={err} />
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Button variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={save}>Create</Button>
          </div>
        </div>
      }
    >
      <div className="space-y-3.5">
        <Field label="Name">
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. product-launch" />
        </Field>
        <Field label="Description">
          <Input value={description} onChange={(e) => setDescription(e.target.value)} />
        </Field>
        <Field label="Type">
          <Select value={type} onChange={(e) => setType(e.target.value as Channel['type'])}>
            {me.role !== 'member' && <option value="public">Public · everyone</option>}
            {me.role !== 'member' && <option value="department">Department</option>}
            <option value="private">Private · invited members</option>
          </Select>
        </Field>
        {type === 'department' && (
          <Field label="Department">
            <Select value={dept} onChange={(e) => setDept(e.target.value)}>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </Select>
          </Field>
        )}
        {type === 'private' && (
          <div className="grid max-h-48 gap-1 overflow-y-auto sm:grid-cols-2">
            {profiles
              .filter((p) => p.id !== me.id)
              .map((p) => (
                <label key={p.id} className="flex items-center gap-2 rounded-lg p-1.5 text-sm hover:bg-neutral-50">
                  <input type="checkbox" checked={members.includes(p.id)} onChange={(e) => setMembers(e.target.checked ? [...members, p.id] : members.filter((x) => x !== p.id))} />
                  {p.full_name}
                </label>
              ))}
          </div>
        )}
      </div>
    </Modal>
  );
}
