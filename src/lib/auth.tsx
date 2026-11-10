'use client';
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { db } from './data';
import { defaultSettings } from './data/seed';
import type { OrgSettings, Profile } from './types';

interface AuthState {
  user: Profile | null;
  settings: OrgSettings;
  loading: boolean;
  signIn(email: string, password: string): Promise<void>;
  signOut(): Promise<void>;
  refresh(): Promise<void>;
}

const Ctx = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<Profile | null>(null);
  const [settings, setSettings] = useState<OrgSettings>(defaultSettings);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const s = await db.getSession();
      if (!s) {
        setUser(null);
        return;
      }
      const [p, st] = await Promise.all([db.get('profiles', s.id), db.get('org_settings', 1)]);
      if (p && p.status === 'inactive') {
        await db.signOut();
        setUser(null);
        return;
      }
      setUser(p);
      if (st) setSettings({ ...defaultSettings(), ...st });
    } catch (e) {
      console.error(e);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(
    () =>
      db.subscribe('org_settings', async () => {
        const st = await db.get('org_settings', 1);
        if (st) setSettings({ ...defaultSettings(), ...st });
      }),
    [],
  );

  const signIn = useCallback(
    async (email: string, password: string) => {
      await db.signIn(email, password);
      setLoading(true);
      await load();
    },
    [load],
  );

  const signOut = useCallback(async () => {
    await db.signOut();
    setUser(null);
  }, []);

  return <Ctx.Provider value={{ user, settings, loading, signIn, signOut, refresh: load }}>{children}</Ctx.Provider>;
}

export function useAuth(): AuthState {
  const v = useContext(Ctx);
  if (!v) throw new Error('useAuth must be used inside <AuthProvider>');
  return v;
}

/** For pages inside the (app) group, where the layout guarantees a user. */
export function useMe() {
  const a = useAuth();
  return { ...a, me: a.user as Profile };
}
