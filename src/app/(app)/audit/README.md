# /audit — Audit Log

**Purpose:** Who changed what, when. Last 500 events, filter by entity.

**Access:** Super Admin only.

**Captured:** insert / update / delete on profiles, departments, attendance, objectives, key_results, okr_templates, tasks, leave_requests, announcements, org_settings, channels.
- Supabase: `audit_trigger()` in SQL (tamper-resistant, actor = `auth.uid()`)
- Demo: written by `demo.ts`

**Data:** `audit_log`.
