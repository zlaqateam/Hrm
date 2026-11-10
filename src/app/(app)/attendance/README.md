# /attendance — My Attendance

**Purpose:** Daily check-in / check-out with selfie, breaks with live timers, today's timeline and personal history.

**Access:** Everyone (own data only).

**Flow**
1. **Check in** → `SelfieCamera` (front camera, mirrored, timestamp burned into the photo; upload fallback) → selfie stored via `db.uploadFile('selfies', '<uid>/<date>-in-<ts>.jpg')` → GPS (optional) → `attendance` row. Status `late` if after `work_start + late_after_minutes`.
2. **Breaks**: Tea / Lunch / Personal → `breaks` row. One open break at a time. Max tea breaks/day. Over-limit shows red.
3. **End break** → sets `end_at`, recalculates `attendance.break_minutes`.
4. **Check out** → closes open break, selfie, `work_minutes = total − breaks`, `half_day` if under threshold.

**Data:** `attendance` (unique per user + date), `breaks`, storage bucket `selfies`.

**Customize (Settings → Attendance):** shift start/end, grace minutes, half/full day minutes, weekly off, selfie on in/out, GPS on/off, break limits, max tea breaks.

**Migration notes:** Times come from the device clock. For tamper-proof time, add a Postgres function using `now()` and call it from a new adapter method (see `docs/ROADMAP.md`). Camera requires HTTPS or localhost.
