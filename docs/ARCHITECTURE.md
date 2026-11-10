# Architecture

## Layers

```
Pages (src/app/(app)/*)          UI + page logic, React client components
   │  uses
Hooks (useTable, useWorkspace)   loading + realtime refresh
   │  calls
db  (src/lib/data/index.ts)      ⭐ the ONLY data entry point
   │  implements DataAdapter
   ├── demo.ts      localStorage backend (instant demo)
   └── supabase.ts  Postgres + Auth + Storage + Realtime
                    security enforced by RLS in SQL
```

## Rules that keep it migratable

1. Pages never import `@supabase/supabase-js`. Only `lib/data/supabase.ts` and the server API route do.
2. `DataAdapter` is generic CRUD + auth + files + subscribe. Any backend can implement it.
3. `types.ts` mirrors SQL 1:1. Change both together.
4. Business formulas live in `metrics.ts` (percentages, score). Permissions live in `permissions.ts` and are mirrored in SQL RLS functions (`can_manage_user`, `can_edit_objective`, `can_see_channel`).
5. Text + CHECK constraints instead of Postgres enums.

## Key flows

**Check-in**: camera → canvas (400px JPEG, mirrored, timestamp burned in) → `db.uploadFile('selfies', '<uid>/<date>-in-<ts>.jpg')` → `attendance` insert with status `late` if after `work_start + late_after_minutes`.

**Breaks**: `breaks` rows with `start_at`/`end_at`. One open break at a time. Tea break count limited. Attendance `break_minutes` updated on end.

**Check-out**: closes any open break, `work_minutes = (out - in) - breaks`, `half_day` if below `half_day_minutes`.

**Performance score** (`metrics.userStats`):
- Attendance % = present days (half day = 0.5) ÷ working days in window (excludes weekly offs, approved leave, days before joining, and today until checked in)
- Punctuality % = non-late days ÷ present days
- OKR % = average weighted KR progress of the person's objectives in the current cycle
- Task % = done ÷ assigned
- Score = weighted average using Settings weights; metrics with no data are skipped and the weights re-normalised.

**KR progress** = `(current - start) / (target - start)`, clamped 0-100. Works for "lower is better" (target < start). Boolean = 0 or 100.

**Dashboards**: `settings.dashboard_widgets[role]` (ordered list). A department's `dashboard_widgets` overrides it for non-super-admins in that department. Widgets are registered in `components/widgets.tsx`. To add one: add an id to `WidgetId` + `WIDGETS` in `types.ts`, write the component, add to `REGISTRY`.

## Realtime
`db.subscribe(table, cb)` — Supabase `postgres_changes` or a window event in demo (also syncs across tabs). `useTable` re-fetches on change.
