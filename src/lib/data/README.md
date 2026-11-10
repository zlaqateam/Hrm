# Data layer (the migration boundary)

| File | Role |
|---|---|
| `adapter.ts` | `DataAdapter` interface. The contract every backend implements. |
| `index.ts` | Exports `db` (picks demo or Supabase by `NEXT_PUBLIC_DATA_MODE`). **Pages import only this.** |
| `demo.ts` | localStorage backend with auth, files, cross-tab realtime and an audit trail. |
| `supabase.ts` | Supabase backend. Security is in SQL RLS. |
| `seed.ts` | Demo data + default settings. Shared by demo mode and `scripts/seed-supabase.ts`. |

## Usage
```ts
import { db } from '@/lib/data';
const rows = await db.list('attendance', { filter: { user_id }, gte: ['date', '2026-11-01'], order: ['date', 'desc'], limit: 30 });
await db.update('key_results', id, { current_value: 42 });
const unsubscribe = db.subscribe('messages', reload);
```
Or in components: `const { rows, reload } = useTable('tasks', { order: ['created_at', 'desc'] })`.

## Adding a table
1. SQL in a new migration + RLS policies.
2. Type in `src/lib/types.ts` and add to `Tables` + `TABLES`.
3. (Optional) demo rows in `seed.ts`.
No adapter change needed: CRUD is generic.

## Switching backend
Write `<backend>.ts` implementing `DataAdapter`, select it in `index.ts`. See `docs/MIGRATION.md`.
