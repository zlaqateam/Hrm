# Supabase backend

## Files
| File | Purpose |
|---|---|
| `migrations/0001_schema.sql` | All tables, helper functions, triggers (profile creation, field protection, audit), RLS policies, private `selfies` bucket, realtime |
| `migrations/0003_v2_features.sql` | v2: standup/mood columns, geofence settings, `holidays`, `kudos`, `notifications`, server-side timestamp triggers |
| `migrations/0002_first_super_admin.sql` | Promote your own login to Super Admin (if not using the seed script) |

## Tables
`org_settings` (single row) · `departments` · `profiles` · `attendance` · `breaks` · `objectives` · `key_results` · `kr_updates` · `okr_templates` · `channels` · `messages` · `tasks` · `leave_requests` · `announcements` · `audit_log`

## Security model (RLS)
- `can_manage_user(target)`: Super Admin → everyone. Manager → direct reports + members of own department.
- Attendance/breaks: own rows, managed people, or same-department colleagues if `members_see_team` is on.
- Selfies (storage): only owner + managers of the owner. Path must start with the uploader's user id.
- OKRs: readable by everyone (transparency). Editable by owner, creator, their managers, Super Admin.
- Profiles: members can't change their own role, department, manager, status, code or designation (trigger).
- Settings, departments, audit log: Super Admin only.

## Seed
```bash
npm run seed:supabase
```
Creates 12 demo logins (`*@zlaqa.demo` / `Zlaqa@123`) and all demo data. Delete them before going live.

## Production checklist
- [ ] Disable public email sign-ups
- [ ] `NEXT_PUBLIC_SHOW_DEMO_LOGINS=false`
- [ ] Service role key only in server env
- [ ] Enable Point-in-Time Recovery or daily backups
- [ ] Decide selfie retention period and tell employees
