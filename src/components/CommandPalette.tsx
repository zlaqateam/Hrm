'use client';
// Ctrl/Cmd + K: jump to any page, person or action.
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CalendarDays, Clock, CornerDownLeft, Heart, ListTodo, LogOut, Moon, Search, User, type LucideIcon } from 'lucide-react';
import { useMe } from '@/lib/auth';
import { useTable } from '@/lib/hooks';
import { useTheme } from '@/lib/theme';
import { cn } from './ui';
import type { NavItem } from './Shell';

interface Cmd {
  id: string;
  label: string;
  hint?: string;
  group: string;
  icon: LucideIcon;
  run: () => void;
}

export function CommandPalette({ open, onClose, items }: { open: boolean; onClose: () => void; items: NavItem[] }) {
  const { me, signOut, settings } = useMe();
  const { toggle } = useTheme();
  const router = useRouter();
  const profiles = useTable('profiles', { order: ['full_name', 'asc'] }, open && me.role !== 'member');
  const [q, setQ] = useState('');
  const [i, setI] = useState(0);
  const input = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      setQ('');
      setI(0);
      setTimeout(() => input.current?.focus(), 20);
    }
  }, [open]);

  const go = (href: string) => () => router.push(href);
  const cmds: Cmd[] = [
    { id: 'a-in', label: 'Check in / check out', group: 'Actions', icon: Clock, run: go('/attendance') },
    ...(settings.modules.kudos !== false ? [{ id: 'a-kudos', label: 'Send kudos', group: 'Actions', icon: Heart, run: go('/kudos?new=1') }] : []),
    ...(settings.modules.leave !== false ? [{ id: 'a-leave', label: 'Apply for leave', group: 'Actions', icon: CalendarDays, run: go('/leave?new=1') }] : []),
    ...(settings.modules.tasks !== false ? [{ id: 'a-task', label: 'New task', group: 'Actions', icon: ListTodo, run: go('/tasks?new=1') }] : []),
    { id: 'a-theme', label: 'Toggle dark mode', group: 'Actions', icon: Moon, run: toggle },
    ...items.map((n) => ({ id: n.href, label: n.label, hint: n.section, group: 'Go to', icon: n.icon, run: go(n.href) })),
    { id: 'a-profile', label: 'My profile', group: 'Go to', icon: User, run: go('/profile') },
    ...profiles.rows
      .filter((p) => p.status === 'active' && p.id !== me.id)
      .map((p) => ({ id: 'p-' + p.id, label: p.full_name, hint: p.designation, group: 'People', icon: User, run: go(`/employees/${p.id}`) })),
    { id: 'a-out', label: 'Sign out', group: 'Account', icon: LogOut, run: () => signOut() },
  ];
  const ql = q.toLowerCase().trim();
  const rank = (c: Cmd) => {
    const l = c.label.toLowerCase();
    return l.startsWith(ql) ? 0 : l.split(/\s+/).some((w) => w.startsWith(ql)) ? 1 : l.includes(ql) ? 2 : 3;
  };
  const list = ql
    ? cmds
        .filter((c) => `${c.label} ${c.hint ?? ''} ${c.group}`.toLowerCase().includes(ql))
        .map((c) => ({ c, r: rank(c) }))
        .sort((a, b) => a.r - b.r)
        .map((x) => ({ ...x.c, group: x.r < 3 ? 'Best matches' : 'Related' }))
        .slice(0, 50)
    : cmds.slice(0, 50);

  useEffect(() => {
    listRef.current?.querySelector(`[data-i="${i}"]`)?.scrollIntoView({ block: 'nearest' });
  }, [i]);

  if (!open) return null;
  const run = (c?: Cmd) => {
    if (!c) return;
    onClose();
    c.run();
  };

  let lastGroup = '';
  return (
    <div className="fixed inset-0 z-[70] flex animate-fade-in items-start justify-center bg-black/45 p-3 pt-[10vh] backdrop-blur-[2px]" onMouseDown={onClose}>
      <div className="w-full max-w-xl animate-scale-in overflow-hidden rounded-2xl border border-neutral-200 bg-surface shadow-2xl" onMouseDown={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-3 border-b border-neutral-200 px-4">
          <Search size={18} className="text-neutral-400" />
          <input
            ref={input}
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setI(0);
            }}
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown') {
                e.preventDefault();
                setI((x) => Math.min(list.length - 1, x + 1));
              } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setI((x) => Math.max(0, x - 1));
              } else if (e.key === 'Enter') run(list[i]);
              else if (e.key === 'Escape') onClose();
            }}
            placeholder="Type a page, a person or an action…"
            className="h-14 flex-1 bg-transparent text-base outline-none placeholder:text-neutral-400"
          />
          <kbd className="rounded-md border border-neutral-200 px-1.5 py-0.5 text-[10px] text-neutral-500">ESC</kbd>
        </div>
        <div ref={listRef} className="max-h-[55vh] overflow-y-auto p-2">
          {list.map((c, idx) => {
            const header = c.group !== lastGroup;
            lastGroup = c.group;
            return (
              <div key={c.id}>
                {header && <div className="px-3 pb-1 pt-3 text-[10px] font-semibold uppercase tracking-widest text-neutral-400">{c.group}</div>}
                <button
                  data-i={idx}
                  onMouseEnter={() => setI(idx)}
                  onClick={() => run(c)}
                  className={cn('flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition', idx === i ? 'bg-neutral-100 text-neutral-900' : 'text-neutral-700')}
                >
                  <c.icon size={16} className="shrink-0 text-neutral-500" />
                  <span className="flex-1 truncate">{c.label}</span>
                  {c.hint && <span className="truncate text-xs text-neutral-400">{c.hint}</span>}
                  {idx === i && <CornerDownLeft size={14} className="text-neutral-400" />}
                </button>
              </div>
            );
          })}
          {!list.length && <div className="py-10 text-center text-sm text-neutral-500">No results for “{q}”</div>}
        </div>
        <div className="flex gap-4 border-t border-neutral-200 px-4 py-2 text-[11px] text-neutral-400">
          <span>↑↓ navigate</span>
          <span>↵ open</span>
          <span>esc close</span>
        </div>
      </div>
    </div>
  );
}
