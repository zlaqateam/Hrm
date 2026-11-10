'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  Building2, CalendarDays, CalendarRange, ClipboardList, Clock, Heart, Home, LayoutDashboard, LayoutTemplate, ListTodo, LogOut,
  Megaphone, Menu, MessageSquare, Moon, Search, Settings, ShieldCheck, Sun, Target, TrendingUp, UserCog, Users, X,
} from 'lucide-react';
import { useMe } from '@/lib/auth';
import { DATA_MODE } from '@/lib/data';
import { useNow, useTable } from '@/lib/hooks';
import { useTheme } from '@/lib/theme';
import { fmtMinutes, startOfToday, todayStr } from '@/lib/format';
import { liveStatus, workedMinutes } from '@/lib/metrics';
import { ROLE_LABEL, type ModuleId, type Role } from '@/lib/types';
import { Avatar, Badge, cn } from './ui';
import { Wordmark } from './bits';
import { CommandPalette } from './CommandPalette';
import { NotificationBell } from './NotificationBell';

export interface NavItem {
  href: string;
  label: string;
  icon: typeof Clock;
  roles?: Role[];
  module?: ModuleId;
  section: string;
}

export const NAV: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, section: 'Overview' },
  { href: '/attendance', label: 'My Attendance', icon: Clock, section: 'Overview' },
  { href: '/team', label: 'Team Tracker', icon: Users, section: 'Overview' },
  { href: '/attendance/records', label: 'Attendance Records', icon: ClipboardList, roles: ['super_admin', 'admin'], section: 'Overview' },
  { href: '/okrs', label: 'OKRs', icon: Target, module: 'okrs', section: 'Performance' },
  { href: '/okrs/templates', label: 'OKR Templates', icon: LayoutTemplate, module: 'okrs', roles: ['super_admin', 'admin'], section: 'Performance' },
  { href: '/performance', label: 'Performance', icon: TrendingUp, module: 'performance', section: 'Performance' },
  { href: '/tasks', label: 'Tasks', icon: ListTodo, module: 'tasks', section: 'Performance' },
  { href: '/chat', label: 'Team Chat', icon: MessageSquare, module: 'chat', section: 'Team' },
  { href: '/kudos', label: 'Kudos', icon: Heart, module: 'kudos', section: 'Team' },
  { href: '/calendar', label: 'Calendar', icon: CalendarRange, module: 'calendar', section: 'Team' },
  { href: '/announcements', label: 'Announcements', icon: Megaphone, module: 'announcements', section: 'Team' },
  { href: '/leave', label: 'Leave', icon: CalendarDays, module: 'leave', section: 'Team' },
  { href: '/employees', label: 'Employees', icon: UserCog, roles: ['super_admin', 'admin'], section: 'Admin' },
  { href: '/departments', label: 'Departments', icon: Building2, roles: ['super_admin'], section: 'Admin' },
  { href: '/settings', label: 'Settings', icon: Settings, roles: ['super_admin'], section: 'Admin' },
  { href: '/audit', label: 'Audit Log', icon: ShieldCheck, roles: ['super_admin'], section: 'Admin' },
];

function IconBtn({ children, onClick, label, className }: { children: ReactNode; onClick?: () => void; label: string; className?: string }) {
  return (
    <button onClick={onClick} aria-label={label} title={label} className={cn('relative grid h-9 w-9 place-items-center rounded-xl text-neutral-600 transition hover:bg-neutral-100 hover:text-neutral-900 active:scale-95', className)}>
      {children}
    </button>
  );
}

/** Live "my shift" status in the top bar. */
function ShiftPill() {
  const { me } = useMe();
  useNow(30000);
  const todayIso = useMemo(() => startOfToday().toISOString(), []);
  const att = useTable('attendance', { filter: { user_id: me.id, date: todayStr() } });
  const brk = useTable('breaks', { filter: { user_id: me.id }, gte: ['start_at', todayIso] });
  const rec = att.rows[0];
  const live = liveStatus(rec, brk.rows);
  if (att.loading) return null;
  const base = 'flex h-9 items-center gap-2 rounded-xl px-3 text-xs font-semibold transition active:scale-95';
  if (live.state === 'not_in')
    return (
      <Link href="/attendance" className={cn(base, 'bg-brand text-on-brand shadow-sm hover:opacity-90')}>
        <Clock size={14} /> <span>Check in</span>
      </Link>
    );
  if (live.state === 'on_break')
    return (
      <Link href="/attendance" className={cn(base, 'bg-amber-50 text-amber-700 ring-1 ring-amber-200')}>
        <span className="h-2 w-2 rounded-full bg-amber-500" /> On break
      </Link>
    );
  if (live.state === 'working' && rec)
    return (
      <Link href="/attendance" className={cn(base, 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200')}>
        <span className="h-2 w-2 animate-pulse-ring rounded-full bg-emerald-500" />
        <span className="tabular-nums">{fmtMinutes(workedMinutes(rec, brk.rows))}</span>
      </Link>
    );
  return (
    <Link href="/attendance" className={cn(base, 'hidden bg-neutral-100 text-neutral-600 sm:flex')}>
      Day done
    </Link>
  );
}

export function Shell({ children }: { children: ReactNode }) {
  const { me, settings, signOut } = useMe();
  const { dark, toggle } = useTheme();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [palette, setPalette] = useState(false);

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setPalette((p) => !p);
      }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, []);
  useEffect(() => setOpen(false), [pathname]);

  const items = NAV.filter((n) => (!n.roles || n.roles.includes(me.role)) && (!n.module || settings.modules[n.module] !== false));
  const active = items.filter((n) => pathname === n.href || pathname.startsWith(n.href + '/')).sort((a, b) => b.href.length - a.href.length)[0]?.href;
  const sections = Array.from(new Set(items.map((i) => i.section)));

  const sidebar = (
    <div className="flex h-full flex-col">
      <div className="px-5 pb-4 pt-6">
        <Link href="/dashboard">
          <Wordmark className="text-lg" />
        </Link>
        <div className="mt-1 text-xs text-neutral-500">{settings.company_name} · Team OS</div>
      </div>
      <nav className="flex-1 space-y-5 overflow-y-auto px-3 pb-4">
        {sections.map((s) => (
          <div key={s}>
            <div className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-widest text-neutral-400">{s}</div>
            {items
              .filter((i) => i.section === s)
              .map((i) => (
                <Link
                  key={i.href}
                  href={i.href}
                  className={cn(
                    'group flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-all duration-150',
                    active === i.href ? 'bg-brand text-on-brand shadow-sm' : 'text-neutral-600 hover:translate-x-0.5 hover:bg-neutral-100 hover:text-neutral-900',
                  )}
                >
                  <i.icon size={17} className="transition-transform group-hover:scale-110" />
                  {i.label}
                </Link>
              ))}
          </div>
        ))}
      </nav>
      <div className="border-t border-neutral-200 p-3">
        <Link href="/profile" className="flex items-center gap-3 rounded-xl p-2 transition hover:bg-neutral-100">
          <Avatar name={me.full_name} size={34} />
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-medium">{me.full_name}</div>
            <div className="truncate text-xs text-neutral-500">{ROLE_LABEL[me.role]}</div>
          </div>
        </Link>
        <button onClick={signOut} className="mt-1 flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm text-neutral-600 transition hover:bg-neutral-100">
          <LogOut size={16} /> Sign out
        </button>
        {DATA_MODE === 'demo' && (
          <div className="mt-2 px-3">
            <Badge tone="amber">Demo mode · data stays in this browser</Badge>
          </div>
        )}
      </div>
    </div>
  );

  const tabs = [
    { href: '/dashboard', label: 'Home', icon: Home },
    { href: '/team', label: 'Team', icon: Users },
    { href: '/attendance', label: 'Attend', icon: Clock, primary: true },
    settings.modules.chat !== false ? { href: '/chat', label: 'Chat', icon: MessageSquare } : { href: '/okrs', label: 'OKRs', icon: Target },
  ];

  return (
    <div className="min-h-screen bg-neutral-50">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r border-neutral-200 bg-surface lg:block">{sidebar}</aside>

      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 animate-fade-in bg-black/40" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-[82vw] max-w-xs animate-slide-in-left bg-surface shadow-2xl">
            <button className="absolute right-3 top-5 rounded-lg p-1 hover:bg-neutral-100" onClick={() => setOpen(false)} aria-label="Close menu">
              <X size={18} />
            </button>
            {sidebar}
          </aside>
        </div>
      )}

      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 flex h-14 items-center gap-2 border-b border-neutral-200/80 bg-surface/80 px-3 backdrop-blur-xl sm:px-6">
          <IconBtn onClick={() => setOpen(true)} label="Open menu" className="lg:hidden">
            <Menu size={20} />
          </IconBtn>
          <Link href="/dashboard" className="lg:hidden">
            <Wordmark className="text-sm" />
          </Link>
          <button
            onClick={() => setPalette(true)}
            className="ml-1 hidden h-9 w-full max-w-md items-center gap-2 rounded-xl border border-neutral-200 bg-neutral-50 px-3 text-sm text-neutral-400 transition hover:border-neutral-300 md:flex"
          >
            <Search size={15} /> Search people, pages, actions…
            <kbd className="ml-auto rounded-md border border-neutral-200 bg-surface px-1.5 py-0.5 text-[10px] font-medium text-neutral-500">Ctrl K</kbd>
          </button>
          <div className="ml-auto flex items-center gap-1">
            <ShiftPill />
            <IconBtn onClick={() => setPalette(true)} label="Search" className="md:hidden">
              <Search size={18} />
            </IconBtn>
            <IconBtn onClick={toggle} label={dark ? 'Light mode' : 'Dark mode'}>
              <span key={String(dark)} className="animate-scale-in">
                {dark ? <Sun size={18} /> : <Moon size={18} />}
              </span>
            </IconBtn>
            <NotificationBell />
          </div>
        </header>

        <main className="pb-28 lg:pb-0">
          <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">{children}</div>
        </main>
      </div>

      {/* mobile bottom tab bar */}
      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-neutral-200 bg-surface/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl lg:hidden">
        <div className="grid grid-cols-5">
          {tabs.map((t) => {
            const on = active === t.href;
            if ('primary' in t && t.primary)
              return (
                <Link key={t.href} href={t.href} className="flex flex-col items-center justify-center" aria-label="Attendance">
                  <span className={cn('-mt-6 grid h-14 w-14 place-items-center rounded-2xl bg-brand text-on-brand shadow-lg ring-4 ring-neutral-50 transition active:scale-90', on && 'scale-105')}>
                    <t.icon size={24} />
                  </span>
                  <span className="mt-0.5 text-[10px] font-medium text-neutral-500">{t.label}</span>
                </Link>
              );
            return (
              <Link key={t.href} href={t.href} className={cn('flex flex-col items-center gap-0.5 py-2.5 text-[10px] font-medium transition active:scale-90', on ? 'text-neutral-900' : 'text-neutral-400')}>
                <t.icon size={21} strokeWidth={on ? 2.4 : 1.8} />
                {t.label}
              </Link>
            );
          })}
          <button onClick={() => setOpen(true)} className="flex flex-col items-center gap-0.5 py-2.5 text-[10px] font-medium text-neutral-400 active:scale-90">
            <Menu size={21} /> More
          </button>
        </div>
      </nav>

      <CommandPalette open={palette} onClose={() => setPalette(false)} items={items} />
    </div>
  );
}
