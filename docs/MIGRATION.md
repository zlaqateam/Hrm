# Migration guide

## A. Demo → Supabase
See root README §2. Nothing in pages changes; only env vars.

## B. Supabase project → another Supabase project
```bash
pg_dump "$OLD_DB_URL" --schema=public --data-only > data.sql
# new project: run supabase/migrations/0001_schema.sql, then
psql "$NEW_DB_URL" < data.sql
```
Auth users: export via Supabase dashboard or `auth.admin.listUsers`, re-create with the same IDs (profiles.id = auth user id). Copy the `selfies` bucket with the Storage API or `rclone`.

## C. Supabase → self-hosted Postgres / any SQL DB
The schema is plain Postgres. Remove/replace: `auth.users` FK and trigger, `auth.uid()` in policies (replace with your session user), `storage.*` policies, `supabase_realtime` publication.
Then write a new adapter (below) that calls your API.

## D. Supabase → Firebase / Appwrite / PocketBase / your REST API
1. Copy `src/lib/data/supabase.ts` to `src/lib/data/<name>.ts`.
2. Implement every method of `DataAdapter` (`adapter.ts`):
   - `list(table, { filter, in, gte, lte, order, limit })` → query
   - `get / insert / update / remove`
   - `signIn / signOut / getSession / changePassword / createUser`
   - `uploadFile / fileUrl` for selfies
   - `subscribe(table, cb)` → realtime or polling (`setInterval(cb, 10000)` works)
3. In `src/lib/data/index.ts` select your adapter.
4. Re-implement permissions server-side (see `0001_schema.sql` RLS section — it's the spec).

## E. Export everything as JSON (demo)
Settings → Data → Export JSON. The shape is `{ table: rows[] }`, same as `seed.ts`, so it can be loaded by `scripts/seed-supabase.ts` with small edits.

## Hosting
- **Vercel**: import repo, set env vars, done.
- **Docker / VPS / Railway / Render**: `docker build --build-arg NEXT_PUBLIC_SUPABASE_URL=... --build-arg NEXT_PUBLIC_SUPABASE_ANON_KEY=... -t zlaqa-os .` then run with `-e SUPABASE_SERVICE_ROLE_KEY=...`.
