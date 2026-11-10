# /settings — Super Admin control centre

**Access:** Super Admin only (RLS `settings_write`).

| Tab | What you control |
|---|---|
| General | Company name, tagline, brand colour (applied live via CSS variable `--brand`), time zone |
| Attendance | Shift start/end, grace minutes, half/full day minutes, weekly off days, selfie on check-in/out, GPS, break limits per type, max tea breaks |
| Modules | Turn OKRs, Performance, Tasks, Chat, Leave, Announcements on/off; members can see teammates' live status |
| Performance | Score weights (must total 100) |
| OKRs | Cycles, current cycle, members can create own OKRs |
| Leave | Leave types and yearly quotas |
| Dashboards | Widgets and order for Super Admin / Manager / Member dashboards |
| Data | Mode, JSON export and reset (demo) |

Deep link: `/settings?tab=dashboards`.

**Data:** single row `org_settings` (id = 1). All pages read it from `useAuth().settings`, updated live via realtime.

**Add a setting:** column in SQL → field in `OrgSettings` (`types.ts`) → default in `defaultSettings()` (`seed.ts`) → input here.
