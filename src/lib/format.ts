// Small, dependency-free helpers for dates, numbers and files.

export function uuid(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export const pad = (n: number) => String(n).padStart(2, '0');

/** Local date as YYYY-MM-DD */
export function toDateStr(d: Date = new Date()): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
export const todayStr = () => toDateStr(new Date());

export function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

export function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

export function parseDate(s: string): Date {
  return s.length === 10 ? new Date(s + 'T00:00:00') : new Date(s);
}

export function fmtTime(iso?: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export function fmtDate(s?: string | null): string {
  if (!s) return '—';
  return parseDate(s).toLocaleDateString([], { day: '2-digit', month: 'short', year: 'numeric' });
}

export function fmtDay(s: string): string {
  return parseDate(s).toLocaleDateString([], { weekday: 'short', day: '2-digit', month: 'short' });
}

export function fmtDateTime(iso?: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString([], { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}

export function fmtMinutes(m: number): string {
  const v = Math.max(0, Math.round(m));
  const h = Math.floor(v / 60);
  return h ? `${h}h ${pad(v % 60)}m` : `${v}m`;
}

export function fmtClock(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  return `${pad(Math.floor(s / 3600))}:${pad(Math.floor((s % 3600) / 60))}:${pad(s % 60)}`;
}

export function minutesBetween(a: string, b?: string | null): number {
  return (new Date(b ?? Date.now()).getTime() - new Date(a).getTime()) / 60000;
}

/** Build a Date for a local date + "HH:MM" */
export function timeOnDate(date: string, hhmm: string): Date {
  const [h, m] = hhmm.split(':').map(Number);
  const d = new Date(date + 'T00:00:00');
  d.setHours(h || 0, m || 0, 0, 0);
  return d;
}

export const clamp = (n: number, min = 0, max = 100) => Math.max(min, Math.min(max, n));
export const pct = (n: number) => `${Math.round(n)}%`;

export function fmtValue(v: number, unit: string, metric: string): string {
  if (metric === 'boolean') return v >= 1 ? 'Done' : 'Not done';
  if (metric === 'currency') return `${unit || '₹'}${v.toLocaleString()}`;
  if (metric === 'percent') return `${v}%`;
  return `${v.toLocaleString()}${unit ? ' ' + unit : ''}`;
}

export function hexToRgb(hex: string): string {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  const n = parseInt(full, 16);
  if (Number.isNaN(n)) return '17 17 17';
  return `${(n >> 16) & 255} ${(n >> 8) & 255} ${n & 255}`;
}

export function downloadCSV(filename: string, rows: (string | number | null | undefined)[][]) {
  const csv = rows
    .map((r) => r.map((c) => `"${String(c ?? '').replace(/"/g, '""')}"`).join(','))
    .join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}

export function errMsg(e: unknown): string {
  if (e instanceof Error) return e.message;
  if (typeof e === 'object' && e && 'message' in e) return String((e as { message: unknown }).message);
  return String(e);
}

export function timeAgo(iso: string): string {
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  if (s < 604800) return `${Math.floor(s / 86400)}d ago`;
  return fmtDate(iso);
}

/** Distance in metres between a "lat,lng" string and a point (haversine). */
export function distanceMeters(loc: string | null | undefined, lat: number | null, lng: number | null): number | null {
  if (!loc || lat == null || lng == null) return null;
  const [a, b] = loc.split(',').map(Number);
  if (Number.isNaN(a) || Number.isNaN(b)) return null;
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat - a);
  const dLng = toRad(lng - b);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a)) * Math.cos(toRad(lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export const fmtDistance = (m: number) => (m >= 1000 ? `${(m / 1000).toFixed(1)} km` : `${Math.round(m)} m`);

export const MOODS = ['😞', '😕', '😐', '🙂', '😄'];
