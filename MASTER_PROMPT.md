# MASTER PROMPT: Zlaqa Team OS (HRM + Attendance + OKR + Performance + Team Chat)

> Rewritten from the founder's brief. Use this prompt to rebuild, extend or hand the project to any developer or AI coding agent.

---

## 1. Role

You are a senior full-stack engineer and product designer. Build a production-grade, fully customizable **Team Operating System** for **Zlaqa AI Labs Pvt Ltd**: HRM, selfie attendance, break tracking, OKRs, performance tracking, team tracker, tasks, leave, announcements and team chat.

## 2. Stack (non-negotiable)

- **Next.js (App Router) + TypeScript (strict)**
- **Tailwind CSS** for UI, `lucide-react` for icons. No heavy UI kits.
- **Supabase** (Postgres + Auth + Storage + Realtime) as the production backend.
- **Row Level Security** on every table. Security lives in the database, not only in the UI.
- A **data adapter layer** so the app never talks to Supabase directly from pages. Swapping backend = rewriting one file.
- A **demo mode** (browser localStorage) that runs instantly with demo credentials, no backend needed.
- Deliver everything as a **single zip**. Every page folder has its own `README.md`.

## 3. Roles

| Role | Who | Can do |
|---|---|---|
| **Super Admin** | Founder / HR head | Everything. All settings, all departments, all people, all data, audit log, dashboards per role and per department, modules on/off, performance weights, attendance rules. |
| **Admin (Manager)** | Department heads | Their department + direct reports: view attendance & selfies, correct records, create OKRs for team, apply OKR templates, approve leave, assign tasks, add members to own department, post announcements. |
| **Member** | Employees | Check in/out with selfie, take breaks, own OKRs and updates, own tasks, apply for leave, chat, see own performance. Optionally see teammates' live status. |

## 4. Modules

### 4.1 Attendance (core)
- **Check-in with selfie** (front camera, mirrored, timestamp watermark burned into the image). Upload fallback if camera denied.
- **Check-out with selfie**. Optional GPS capture on both.
- **Breaks**: Tea, Lunch, Personal. Live timers. Per-type limits (minutes) and max tea breaks per day. Over-limit warnings.
- Auto status: `present`, `late` (after start time + grace), `half_day` (worked less than threshold), `on_leave`, `absent`.
- Worked time = check-out minus check-in minus breaks.
- **Records view** for Admin/Super Admin: date range, department, person, status filters; selfie thumbnails with zoom; GPS link; manual correction (regularize) with notes; CSV export.

### 4.2 Team Tracker
- Live board: who is working, on break (which type, since when), checked out, not in, on leave.
- Percentages: present %, on-break count, attendance %, OKR %, performance score per person.
- Department filter + search.

### 4.3 OKRs
- Levels: Company → Department → Individual, with parent linking.
- Cycles (e.g. Q4 2026), configurable by Super Admin.
- Key Results: number, percent, currency, boolean; start, target, current, unit, weight. Works for "lower is better" too.
- Progress = weighted KR progress. Status: on track / at risk / off track / done.
- Check-in updates with notes (history kept).
- Managers & Super Admin create OKRs for each person. Members can create their own (toggle).
- **OKR Templates** per department and scope; apply one template to many people in one click.

### 4.4 Performance
- Score = weighted mix of Attendance %, Punctuality %, OKR %, Task completion %. Weights set by Super Admin.
- 7 / 30 / 90 day windows. Ranking, department averages, personal breakdown.

### 4.5 HRM
- Employee directory, profiles (code, designation, department, manager, phone, join date, status).
- Add / edit / deactivate employees. Departments with color, head, description.
- Leave: types and yearly quotas configurable; apply, approve/reject, balances.
- Announcements: company-wide or per department, pin.
- Tasks: Kanban (To do, In progress, Review, Done), priority, due date, optional link to a Key Result.

### 4.6 Team Communication
- Channels: public, department (auto-scoped), private, direct messages.
- Realtime messages.

### 4.7 Customization (Super Admin)
- Company name, tagline, brand color.
- Work hours, grace minutes, half/full day thresholds, weekly off days.
- Selfie on check-in / check-out, GPS on/off, break limits.
- Modules on/off (OKRs, Performance, Tasks, Chat, Leave, Announcements).
- Performance weights.
- OKR cycles and current cycle.
- Leave types and quotas.
- **Dashboard builder**: choose and order widgets per role, and override per department.
- Members can see team status (on/off).

### 4.8 Audit log
- Every create/update/delete on core tables recorded with actor, entity and time.

## 5. Data model (Postgres)

`org_settings, departments, profiles, attendance, breaks, objectives, key_results, kr_updates, okr_templates, channels, messages, tasks, leave_requests, announcements, audit_log` + private storage bucket `selfies`.

## 6. Migration rules
- Pages call only `db.*` from `src/lib/data`. No direct Supabase calls in pages.
- Adapter interface: `signIn, signOut, getSession, changePassword, createUser, list, get, insert, update, remove, uploadFile, fileUrl, subscribe`.
- Text columns with CHECK constraints instead of Postgres enums (easier to migrate).
- Plain SQL migrations, a seed script, `.env.example`, Dockerfile.

## 7. Design
- White-first, minimal, professional. Brand color configurable. No blue in default theme.
- "ZLAQA AI" wordmark. Tagline: "Let every voice be heard."
- Mobile-first: members check in from phones.

## 8. Deliverables
1. Full Next.js project in a zip.
2. `README.md` at root + one in every page folder (purpose, roles, data used, customization, migration notes).
3. `supabase/migrations/*.sql` with RLS, triggers, storage policies.
4. Demo credentials working out of the box.
5. `docs/` with architecture, migration and roadmap.

## 9. Suggested extras (included or on roadmap)
Included: audit log, leave balances, announcements, tasks linked to KRs, timestamp watermark on selfies, GPS, CSV export, dashboard builder, department dashboards, DMs.
Roadmap: face-match verification, geofencing per office, payroll export, holiday calendar, shift rosters, push notifications, PWA offline check-in, WhatsApp/Email digests, AI weekly performance summaries.

---

## 10. v2 extension (experience + features)

Make the OS feel premium on every device:
- **Theme**: light / dark / system, all neutrals as CSS variables, no flash on load. Brand colour flips to light when it is too dark for dark mode.
- **Motion**: page transitions, staggered entrances, count-up stats, animated bars and rings, slide-up sheets on mobile, skeleton loaders, toast confirmations, confetti + haptics for wins. Respect `prefers-reduced-motion`.
- **Navigation**: top bar with live shift pill, Ctrl/⌘ K command palette, notifications bell; mobile bottom tab bar with a raised Attendance button; installable PWA.
- **Features**: daily standup (focus at check-in, wrap-up at check-out), optional mood pulse (aggregate only for managers), geofence (off/flag/block), on-time streaks, smart insights widget, kudos wall with company values, calendar with holidays/leave/anniversaries, in-app notifications (kudos, tasks, leave, DMs, @mentions), holidays excluded from all percentages, server-side timestamps in Postgres.
