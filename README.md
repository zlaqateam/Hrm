# Zlaqa Team OS

HRM, selfie attendance, breaks, OKRs, performance, team tracker, tasks, leave, announcements and team chat for **Zlaqa AI Labs**.
Next.js 16 (App Router) + TypeScript + Tailwind + Supabase.

> Rebuild / extend prompt: see [`MASTER_PROMPT.md`](./MASTER_PROMPT.md) · What's new in v2: [`docs/V2_CHANGELOG.md`](./docs/V2_CHANGELOG.md)

**v2 highlights:** dark mode · animations · mobile tab bar + installable app · Ctrl K command palette · notifications · daily standup & mood pulse · geofence · streaks · smart insights · kudos wall · calendar & holidays · server-side timestamps

---

## 1. Run it in 60 seconds (demo mode, no backend)

```bash
npm install
cp .env.example .env.local     # NEXT_PUBLIC_DATA_MODE=demo is the default
npm run dev                    # http://localhost:3000
```

### Demo credentials (password for all: `Zlaqa@123`)

| Role | Email | What to try |
|---|---|---|
| Super Admin | `superadmin@zlaqa.demo` | Settings, dashboard builder, departments, audit log |
| Manager (Engineering) | `manager@zlaqa.demo` | Attendance records + selfies, apply OKR template to team, approve leave |
| Member (Developer) | `member@zlaqa.demo` | Check in with selfie, tea/lunch breaks, check out, update KRs |

More demo people: `ops.manager@`, `creative.manager@`, `dev2@`, `dev3@`, `research@`, `design@`, `content@`, `ops1@`, `sales@` (all `@zlaqa.demo`).

Demo data lives in your browser's localStorage. Reset it from the login page or **Settings → Data**.

> Camera needs `localhost` or HTTPS. On a phone over plain LAN HTTP the app falls back to photo upload.

---

## 2. Go live on Supabase

1. Create a project at supabase.com.
2. SQL editor → run `supabase/migrations/0001_schema.sql`, then `0003_v2_features.sql`.
3. Fill `.env.local`:
   ```
   NEXT_PUBLIC_DATA_MODE=supabase
   NEXT_PUBLIC_SUPABASE_URL=...
   NEXT_PUBLIC_SUPABASE_ANON_KEY=...
   SUPABASE_SERVICE_ROLE_KEY=...        # server only
   NEXT_PUBLIC_SHOW_DEMO_LOGINS=false
   ```
4. Either
   - `npm run seed:supabase` → creates the same demo team with real logins, **or**
   - create your own login in Supabase Auth, then run `0002_first_super_admin.sql` with your email.
5. Auth → Providers → Email: **disable public sign-ups** (employees are created from the Employees page).
6. `npm run build && npm start`, or deploy to Vercel / Docker (see `Dockerfile`).

Full details: [`supabase/README.md`](./supabase/README.md) · [`docs/MIGRATION.md`](./docs/MIGRATION.md)

---

## 3. What's inside

| Module | Page | Super Admin | Manager | Member |
|---|---|:-:|:-:|:-:|
| Role-based, customizable dashboard | `/dashboard` | ✅ | ✅ | ✅ |
| Check-in/out with selfie, GPS, tea/lunch/personal breaks | `/attendance` | ✅ | ✅ | ✅ |
| Live team tracker with % | `/team` | all | team | dept (toggle) |
| Attendance records, selfies, corrections, CSV | `/attendance/records` | all | team | – |
| OKRs (company → dept → individual) | `/okrs` | ✅ | team | own |
| OKR templates per department | `/okrs/templates` | ✅ | ✅ | – |
| Performance score & ranking | `/performance` | ✅ | team | own + dept |
| Tasks kanban linked to KRs | `/tasks` | ✅ | ✅ | ✅ |
| Team chat, departments, DMs | `/chat` | ✅ | ✅ | ✅ |
| Announcements | `/announcements` | ✅ | ✅ | read |
| Kudos wall | `/kudos` | ✅ | ✅ | ✅ |
| Calendar, holidays, anniversaries | `/calendar` | ✅ + holidays | team leave | own |
| Notifications, Ctrl K palette, dark mode | top bar | ✅ | ✅ | ✅ |
| Leave + balances + approvals | `/leave` | ✅ | approve team | apply |
| Employees (HRM) | `/employees` | ✅ | own dept | – |
| Departments + per-department dashboards | `/departments` | ✅ | – | – |
| Settings (everything configurable) | `/settings` | ✅ | – | – |
| Audit log | `/audit` | ✅ | – | – |

Every page folder has its own `README.md`.

---

## 4. Project map

```
src/
  app/
    login/                 sign-in + demo logins
    (app)/                 authenticated pages (sidebar shell)
      dashboard/ attendance/ attendance/records/ team/ okrs/ okrs/templates/ kudos/ calendar/
      performance/ tasks/ chat/ leave/ announcements/ employees/ employees/[id]/
      departments/ settings/ audit/ profile/
    api/admin/users/       server route: create logins (Supabase mode)
  components/              ui.tsx (design system), bits.tsx, widgets.tsx, okr.tsx, SelfieCamera.tsx, Shell.tsx
  lib/
    data/                  ⭐ migration boundary: adapter.ts, demo.ts, supabase.ts, seed.ts
    types.ts               domain types (mirror the SQL)
    metrics.ts             all % and score formulas
    permissions.ts         role rules (mirrored in SQL RLS)
    auth.tsx hooks.ts workspace.ts format.ts
supabase/migrations/       schema, RLS, triggers, storage, realtime
scripts/seed-supabase.ts   demo data → Supabase
docs/                      ARCHITECTURE, MIGRATION, ROADMAP
```

## 5. Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Dev server |
| `npm run build` / `npm start` | Production build / serve |
| `npm run typecheck` | TypeScript check |
| `npm run seed:supabase` | Seed Supabase with demo team |

## 6. Honest limits (read before production)

- **Selfie = evidence, not verification.** It deters proxy attendance; it does not prove identity. Face-match is on the roadmap.
- **GPS is browser-reported** and can be spoofed, so geofencing (Settings → Attendance) raises the bar but is not proof.
- **Demo mode has no security.** All data is in one browser. Use Supabase mode for real people.
- Times use the device clock in demo mode. In Supabase mode, migration 0003 makes the database clock decide check-in/out, break times and late status.
- Selfies are personal data. Tell employees what is captured, why, who can see it and how long it's kept (India DPDP Act 2023). Set a retention policy for the `selfies` bucket.
