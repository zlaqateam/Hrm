// In-app notifications. Fire-and-forget: a failed notification never blocks the action.
import { db } from './data';
import type { Profile } from './types';

export async function notify(userIds: (string | null | undefined)[], n: { title: string; body?: string; link?: string; kind?: string }) {
  const ids = Array.from(new Set(userIds.filter(Boolean))) as string[];
  await Promise.all(
    ids.map((user_id) =>
      db.insert('notifications', { user_id, title: n.title, body: n.body ?? '', link: n.link ?? '', kind: n.kind ?? 'info', read_at: null }).catch(() => null),
    ),
  );
}

/** Who approves this person's requests: their manager, else all Super Admins. */
export function approversFor(user: Profile, all: Profile[]): string[] {
  const ids = user.manager_id ? [user.manager_id] : all.filter((p) => p.role === 'super_admin' && p.status === 'active').map((p) => p.id);
  return ids.filter((id) => id !== user.id);
}

export const firstName = (name?: string) => (name ?? '').replace(/\(.*\)/, '').trim().split(/\s+/)[0] ?? '';
