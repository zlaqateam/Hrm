# /attendance/records — Attendance Records

**Purpose:** Review and correct attendance for a team: selfies, times, breaks, GPS, status.

**Access:** Super Admin (everyone), Manager (direct reports + own-department members). Enforced by `managedTeam()` in UI and `can_manage_user()` in RLS.

**Features**
- Filters: date range, department, employee, status
- Stats: records, late %, average worked, missing check-outs
- Selfie thumbnails → click to zoom
- GPS → opens Google Maps
- **Correct record** (regularize): edit in/out time, status, reason. Recomputes worked minutes. Written to audit log.
- CSV export (payroll-friendly)

**Data:** `attendance` (range query), `breaks`, `profiles`, `departments`, storage `selfies` (signed URLs, 1h).

**Migration notes:** Signed URLs come from `db.fileUrl`. Any backend needs a "private file + temporary URL" equivalent.
