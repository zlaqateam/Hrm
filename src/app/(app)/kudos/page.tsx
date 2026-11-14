'use client';
import { useEffect, useMemo, useState } from 'react';
import { Heart, Send, Trash2, Trophy } from 'lucide-react';
import { useMe } from '@/lib/auth';
import { db } from '@/lib/data';
import { useTable } from '@/lib/hooks';
import { useToast } from '@/lib/toast';
import { confetti } from '@/lib/delight';
import { errMsg, timeAgo } from '@/lib/format';
import { firstName, notify } from '@/lib/notify';
import { Avatar, Badge, Button, Card, Empty, ErrorNote, Field, Modal, PageHeader, Select, Stat, Tabs, Textarea, cn } from '@/components/ui';

const VALUE_TINT = ['from-pink-50 to-rose-50', 'from-amber-50 to-orange-50', 'from-violet-50 to-fuchsia-50', 'from-emerald-50 to-teal-50', 'from-teal-50 to-cyan-50', 'from-orange-50 to-amber-50'];

export default function KudosPage() {
  const { me, settings } = useMe();
  const kudos = useTable('kudos', { order: ['created_at', 'desc'], limit: 200 });
  const profiles = useTable('profiles', { order: ['full_name', 'asc'] });
  const [sending, setSending] = useState(false);
  const [filter, setFilter] = useState<'all' | 'mine' | 'given'>('all');

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get('new')) setSending(true);
  }, []);

  const name = (id: string) => profiles.rows.find((p) => p.id === id)?.full_name;
  const monthStart = useMemo(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1).toISOString();
  }, []);
  const month = kudos.rows.filter((k) => k.created_at >= monthStart);
  const counts = new Map<string, number>();
  month.forEach((k) => counts.set(k.to_id, (counts.get(k.to_id) ?? 0) + 1));
  const top = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
  const valueCounts = new Map<string, number>();
  month.forEach((k) => valueCounts.set(k.value, (valueCounts.get(k.value) ?? 0) + 1));
  const topValue = [...valueCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? '—';
  const list = kudos.rows.filter((k) => filter === 'all' || (filter === 'mine' ? k.to_id === me.id : k.from_id === me.id));
  const tint = (v: string) => VALUE_TINT[Math.max(0, settings.kudos_values.indexOf(v)) % VALUE_TINT.length];

  return (
    <div>
      <PageHeader
        title="Kudos"
        subtitle="Recognise great work. Every voice, every win."
        actions={
          <Button onClick={() => setSending(true)}>
            <Heart size={16} /> Send kudos
          </Button>
        }
      />
      <div className="stagger mb-5 grid grid-cols-2 gap-4 md:grid-cols-4">
        <Stat label="Kudos this month" value={month.length} icon={<Heart size={16} />} tone="pink" />
        <Stat label="You received" value={kudos.rows.filter((k) => k.to_id === me.id).length} tone="violet" icon={<Trophy size={16} />} />
        <Stat label="You gave" value={kudos.rows.filter((k) => k.from_id === me.id).length} icon={<Send size={16} />} />
        <Stat label="Top value" value={topValue} tone="amber" />
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <div className="mb-4">
            <Tabs value={filter} onChange={setFilter} tabs={[{ id: 'all', label: 'Everyone' }, { id: 'mine', label: 'For me' }, { id: 'given', label: 'From me' }]} />
          </div>
          {list.length ? (
            <div className="stagger grid gap-4 sm:grid-cols-2">
              {list.map((k) => (
                <div key={k.id} className={cn('card-hover group relative rounded-2xl border border-neutral-200 bg-gradient-to-br p-4 dark:from-neutral-100 dark:to-neutral-100', tint(k.value))}>
                  <div className="flex items-center gap-2">
                    <Avatar name={name(k.from_id)} size={30} />
                    <span className="text-lg">→</span>
                    <Avatar name={name(k.to_id)} size={38} />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-semibold">{name(k.to_id)}</div>
                      <div className="truncate text-xs text-neutral-500">from {firstName(name(k.from_id))} · {timeAgo(k.created_at)}</div>
                    </div>
                  </div>
                  <p className="mt-3 text-sm leading-relaxed text-neutral-800">“{k.message}”</p>
                  <div className="mt-3 flex items-center justify-between">
                    <Badge tone="pink">{k.value}</Badge>
                    {(k.from_id === me.id || me.role === 'super_admin') && (
                      <button className="invisible rounded-lg p-1 text-neutral-400 hover:text-rose-600 group-hover:visible" onClick={() => confirm('Remove this kudos?') && db.remove('kudos', k.id)} aria-label="Delete">
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <Empty icon={<Heart size={20} />} text="No kudos here yet.">
              <Button onClick={() => setSending(true)}>Send the first one</Button>
            </Empty>
          )}
        </div>
        <Card title={<><Trophy size={15} className="text-amber-500" /> Most appreciated this month</>} className="h-fit">
          {top.length ? (
            <div className="space-y-3">
              {top.map(([id, n], i) => (
                <div key={id} className="flex items-center gap-3">
                  <span className={cn('grid h-6 w-6 place-items-center rounded-full text-xs font-bold', i === 0 ? 'bg-amber-400 text-white' : i === 1 ? 'bg-neutral-300 text-neutral-800' : i === 2 ? 'bg-orange-300 text-white' : 'bg-neutral-100 text-neutral-500')}>{i + 1}</span>
                  <Avatar name={name(id)} size={30} />
                  <span className="flex-1 truncate text-sm">{name(id)}</span>
                  <Badge tone="pink">
                    <Heart size={10} /> {n}
                  </Badge>
                </div>
              ))}
            </div>
          ) : (
            <Empty text="No kudos this month yet." />
          )}
        </Card>
      </div>

      {sending && <SendKudos onClose={() => setSending(false)} people={profiles.rows.filter((p) => p.status === 'active' && p.id !== me.id)} />}
    </div>
  );
}

function SendKudos({ onClose, people }: { onClose: () => void; people: { id: string; full_name: string }[] }) {
  const { me, settings } = useMe();
  const toast = useToast();
  const [to, setTo] = useState('');
  const [value, setValue] = useState(settings.kudos_values[0] ?? 'Teamwork');
  const [message, setMessage] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  async function send() {
    if (!to) return setErr('Pick a teammate');
    if (message.trim().length < 5) return setErr('Say a little more about what they did');
    setBusy(true);
    try {
      await db.insert('kudos', { from_id: me.id, to_id: to, value, message: message.trim() });
      await notify([to], { title: `${firstName(me.full_name)} sent you kudos`, body: `${value} · ${message.trim().slice(0, 90)}`, link: '/kudos', kind: 'kudos' });
      confetti();
      toast('Kudos sent!', 'success', `${people.find((p) => p.id === to)?.full_name} will be notified.`);
      onClose();
    } catch (e) {
      setErr(errMsg(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title="Send kudos"
      footer={
        <div className="flex w-full items-center justify-between gap-3">
          <div className="min-w-0 flex-1">
            <ErrorNote text={err} />
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Button variant="secondary" onClick={onClose} disabled={busy}>
              Cancel
            </Button>
            <Button onClick={send} disabled={busy}>
              <Heart size={16} /> {busy ? 'Sending…' : 'Send kudos'}
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-4">
        <Field label="To">
          <Select value={to} onChange={(e) => setTo(e.target.value)}>
            <option value="">Choose a teammate</option>
            {people.map((p) => (
              <option key={p.id} value={p.id}>
                {p.full_name}
              </option>
            ))}
          </Select>
        </Field>
        <div>
          <div className="mb-2 text-xs font-medium text-neutral-600">Value</div>
          <div className="flex flex-wrap gap-2">
            {settings.kudos_values.map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setValue(v)}
                className={cn('rounded-full border px-3 py-1.5 text-sm transition active:scale-95', value === v ? 'border-transparent bg-brand text-on-brand shadow-sm' : 'border-neutral-300 text-neutral-700 hover:border-neutral-500')}
              >
                {v}
              </button>
            ))}
          </div>
        </div>
        <Field label="Message" hint={`${message.length}/280`}>
          <Textarea rows={4} value={message} onChange={(e) => setMessage(e.target.value.slice(0, 280))} placeholder="Be specific: what did they do, and why did it matter?" />
        </Field>
      </div>
    </Modal>
  );
}
