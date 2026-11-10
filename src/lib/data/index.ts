import type { DataAdapter } from './adapter';
import { demoAdapter } from './demo';
import { supabaseAdapter } from './supabase';

export const DATA_MODE: 'demo' | 'supabase' =
  process.env.NEXT_PUBLIC_DATA_MODE === 'supabase' && process.env.NEXT_PUBLIC_SUPABASE_URL ? 'supabase' : 'demo';

/** The only data entry point pages should import. */
export const db: DataAdapter = DATA_MODE === 'supabase' ? supabaseAdapter : demoAdapter;

export const SHOW_DEMO_LOGINS = DATA_MODE === 'demo' || process.env.NEXT_PUBLIC_SHOW_DEMO_LOGINS === 'true';

export type { DataAdapter, ListOptions, NewUserInput } from './adapter';
