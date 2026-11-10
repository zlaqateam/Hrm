# POST /api/admin/users

**Purpose:** Create an employee login in Supabase mode (needs the service role key, so it must run on the server).

**Auth:** `Authorization: Bearer <user access token>`. Caller must be Manager or Super Admin.
- Manager → role forced to `member`, department forced to the manager's own.

**Body:** `{ email, password (8+), full_name, role, department_id, manager_id, designation, phone, employee_code, join_date }`

**Returns:** the created `profiles` row.

**Env:** `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`.

**Migration notes:** On another backend, replace with that platform's admin user API. Demo mode doesn't use this route.
