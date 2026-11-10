# /team — Team Tracker

**Purpose:** Live board of who is working, on which break, checked out, not in or on leave, plus each person's key percentages.

**Access:** Everyone. Super Admin sees all, Manager sees team, Member sees department peers only if Settings → Modules → "Members can see teammates' live status" is on (otherwise only self).

**Shows per person:** live status badge, check-in time, worked time (or break duration), score %, attendance % (30d), punctuality %, OKR progress %.
**Summary:** counts and % for working / on break / checked out / not in.
**Filters:** status tabs, search, department.

**Data:** `useWorkspace(30)`; `liveStatus()` and `userStats()` from `src/lib/metrics.ts`. Refreshes every 30s and on realtime changes.

**Customize:** score weights in Settings → Performance. Visibility toggle in Settings → Modules.

**Migration notes:** None beyond the adapter. Clicking a card opens `/employees/[id]` for managers.
