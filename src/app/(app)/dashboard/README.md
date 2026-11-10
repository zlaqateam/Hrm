# /dashboard

**Purpose:** Role-based, fully configurable home screen built from widgets.

**Access:** Everyone. Content is scoped:
- Super Admin → whole company
- Manager → direct reports + own department
- Member → self (+ department peers if "Members can see teammates" is on)

**Widgets:** welcome, my_shift, org_stats, team_status, attendance_trend, okr_progress, my_okrs, leaderboard, dept_breakdown, announcements, my_tasks, leave_pending, my_performance (`src/components/widgets.tsx`).

**Which widgets show:** `pickWidgets()`:
1. Department has `dashboard_widgets` set (Departments page) → used for managers & members of that department.
2. Otherwise `settings.dashboard_widgets[role]` (Settings → Dashboards), in that order.

**Data:** `useWorkspace(30, currentCycle)` → profiles, departments, attendance (30d), breaks (today), objectives, key_results, tasks, leave_requests + announcements.

**Add a widget:** add id to `WidgetId` and `WIDGETS` in `src/lib/types.ts`, write the component in `widgets.tsx`, register in `REGISTRY`, optional column span in `SPAN`.

**Migration notes:** Pure client aggregation. For 200+ people move aggregates into SQL views/RPC and expose them as a new adapter method.
