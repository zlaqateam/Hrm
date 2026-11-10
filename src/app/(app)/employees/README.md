# /employees — HRM directory

**Purpose:** Add, edit, deactivate employees; export the directory.

**Access**
- Super Admin: everyone; can set role (Member / Manager / Super Admin) and department
- Manager: own team; can add **members** to own department only
- Members: no access (they edit their own basics in `/profile`)

**Fields:** name, work email, temporary password (new only), employee code, designation, phone, role, department, reports-to, joining date, status (inactive = can't sign in).

**How logins are created**
- Demo: `db.createUser` stores credentials in the browser
- Supabase: `POST /api/admin/users` (server, service role key) creates the Auth user, then the profile. Rules re-checked on the server.

**Data:** `profiles`, `departments`.

**Detail page:** `/employees/[id]` (see its README).
