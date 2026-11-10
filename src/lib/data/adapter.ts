import type { Profile, Role, TableName, Tables } from '../types';

/**
 * THE MIGRATION BOUNDARY.
 * Every page talks to this interface only (via `db` from ./index).
 * To move to another backend (Firebase, Appwrite, PocketBase, your own REST API, Prisma...)
 * write one new file that implements DataAdapter and switch it in ./index.ts.
 */

export interface ListOptions {
  /** equality filters: { user_id: 'x', status: 'pending' }. null matches NULL */
  filter?: Record<string, unknown>;
  /** column IN (...) */
  in?: [string, unknown[]];
  /** column >= value */
  gte?: [string, string | number];
  /** column <= value */
  lte?: [string, string | number];
  order?: [string, 'asc' | 'desc'];
  limit?: number;
}

export interface SessionUser {
  id: string;
  email: string;
}

export interface NewUserInput {
  email: string;
  password: string;
  full_name: string;
  role: Role;
  department_id: string | null;
  manager_id: string | null;
  designation: string;
  phone: string;
  employee_code: string;
  join_date: string;
}

export interface DataAdapter {
  mode: 'demo' | 'supabase';

  // auth
  signIn(email: string, password: string): Promise<SessionUser>;
  signOut(): Promise<void>;
  getSession(): Promise<SessionUser | null>;
  changePassword(newPassword: string): Promise<void>;
  /** create a login + profile (admin only) */
  createUser(input: NewUserInput): Promise<Profile>;

  // generic CRUD
  list<K extends TableName>(table: K, opts?: ListOptions): Promise<Tables[K][]>;
  get<K extends TableName>(table: K, id: string | number): Promise<Tables[K] | null>;
  insert<K extends TableName>(table: K, row: Partial<Tables[K]>): Promise<Tables[K]>;
  update<K extends TableName>(table: K, id: string | number, patch: Partial<Tables[K]>): Promise<Tables[K]>;
  remove<K extends TableName>(table: K, id: string | number): Promise<void>;

  // files (selfies)
  /** stores a data URL, returns a reference (path) to save in the row */
  uploadFile(bucket: string, path: string, dataUrl: string): Promise<string>;
  /** resolves a stored reference to a displayable URL */
  fileUrl(bucket: string, ref: string): Promise<string>;

  // realtime
  subscribe(table: TableName, cb: () => void): () => void;

  // demo only
  resetDemo?(): void;
  exportAll?(): Promise<Record<string, unknown[]>>;
}
