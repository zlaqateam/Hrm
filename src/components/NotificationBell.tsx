'use client';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Bell, CalendarDays, CheckCheck, Heart, ListTodo, MessageSquare, Target } from 'lucide-react';
import { useMe } from '@/lib/auth';
import { db } from '@/lib/data';
import { useTable } from '@/lib/hooks';
import { timeAgo } from '@/lib/format';
import { cn } from './ui';

const ICON = { kudos: Heart, task: ListTodo, leave: CalendarDays, chat: MessageSquare, okr: Target } as const;
const TINT: Record<string, string> = {
  kudos: 'bg-pink-50 text-pink-700',
  task: 'bg-violet-50 text-violet-700',
  leave: 'bg-teal-50 text-teal-700',
  chat: 'bg-emerald-50 text-emerald-700',
  okr: 'bg-amber-50 text-amber-700',
};

export function NotificationBell() {
  const { me } = useMe();
  const router = useRouter();
  const n = useTable('notifications', { filter: { user_id: me.id }, order: ['created_at', 'desc'], limit: 40 });
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && setOpen(false);
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [open]);

  const unread = n.rows.filter((x) => !x.read_at);
  const markAll = () => Promise.all(unread.map((x) => db.update('notifications', x.id, { read_at: new Date().toISOString() })));

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        aria-label="Notifications"
        className="relative grid h-9 w-9 place-items-center rounded-xl text-neutral-600 transition hover:bg-neutral-100 hover:text-neutral-900 active:scale-95"
      >
        <Bell size={18} />
        {unread.length > 0 && (
          <span key={unread.length} className="absolute right-1 top-1 grid h-4 min-w-4 animate-pop place-items-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white">
            {unread.length > 9 ? '9+' : unread.length}
          </span>
        )}
      </button>
      {open && (
        <div className="fixed inset-x-3 top-16 z-50 origin-top-right animate-scale-in overflow-hidden rounded-2xl border border-neutral-200 bg-surface shadow-2xl sm:absolute sm:inset-x-auto sm:right-0 sm:top-11 sm:w-[380px]">
          <div className="flex items-center justify-between border-b border-neutral-200 px-4 py-3">
            <span className="text-sm font-semibold">Notifications</span>
            {unread.length > 0 && (
              <button onClick={markAll} className="flex items-center gap-1 text-xs text-neutral-500 hover:text-neutral-900">
                <CheckCheck size={14} /> Mark all read
              </button>
            )}
          </div>
          <div className="max-h-[65vh] overflow-y-auto">
            {n.rows.length ? (
              n.rows.map((x) => {
                const Icon = ICON[x.kind as keyof typeof ICON] ?? Bell;
                return (
                  <button
                    key={x.id}
                    onClick={async () => {
                      setOpen(false);
                      if (!x.read_at) db.update('notifications', x.id, { read_at: new Date().toISOString() });
                      if (x.link) router.push(x.link);
                    }}
                    className={cn('flex w-full gap-3 border-b border-neutral-100 px-4 py-3 text-left transition hover:bg-neutral-50', !x.read_at && 'bg-neutral-50/60')}
                  >
                    <span className={cn('grid h-8 w-8 shrink-0 place-items-center rounded-xl', TINT[x.kind] ?? 'bg-neutral-100 text-neutral-600')}>
                      <Icon size={15} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">{x.title}</span>
                      {x.body && <span className="block truncate text-xs text-neutral-500">{x.body}</span>}
                      <span className="text-[11px] text-neutral-400">{timeAgo(x.created_at)}</span>
                    </span>
                    {!x.read_at && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-rose-500" />}
                  </button>
                );
              })
            ) : (
              <div className="py-12 text-center text-sm text-neutral-500">You&apos;re all caught up ✨</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
