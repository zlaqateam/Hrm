'use client';
// Domain-specific small components: status badges, selfie image, charts.
import { useEffect, useState } from 'react';
import { Camera } from 'lucide-react';
import { db } from '@/lib/data';
import type { LiveState } from '@/lib/metrics';
import type { AttendanceStatus, BreakType, OkrStatus } from '@/lib/types';
import { BREAK_LABEL } from '@/lib/types';
import { Badge, CountUp, cn, useMounted, type Tone } from './ui';

export function LiveBadge({ state, breakType }: { state: LiveState; breakType?: BreakType }) {
  const map: Record<LiveState, [string, Tone]> = {
    working: ['Working', 'green'],
    on_break: [breakType ? BREAK_LABEL[breakType] : 'On break', 'amber'],
    checked_out: ['Checked out', 'neutral'],
    not_in: ['Not in', 'red'],
    on_leave: ['On leave', 'violet'],
  };
  const [label, tone] = map[state];
  return (
    <Badge tone={tone}>
      <span className={cn('h-1.5 w-1.5 rounded-full', state === 'working' ? 'animate-pulse-ring bg-emerald-500' : state === 'on_break' ? 'bg-amber-500' : state === 'not_in' ? 'bg-rose-500' : 'bg-neutral-400')} />
      {label}
    </Badge>
  );
}

export function AttendanceBadge({ status }: { status: AttendanceStatus }) {
  const map: Record<AttendanceStatus, [string, Tone]> = {
    present: ['Present', 'green'],
    late: ['Late', 'amber'],
    half_day: ['Half day', 'violet'],
    absent: ['Absent', 'red'],
    on_leave: ['On leave', 'teal'],
  };
  const [label, tone] = map[status] ?? [status, 'neutral'];
  return <Badge tone={tone}>{label}</Badge>;
}

export function OkrStatusBadge({ status }: { status: OkrStatus }) {
  const map: Record<OkrStatus, [string, Tone]> = {
    on_track: ['On track', 'green'],
    at_risk: ['At risk', 'amber'],
    off_track: ['Off track', 'red'],
    done: ['Done', 'violet'],
  };
  const [label, tone] = map[status];
  return <Badge tone={tone}>{label}</Badge>;
}

export function SelfieImg({ refPath, className, onClick }: { refPath: string | null; className?: string; onClick?: (url: string) => void }) {
  const [url, setUrl] = useState('');
  useEffect(() => {
    let on = true;
    if (refPath) db.fileUrl('selfies', refPath).then((u) => on && setUrl(u));
    else setUrl('');
    return () => {
      on = false;
    };
  }, [refPath]);
  if (!refPath || (!url && refPath && !refPath.length)) {
    return (
      <div className={cn('grid place-items-center rounded-lg bg-neutral-100 text-neutral-400', className)} title="No selfie">
        <Camera size={14} />
      </div>
    );
  }
  if (!url) return <div className={cn('animate-pulse rounded-lg bg-neutral-100', className)} />;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={url} alt="selfie" className={cn('rounded-lg object-cover', onClick && 'cursor-zoom-in', className)} onClick={() => onClick?.(url)} />
  );
}

/** Simple vertical bars, values 0-100 */
export function Bars({ data, suffix = '%', height = 160 }: { data: { label: string; value: number; short?: string }[]; suffix?: string; height?: number }) {
  const mounted = useMounted();
  return (
    <div className="flex items-stretch gap-1.5" style={{ height }}>
      {data.map((d, i) => (
        <div key={d.label + i} className="flex h-full flex-1 flex-col items-center gap-1">
          <div className="flex w-full flex-1 items-end">
            <div
              className="w-full rounded-t-md bg-gradient-to-t from-brand/70 to-brand transition-all duration-700 ease-out hover:opacity-80"
              style={{ height: `${mounted ? Math.max(2, Math.min(100, d.value)) : 2}%`, transitionDelay: `${i * 25}ms` }}
              title={`${d.label}: ${Math.round(d.value)}${suffix}`}
            />
          </div>
          <span className="truncate text-[10px] text-neutral-400">{d.short ?? d.label}</span>
        </div>
      ))}
    </div>
  );
}

/** Horizontal labelled bars */
export function HBars({ data }: { data: { label: string; value: number; color?: string }[] }) {
  const mounted = useMounted();
  return (
    <div className="space-y-2.5">
      {data.map((d) => (
        <div key={d.label}>
          <div className="mb-1 flex justify-between text-xs">
            <span className="font-medium text-neutral-700">{d.label}</span>
            <span className="tabular-nums text-neutral-500">{Math.round(d.value)}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-neutral-100">
            <div className="h-full rounded-full transition-[width] duration-700 ease-out" style={{ width: `${mounted ? Math.max(0, Math.min(100, d.value)) : 0}%`, background: d.color ?? 'rgb(var(--brand))' }} />
          </div>
        </div>
      ))}
    </div>
  );
}

export function Ring({ value, size = 96, stroke = 10, label }: { value: number; size?: number; stroke?: number; label?: string }) {
  const mounted = useMounted();
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const v = Math.max(0, Math.min(100, value));
  const color = v >= 75 ? '#059669' : v >= 50 ? '#d97706' : '#e11d48';
  return (
    <div className="relative inline-grid place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} stroke="rgb(var(--n-100))" strokeWidth={stroke} fill="none" />
        <circle cx={size / 2} cy={size / 2} r={r} stroke={color} strokeWidth={stroke} fill="none" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={mounted ? c - (v / 100) * c : c} style={{ transition: 'stroke-dashoffset 1s cubic-bezier(.2,.8,.2,1)' }} />
      </svg>
      <div className="absolute text-center">
        <div className="text-xl font-semibold tabular-nums"><CountUp value={Math.round(v)} /></div>
        {label && <div className="text-[10px] uppercase tracking-wide text-neutral-400">{label}</div>}
      </div>
    </div>
  );
}

export function Wordmark({ className }: { className?: string }) {
  return <span className={cn('font-display font-bold tracking-[0.22em]', className)}>ZLAQA AI</span>;
}
