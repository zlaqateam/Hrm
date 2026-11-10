// UI-side permission rules. The SAME rules are enforced in Postgres RLS
// (supabase/migrations/0001_schema.sql). Change both together.
import type { Objective, OrgSettings, Profile } from './types';

export const isSuper = (p?: Profile | null) => p?.role === 'super_admin';
export const isAdminOrAbove = (p?: Profile | null) => p?.role === 'super_admin' || p?.role === 'admin';

/** Can `me` manage `target` (attendance corrections, OKRs, leave approval, edit profile)? */
export function canManage(me: Profile, target: Profile): boolean {
  if (me.role === 'super_admin') return true;
  if (me.role !== 'admin') return false;
  if (target.id === me.id) return false;
  return target.manager_id === me.id || (!!me.department_id && target.department_id === me.department_id && target.role === 'member');
}

/** People `me` manages or supervises, including self. Used for admin views. */
export function managedTeam(me: Profile, all: Profile[]): Profile[] {
  const active = all.filter((p) => p.status === 'active');
  if (me.role === 'super_admin') return active;
  if (me.role === 'admin') return active.filter((p) => p.id === me.id || canManage(me, p));
  return active.filter((p) => p.id === me.id);
}

/** People whose live status / leaderboard `me` can see. */
export function visibleTeam(me: Profile, all: Profile[], settings: OrgSettings): Profile[] {
  if (me.role !== 'member') return managedTeam(me, all);
  const active = all.filter((p) => p.status === 'active');
  if (!settings.members_see_team) return active.filter((p) => p.id === me.id);
  return active.filter((p) => p.department_id && p.department_id === me.department_id);
}

export function canEditObjective(me: Profile, o: Objective, all: Profile[]): boolean {
  if (me.role === 'super_admin') return true;
  if (o.owner_id === me.id || o.created_by === me.id) return true;
  const owner = all.find((p) => p.id === o.owner_id);
  return !!owner && canManage(me, owner);
}
