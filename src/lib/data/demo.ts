// Demo adapter: a full in-browser backend on localStorage.
// Lets anyone run the app with `npm run dev` and log in with demo credentials.
import type { DataAdapter, ListOptions, NewUserInput, SessionUser } from './adapter';
import type { Profile, TableName, Tables } from '../types';
import { buildSeed, type SeedData } from './seed';
import { uuid } from '../format';

const KEY = 'zlaqa_os_demo_v2';
const SESSION_KEY = 'zlaqa_os_demo_session';
const FILES_KEY = 'zlaqa_os_demo_files';
const EVENT = 'zlaqa-db';
const AUDITED = new Set<TableName>([
  'profiles', 'departments', 'attendance', 'objectives', 'key_results', 'okr_templates', 'tasks',
  'leave_requests', 'announcements', 'org_settings', 'channels', 'holidays',
]);

let cache: SeedData | null = null;
const isBrowser = () => typeof window !== 'undefined';
const clone = <T,>(v: T): T => JSON.parse(JSON.stringify(v));

function load(): SeedData {
  if (cache) return cache;
  if (!isBrowser()) return (cache = buildSeed());
  const raw = localStorage.getItem(KEY);
  if (raw) {
    try {
      cache = JSON.parse(raw) as SeedData;
      return cache;
    } catch {
      /* fall through and reseed */
    }
  }
  cache = buildSeed();
  persist();
  return cache;
}

function persist(table?: TableName) {
  if (!isBrowser() || !cache) return;
  try {
    localStorage.setItem(KEY, JSON.stringify(cache));
  } catch (e) {
    console.warn('[demo] localStorage is full; data kept in memory only', e);
  }
  window.dispatchEvent(new CustomEvent(EVENT, { detail: table }));
}

if (isBrowser()) {
  window.addEventListener('storage', (e) => {
    if (e.key === KEY) {
      cache = null;
      window.dispatchEvent(new CustomEvent(EVENT, { detail: undefined }));
    }
  });
}

function tableRows(table: TableName): Record<string, unknown>[] {
  const db = load() as unknown as Record<string, Record<string, unknown>[]>;
  if (!db[table]) db[table] = [];
  return db[table];
}

function applyOpts(rows: Record<string, unknown>[], o: ListOptions = {}) {
  let out = rows.filter((row) => {
    if (o.filter) for (const [k, v] of Object.entries(o.filter)) if ((row[k] ?? null) !== (v ?? null)) return false;
    if (o.in && !o.in[1].includes(row[o.in[0]])) return false;
    if (o.gte) { const v = row[o.gte[0]] as string | number | null; if (v == null || v < o.gte[1]) return false; }
    if (o.lte) { const v = row[o.lte[0]] as string | number | null; if (v == null || v > o.lte[1]) return false; }
    return true;
  });
  if (o.order) {
    const [k, dir] = o.order;
    const m = dir === 'desc' ? -1 : 1;
    out = [...out].sort((a, b) => {
      const x = a[k] as string | number, y = b[k] as string | number;
      return (x > y ? 1 : x < y ? -1 : 0) * m;
    });
  }
  if (o.limit) out = out.slice(0, o.limit);
  return out;
}

function session(): SessionUser | null {
  if (!isBrowser()) return null;
  try {
    return JSON.parse(localStorage.getItem(SESSION_KEY) || 'null');
  } catch {
    return null;
  }
}

function audit(table: TableName, action: 'insert' | 'update' | 'delete', row: Record<string, unknown>) {
  if (!AUDITED.has(table)) return;
  const summary = String(row.title ?? row.name ?? row.full_name ?? row.date ?? '');
  tableRows('audit_log').unshift({
    id: uuid(), actor_id: session()?.id ?? null, action, entity: table, entity_id: String(row.id), summary, created_at: new Date().toISOString(),
  });
  const log = tableRows('audit_log');
  if (log.length > 1500) log.length = 1500;
}

function files(): Record<string, string> {
  try {
    return JSON.parse(localStorage.getItem(FILES_KEY) || '{}');
  } catch {
    return {};
  }
}

export const demoAdapter: DataAdapter = {
  mode: 'demo',

  async signIn(email, password) {
    const cred = load().credentials[email.trim().toLowerCase()];
    if (!cred || cred.password !== password) throw new Error('Invalid email or password');
    const s = { id: cred.user_id, email: email.trim().toLowerCase() };
    localStorage.setItem(SESSION_KEY, JSON.stringify(s));
    return s;
  },
  async signOut() {
    localStorage.removeItem(SESSION_KEY);
  },
  async getSession() {
    return session();
  },
  async changePassword(newPassword) {
    const s = session();
    if (!s) throw new Error('Not signed in');
    load().credentials[s.email].password = newPassword;
    persist();
  },
  async createUser(input: NewUserInput) {
    const db = load();
    const email = input.email.trim().toLowerCase();
    if (db.credentials[email]) throw new Error('A user with this email already exists');
    const profile: Profile = {
      id: uuid(), email, full_name: input.full_name, role: input.role, department_id: input.department_id,
      manager_id: input.manager_id, designation: input.designation, phone: input.phone, employee_code: input.employee_code,
      join_date: input.join_date, avatar_url: null, status: 'active', created_at: new Date().toISOString(),
    };
    db.profiles.push(profile);
    db.credentials[email] = { password: input.password, user_id: profile.id };
    audit('profiles', 'insert', profile as unknown as Record<string, unknown>);
    persist('profiles');
    return clone(profile);
  },

  async list<K extends TableName>(table: K, opts?: ListOptions) {
    return clone(applyOpts(tableRows(table), opts)) as unknown as Tables[K][];
  },
  async get<K extends TableName>(table: K, id: string | number) {
    const row = tableRows(table).find((r) => r.id === id);
    return row ? (clone(row) as unknown as Tables[K]) : null;
  },
  async insert<K extends TableName>(table: K, row: Partial<Tables[K]>) {
    const full = { id: uuid(), created_at: new Date().toISOString(), ...row } as Record<string, unknown>;
    tableRows(table).push(full);
    audit(table, 'insert', full);
    persist(table);
    return clone(full) as unknown as Tables[K];
  },
  async update<K extends TableName>(table: K, id: string | number, patch: Partial<Tables[K]>) {
    const rows = tableRows(table);
    const i = rows.findIndex((r) => r.id === id);
    if (i < 0) throw new Error(`${table} ${id} not found`);
    rows[i] = { ...rows[i], ...patch };
    audit(table, 'update', rows[i]);
    persist(table);
    return clone(rows[i]) as unknown as Tables[K];
  },
  async remove<K extends TableName>(table: K, id: string | number) {
    const rows = tableRows(table);
    const i = rows.findIndex((r) => r.id === id);
    if (i >= 0) {
      audit(table, 'delete', rows[i]);
      rows.splice(i, 1);
      persist(table);
    }
  },

  async uploadFile(_bucket, path, dataUrl) {
    const f = files();
    f[path] = dataUrl;
    const keys = Object.keys(f);
    // keep the demo light: most recent 60 photos
    while (keys.length > 60) delete f[keys.shift()!];
    try {
      localStorage.setItem(FILES_KEY, JSON.stringify(f));
    } catch {
      return dataUrl; // storage full: keep inline
    }
    return path;
  },
  async fileUrl(_bucket, ref) {
    if (!ref) return '';
    if (ref.startsWith('data:') || ref.startsWith('http')) return ref;
    return files()[ref] ?? '';
  },

  subscribe(table, cb) {
    if (!isBrowser()) return () => {};
    const h = (e: Event) => {
      const t = (e as CustomEvent).detail;
      if (!t || t === table) cb();
    };
    window.addEventListener(EVENT, h);
    return () => window.removeEventListener(EVENT, h);
  },

  resetDemo() {
    localStorage.removeItem(KEY);
    localStorage.removeItem(FILES_KEY);
    localStorage.removeItem(SESSION_KEY);
    cache = null;
  },
  async exportAll() {
    const { credentials: _c, ...rest } = load();
    return clone(rest) as unknown as Record<string, unknown[]>;
  },
};
