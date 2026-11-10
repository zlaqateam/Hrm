# /login

**Purpose:** Sign in. Shows one-click demo logins when in demo mode or when `NEXT_PUBLIC_SHOW_DEMO_LOGINS=true`.

**Access:** Public. Signed-in users are redirected to `/dashboard`.

**Data:** `db.signIn(email, password)` → `profiles` + `org_settings` loaded by `AuthProvider` (`src/lib/auth.tsx`). Inactive profiles are signed out.

**Customize:** Left panel copy and tagline come from Settings → General. Demo accounts list: `DEMO_ACCOUNTS` in `src/lib/data/seed.ts`.

**Migration notes:** Auth is behind the adapter. To add Google / Microsoft SSO in Supabase mode, call `supabase().auth.signInWithOAuth()` from a new button and keep the `handle_new_user` trigger.
