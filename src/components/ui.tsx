'use client';
// Design system. White-first, dark-mode ready, motion built in.
import { useEffect, useState, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import type { Role } from '@/lib/types';

export function cn(...c: (string | false | null | undefined)[]) {
  return c.filter(Boolean).join(' ');
}

/** true one frame after mount — lets bars/rings animate from 0 */
export function useMounted() {
  const [m, setM] = useState(false);
  useEffect(() => {
    const t = requestAnimationFrame(() => setM(true));
    return () => cancelAnimationFrame(t);
  }, []);
  return m;
}

export function Card({ children, className, title, action, interactive }: { children: ReactNode; className?: string; title?: ReactNode; action?: ReactNode; interactive?: boolean }) {
  return (
    <div className={cn('rounded-2xl border border-neutral-200 bg-surface p-5 shadow-sm', interactive && 'card-hover', className)}>
      {(title || action) && (
        <div className="mb-4 flex items-center justify-between gap-2">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-neutral-800">{title}</h3>
          {action}
        </div>
      )}
      {children}
    </div>
  );
}

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'success' | 'warning';
export function Button({ variant = 'primary', size = 'md', className, ...p }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: 'sm' | 'md' | 'lg' }) {
  const v = {
    primary: 'bg-brand text-on-brand hover:opacity-90 shadow-sm',
    secondary: 'border border-neutral-300 bg-surface text-neutral-800 hover:bg-neutral-50',
    ghost: 'text-neutral-700 hover:bg-neutral-100',
    danger: 'bg-rose-600 text-white hover:bg-rose-700 shadow-sm',
    success: 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm',
    warning: 'bg-amber-500 text-white hover:bg-amber-600 shadow-sm',
  }[variant];
  const s = { sm: 'px-2.5 py-1.5 text-xs', md: 'px-4 py-2 text-sm', lg: 'px-5 py-3 text-base' }[size];
  return (
    <button
      type="button"
      className={cn('inline-flex select-none items-center justify-center gap-2 rounded-xl font-medium transition duration-150 active:scale-[.97] disabled:cursor-not-allowed disabled:opacity-50', v, s, className)}
      {...p}
    />
  );
}

export const inputCls = 'rounded-xl border border-neutral-300 bg-surface px-3 py-2 text-sm text-neutral-900 outline-none transition placeholder:text-neutral-400 focus:border-neutral-500 focus:ring-4 focus:ring-neutral-500/10';
const width = (c?: string) => (c && /(^|\s)(sm:|md:)?w-/.test(c) ? '' : 'w-full');
export function Input(p: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...p} className={cn(inputCls, width(p.className), p.className)} />;
}
export function Select(p: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...p} className={cn(inputCls, width(p.className), p.className)} />;
}
export function Textarea(p: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea rows={3} {...p} className={cn(inputCls, width(p.className), p.className)} />;
}

export function Field({ label, children, hint, className }: { label: string; children: ReactNode; hint?: string; className?: string }) {
  return (
    <div className={cn('block space-y-1.5', className)}>
      <span className="block text-xs font-medium text-neutral-600">{label}</span>
      {children}
      {hint && <span className="block text-xs text-neutral-400">{hint}</span>}
    </div>
  );
}

export type Tone = 'neutral' | 'green' | 'amber' | 'red' | 'violet' | 'brand' | 'teal' | 'pink';
const toneCls: Record<Tone, string> = {
  neutral: 'bg-neutral-100 text-neutral-700',
  green: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200',
  amber: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200',
  red: 'bg-rose-50 text-rose-700 ring-1 ring-rose-200',
  violet: 'bg-violet-50 text-violet-700 ring-1 ring-violet-200',
  teal: 'bg-teal-50 text-teal-700 ring-1 ring-teal-200',
  pink: 'bg-pink-50 text-pink-700 ring-1 ring-pink-200',
  brand: 'bg-brand text-on-brand',
};
export const toneClass = (t: Tone) => toneCls[t];
export function Badge({ children, tone = 'neutral', className }: { children: ReactNode; tone?: Tone; className?: string }) {
  return <span className={cn('inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-medium', toneCls[tone], className)}>{children}</span>;
}

export function Progress({ value, className, showLabel }: { value: number; className?: string; showLabel?: boolean }) {
  const mounted = useMounted();
  const v = Math.max(0, Math.min(100, value || 0));
  const color = v >= 70 ? 'from-emerald-400 to-emerald-600' : v >= 40 ? 'from-amber-400 to-amber-500' : 'from-rose-400 to-rose-500';
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-neutral-100">
        <div className={cn('h-full rounded-full bg-gradient-to-r transition-[width] duration-700 ease-out', color)} style={{ width: `${mounted ? v : 0}%` }} />
      </div>
      {showLabel && <span className="w-10 text-right text-xs font-medium tabular-nums text-neutral-600">{Math.round(v)}%</span>}
    </div>
  );
}

export function Modal({
  open,
  onClose,
  title,
  children,
  wide,
  footer,
}: {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  children: ReactNode;
  wide?: boolean;
  footer?: ReactNode;
}) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', h);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', h);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open || !mounted) return null;

  const content = (
    <div
      className="fixed inset-0 z-[60] flex animate-fade-in items-end justify-center bg-black/50 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      onMouseDown={onClose}
    >
      <div
        className={cn(
          'relative flex max-h-[92dvh] w-full flex-col animate-slide-up rounded-t-3xl border border-neutral-200 bg-surface shadow-2xl sm:max-h-[88dvh] sm:animate-scale-in sm:rounded-2xl',
          wide ? 'sm:max-w-3xl' : 'sm:max-w-lg',
        )}
        onMouseDown={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="mx-auto mt-2 h-1 w-10 shrink-0 rounded-full bg-neutral-300 sm:hidden" />
        <div className="flex shrink-0 items-center justify-between border-b border-neutral-100 px-5 py-4 sm:px-6">
          <h2 className="text-base font-semibold text-neutral-900">{title}</h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-neutral-400 transition hover:bg-neutral-100 hover:text-neutral-700"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-5 sm:px-6">
          {children}
        </div>
        {footer && (
          <div className="flex shrink-0 items-center justify-end gap-2 border-t border-neutral-100 bg-neutral-50/70 px-5 py-3.5 sm:px-6">
            {footer}
          </div>
        )}
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(content, document.body) : null;
}

function useCountUp(target: number, ms = 800) {
  const [v, setV] = useState(0);
  useEffect(() => {
    let raf = 0;
    const start = performance.now();
    const step = (t: number) => {
      const p = Math.min(1, (t - start) / ms);
      setV(target * (1 - Math.pow(1 - p, 3)));
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, ms]);
  return v;
}
function Num({ n, suffix = '' }: { n: number; suffix?: string }) {
  const v = useCountUp(n);
  return (
    <>
      {Math.round(v)}
      {suffix}
    </>
  );
}
/** Animates plain numbers and "42%" strings; renders anything else as-is. */
export function CountUp({ value }: { value: ReactNode }) {
  if (typeof value === 'number') return <Num n={value} />;
  if (typeof value === 'string') {
    const m = value.match(/^(\d+(?:\.\d+)?)(%?)$/);
    if (m) return <Num n={Number(m[1])} suffix={m[2]} />;
  }
  return <>{value}</>;
}

export function Stat({ label, value, sub, icon, tone }: { label: string; value: ReactNode; sub?: ReactNode; icon?: ReactNode; tone?: Tone }) {
  return (
    <div className="card-hover rounded-2xl border border-neutral-200 bg-surface p-4 shadow-sm">
      <div className="flex items-center justify-between text-xs font-medium text-neutral-500">
        <span>{label}</span>
        {icon && <span className={cn('rounded-lg p-1.5', tone ? toneCls[tone] : 'bg-neutral-100 text-neutral-600')}>{icon}</span>}
      </div>
      <div className="mt-2 text-2xl font-semibold tabular-nums tracking-tight">
        <CountUp value={value} />
      </div>
      {sub && <div className="mt-0.5 text-xs text-neutral-500">{sub}</div>}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return (
    <div className={cn('relative overflow-hidden rounded-2xl bg-neutral-100', className)}>
      <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-white/30 to-transparent" />
    </div>
  );
}

export function PageSkeleton() {
  return (
    <div className="space-y-5">
      <Skeleton className="h-8 w-56" />
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-24" />
        ))}
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <Skeleton key={i} className="h-48" />
        ))}
      </div>
    </div>
  );
}

export function Empty({ text, children, icon }: { text: string; children?: ReactNode; icon?: ReactNode }) {
  return (
    <div className="animate-fade-in rounded-2xl border border-dashed border-neutral-300 p-8 text-center text-sm text-neutral-500">
      {icon && <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-2xl bg-neutral-100 text-neutral-500">{icon}</div>}
      {text}
      {children && <div className="mt-3">{children}</div>}
    </div>
  );
}

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0 flex-1">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-[28px]">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-neutral-500">{subtitle}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

const avatarColors = [
  'from-emerald-500 to-teal-600', 'from-amber-500 to-orange-600', 'from-rose-500 to-pink-600', 'from-violet-500 to-purple-600',
  'from-teal-500 to-cyan-700', 'from-orange-500 to-red-600', 'from-stone-600 to-stone-900', 'from-pink-500 to-fuchsia-600',
];
export function Avatar({ name, size = 36, className }: { name?: string; size?: number; className?: string }) {
  const n = name || '?';
  const initials = n.replace(/\(.*\)/, '').trim().split(/\s+/).map((w) => w[0]).slice(0, 2).join('').toUpperCase();
  let h = 0;
  for (const c of n) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return (
    <span
      className={cn('inline-grid shrink-0 place-items-center rounded-full bg-gradient-to-br font-semibold text-white ring-2 ring-surface', avatarColors[h % avatarColors.length], className)}
      style={{ width: size, height: size, fontSize: size * 0.38 }}
      title={n}
    >
      {initials}
    </span>
  );
}

export function Tabs<T extends string>({ tabs, value, onChange }: { tabs: { id: T; label: ReactNode }[]; value: T; onChange: (v: T) => void }) {
  return (
    <div className="inline-flex max-w-full gap-1 overflow-x-auto rounded-xl bg-neutral-100 p-1">
      {tabs.map((t) => (
        <button
          key={t.id}
          type="button"
          onClick={() => onChange(t.id)}
          className={cn('whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium transition', value === t.id ? 'bg-surface text-neutral-900 shadow-sm' : 'text-neutral-500 hover:text-neutral-800')}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}

export function Toggle({ checked, onChange, label, hint }: { checked: boolean; onChange: (v: boolean) => void; label: string; hint?: string }) {
  return (
    <label className="flex cursor-pointer items-start justify-between gap-4 rounded-xl border border-neutral-200 p-3 transition hover:border-neutral-300">
      <span>
        <span className="block text-sm font-medium">{label}</span>
        {hint && <span className="block text-xs text-neutral-500">{hint}</span>}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cn('relative mt-0.5 h-6 w-11 shrink-0 rounded-full transition', checked ? 'bg-brand' : 'bg-neutral-300')}
      >
        <span className={cn('absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all', checked ? 'left-[22px]' : 'left-0.5')} />
      </button>
    </label>
  );
}

export function Spinner() {
  return <div className="h-8 w-8 animate-spin rounded-full border-2 border-neutral-200 border-t-neutral-900" />;
}

export function ErrorNote({ text }: { text?: string }) {
  if (!text) return null;
  return <div className="animate-fade-in rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700 ring-1 ring-rose-200">{text}</div>;
}

export function RequireRole({ roles, children }: { roles: Role[]; children: ReactNode }) {
  const { user } = useAuth();
  if (!user || !roles.includes(user.role)) {
    return <Empty text="You don't have access to this page. Ask your Super Admin if you need it." />;
  }
  return <>{children}</>;
}

export function Table({ head, children, className }: { head: ReactNode[]; children: ReactNode; className?: string }) {
  return (
    <div className={cn('overflow-x-auto rounded-2xl border border-neutral-200 bg-surface shadow-sm', className)}>
      <table className="w-full text-left text-sm">
        <thead className="border-b border-neutral-200 bg-neutral-50 text-xs uppercase tracking-wide text-neutral-500">
          <tr>
            {head.map((h, i) => (
              <th key={i} className="whitespace-nowrap px-4 py-3 font-medium">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral-100">{children}</tbody>
      </table>
    </div>
  );
}
export const td = 'px-4 py-3 align-middle';
