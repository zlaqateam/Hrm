// Supabase adapter: production backend.
// Security is enforced by Row Level Security in supabase/migrations, not here.
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { DataAdapter, ListOptions, NewUserInput } from './adapter';
import type { Profile, TableName, Tables } from '../types';

let client: SupabaseClient | null = null;

export function supabase(): SupabaseClient {
  if (!client) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key) throw new Error('Supabase env vars missing. See .env.example');
    client = createClient(url, key, { auth: { persistSession: true, autoRefreshToken: true } });
  }
  return client;
}

function check<T>(res: { data: T; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message);
  return res.data;
}

function dataUrlToBlob(dataUrl: string): Blob {
  const [head, b64] = dataUrl.split(',');
  const mime = head.match(/data:(.*?);/)?.[1] ?? 'image/jpeg';
  const bin = atob(b64);
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return new Blob([arr], { type: mime });
}

export const supabaseAdapter: DataAdapter = {
  mode: 'supabase',

  async signIn(email, password) {
    const { data, error } = await supabase().auth.signInWithPassword({ email, password });
    if (error || !data.user) throw new Error(error?.message ?? 'Sign in failed');
    return { id: data.user.id, email: data.user.email ?? email };
  },
  async signOut() {
    await supabase().auth.signOut();
  },
  async getSession() {
    const { data } = await supabase().auth.getSession();
    const u = data.session?.user;
    return u ? { id: u.id, email: u.email ?? '' } : null;
  },
  async changePassword(newPassword) {
    const { error } = await supabase().auth.updateUser({ password: newPassword });
    if (error) throw new Error(error.message);
  },
  async createUser(input: NewUserInput) {
    // Creating auth users needs the service role key, so it runs on the server.
    const { data } = await supabase().auth.getSession();
    const res = await fetch('/api/admin/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${data.session?.access_token ?? ''}` },
      body: JSON.stringify(input),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error ?? 'Could not create user');
    return json as Profile;
  },

  async list<K extends TableName>(table: K, opts: ListOptions = {}) {
    let q = supabase().from(table).select('*');
    if (opts.filter) for (const [k, v] of Object.entries(opts.filter)) q = v === null ? q.is(k, null) : q.eq(k, v as string);
    if (opts.in) q = q.in(opts.in[0], opts.in[1] as string[]);
    if (opts.gte) q = q.gte(opts.gte[0], opts.gte[1]);
    if (opts.lte) q = q.lte(opts.lte[0], opts.lte[1]);
    if (opts.order) q = q.order(opts.order[0], { ascending: opts.order[1] === 'asc' });
    if (opts.limit) q = q.limit(opts.limit);
    return (check(await q) ?? []) as Tables[K][];
  },
  async get<K extends TableName>(table: K, id: string | number) {
    const res = await supabase().from(table).select('*').eq('id', id).maybeSingle();
    return check(res) as Tables[K] | null;
  },
  async insert<K extends TableName>(table: K, row: Partial<Tables[K]>) {
    return check(await supabase().from(table).insert(row as Record<string, unknown>).select().single()) as Tables[K];
  },
  async update<K extends TableName>(table: K, id: string | number, patch: Partial<Tables[K]>) {
    return check(await supabase().from(table).update(patch as Record<string, unknown>).eq('id', id).select().single()) as Tables[K];
  },
  async remove<K extends TableName>(table: K, id: string | number) {
    const { error } = await supabase().from(table).delete().eq('id', id);
    if (error) throw new Error(error.message);
  },

  async uploadFile(bucket, path, dataUrl) {
    const { error } = await supabase().storage.from(bucket).upload(path, dataUrlToBlob(dataUrl), { upsert: true, contentType: 'image/jpeg' });
    if (error) throw new Error(error.message);
    return path;
  },
  async fileUrl(bucket, ref) {
    if (!ref) return '';
    if (ref.startsWith('data:') || ref.startsWith('http')) return ref;
    const { data } = await supabase().storage.from(bucket).createSignedUrl(ref, 3600);
    return data?.signedUrl ?? '';
  },

  subscribe(table, cb) {
    const channel = supabase()
      .channel(`rt-${table}-${Math.random().toString(36).slice(2)}`)
      .on('postgres_changes', { event: '*', schema: 'public', table }, () => cb())
      .subscribe();
    return () => {
      supabase().removeChannel(channel);
    };
  },
};
