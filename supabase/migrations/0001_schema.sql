-- =====================================================================
-- Zlaqa Team OS · Supabase schema
-- Run in Supabase SQL editor (or `supabase db push`).
-- Text + CHECK constraints instead of enums = painless migrations.
-- =====================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------
-- Settings (single row, id = 1)
-- ---------------------------------------------------------------------
create table if not exists public.org_settings (
  id int primary key default 1 check (id = 1),
  company_name text not null default 'Zlaqa AI Labs',
  tagline text not null default 'Let every voice be heard.',
  primary_color text not null default '#111111',
  timezone text not null default 'Asia/Kolkata',
  work_start text not null default '09:30',
  work_end text not null default '18:30',
  late_after_minutes int not null default 15,
  half_day_minutes int not null default 240,
  full_day_minutes int not null default 480,
  weekly_off int[] not null default '{0}',
  selfie_on_check_in boolean not null default true,
  selfie_on_check_out boolean not null default true,
  capture_location boolean not null default true,
  break_limits jsonb not null default '{"tea":15,"lunch":45,"personal":15}',
  max_tea_breaks int not null default 2,
  modules jsonb not null default '{"okrs":true,"performance":true,"tasks":true,"chat":true,"leave":true,"announcements":true}',
  performance_weights jsonb not null default '{"attendance":30,"punctuality":20,"okr":40,"tasks":10}',
  okr_cycles text[] not null default '{"Q4 2026","Q1 2027"}',
  current_cycle text not null default 'Q4 2026',
  members_can_create_okrs boolean not null default true,
  members_see_team boolean not null default true,
  leave_types text[] not null default '{"Casual","Sick","Earned","Work From Home"}',
  leave_quota jsonb not null default '{"Casual":12,"Sick":12,"Earned":15,"Work From Home":24}',
  dashboard_widgets jsonb not null default '{"super_admin":["welcome","org_stats","attendance_trend","leaderboard","dept_breakdown","okr_progress","team_status","leave_pending","announcements"],"admin":["welcome","my_shift","org_stats","team_status","okr_progress","leaderboard","leave_pending","my_tasks","announcements"],"member":["welcome","my_shift","my_performance","my_okrs","my_tasks","announcements","leaderboard"]}',
  updated_at timestamptz not null default now()
);
insert into public.org_settings (id) values (1) on conflict do nothing;

-- ---------------------------------------------------------------------
-- People
-- ---------------------------------------------------------------------
create table if not exists public.departments (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  description text not null default '',
  color text not null default '#111111',
  head_id uuid,
  dashboard_widgets text[],
  created_at timestamptz not null default now()
);

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  full_name text not null default '',
  role text not null default 'member' check (role in ('super_admin','admin','member')),
  department_id uuid references public.departments(id) on delete set null,
  manager_id uuid references public.profiles(id) on delete set null,
  designation text not null default '',
  phone text not null default '',
  employee_code text not null default '',
  join_date date not null default current_date,
  avatar_url text,
  status text not null default 'active' check (status in ('active','inactive')),
  created_at timestamptz not null default now()
);

do $$ begin
  alter table public.departments add constraint departments_head_fk foreign key (head_id) references public.profiles(id) on delete set null;
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------
-- Attendance
-- ---------------------------------------------------------------------
create table if not exists public.attendance (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  date date not null,
  check_in timestamptz,
  check_out timestamptz,
  check_in_selfie text,
  check_out_selfie text,
  check_in_location text,
  check_out_location text,
  status text not null default 'present' check (status in ('present','late','half_day','absent','on_leave')),
  work_minutes int not null default 0,
  break_minutes int not null default 0,
  notes text not null default '',
  created_at timestamptz not null default now(),
  unique (user_id, date)
);
create index if not exists attendance_date_idx on public.attendance(date);

create table if not exists public.breaks (
  id uuid primary key default gen_random_uuid(),
  attendance_id uuid not null references public.attendance(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  type text not null check (type in ('tea','lunch','personal')),
  start_at timestamptz not null default now(),
  end_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists breaks_start_idx on public.breaks(start_at);

-- ---------------------------------------------------------------------
-- OKRs
-- ---------------------------------------------------------------------
create table if not exists public.objectives (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null default '',
  level text not null default 'individual' check (level in ('company','department','individual')),
  owner_id uuid references public.profiles(id) on delete set null,
  department_id uuid references public.departments(id) on delete set null,
  cycle text not null,
  parent_id uuid references public.objectives(id) on delete set null,
  status text not null default 'on_track' check (status in ('on_track','at_risk','off_track','done')),
  due_date date,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now()
);

create table if not exists public.key_results (
  id uuid primary key default gen_random_uuid(),
  objective_id uuid not null references public.objectives(id) on delete cascade,
  title text not null,
  metric_type text not null default 'number' check (metric_type in ('number','percent','currency','boolean')),
  start_value numeric not null default 0,
  target_value numeric not null default 100,
  current_value numeric not null default 0,
  unit text not null default '',
  weight numeric not null default 1,
  created_at timestamptz not null default now()
);

create table if not exists public.kr_updates (
  id uuid primary key default gen_random_uuid(),
  key_result_id uuid not null references public.key_results(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  value numeric not null,
  note text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists public.okr_templates (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text not null default '',
  department_id uuid references public.departments(id) on delete set null,
  scope text not null default 'individual' check (scope in ('company','department','individual')),
  objectives jsonb not null default '[]',
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- Communication, tasks, leave, announcements, audit
-- ---------------------------------------------------------------------
create table if not exists public.channels (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text not null default '',
  type text not null default 'public' check (type in ('public','department','private')),
  department_id uuid references public.departments(id) on delete cascade,
  member_ids uuid[] not null default '{}',
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now()
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  channel_id uuid not null references public.channels(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check (length(body) between 1 and 4000),
  created_at timestamptz not null default now()
);
create index if not exists messages_channel_idx on public.messages(channel_id, created_at desc);

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null default '',
  assignee_id uuid references public.profiles(id) on delete set null,
  department_id uuid references public.departments(id) on delete set null,
  status text not null default 'todo' check (status in ('todo','in_progress','review','done')),
  priority text not null default 'medium' check (priority in ('low','medium','high')),
  due_date date,
  key_result_id uuid references public.key_results(id) on delete set null,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now()
);

create table if not exists public.leave_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  type text not null,
  start_date date not null,
  end_date date not null,
  days numeric not null default 1,
  reason text not null default '',
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  approver_id uuid references public.profiles(id) on delete set null,
  decided_at timestamptz,
  created_at timestamptz not null default now(),
  check (end_date >= start_date)
);

create table if not exists public.announcements (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text not null default '',
  department_id uuid references public.departments(id) on delete cascade,
  pinned boolean not null default false,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now()
);

create table if not exists public.audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid,
  action text not null,
  entity text not null,
  entity_id text not null,
  summary text not null default '',
  created_at timestamptz not null default now()
);
create index if not exists audit_created_idx on public.audit_log(created_at desc);

-- =====================================================================
-- Helper functions (security definer = no RLS recursion)
-- =====================================================================
create or replace function public.my_role() returns text
language sql stable security definer set search_path = public as $$
  select role from profiles where id = auth.uid()
$$;

create or replace function public.is_super_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select role = 'super_admin' from profiles where id = auth.uid()), false)
$$;

create or replace function public.is_admin_or_above() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select role in ('super_admin','admin') from profiles where id = auth.uid()), false)
$$;

create or replace function public.my_department() returns uuid
language sql stable security definer set search_path = public as $$
  select department_id from profiles where id = auth.uid()
$$;

-- Same rule as canManage() in src/lib/permissions.ts
create or replace function public.can_manage_user(target uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from profiles me join profiles t on t.id = target
    where me.id = auth.uid() and (
      me.role = 'super_admin'
      or (me.role = 'admin' and t.id <> me.id and (
            t.manager_id = me.id
            or (me.department_id is not null and t.department_id = me.department_id and t.role = 'member')))
    )
  )
$$;

create or replace function public.members_see_team() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select members_see_team from org_settings where id = 1), false)
$$;

create or replace function public.same_department(target uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles t where t.id = target and t.department_id is not null and t.department_id = public.my_department())
$$;

create or replace function public.can_edit_objective(oid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from objectives o where o.id = oid and (
      public.is_super_admin() or o.owner_id = auth.uid() or o.created_by = auth.uid()
      or (o.owner_id is not null and public.can_manage_user(o.owner_id))
    )
  )
$$;

create or replace function public.can_see_channel(cid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from channels c where c.id = cid and (
      c.type = 'public'
      or (c.type = 'department' and c.department_id = public.my_department())
      or auth.uid() = any(c.member_ids)
      or c.created_by = auth.uid()
      or public.is_super_admin()
    )
  )
$$;

-- =====================================================================
-- Triggers
-- =====================================================================

-- New auth user -> profile (always 'member'; admins promote via app/API)
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)))
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
for each row execute function public.handle_new_user();

-- Members can't change their own role/department/manager; admins can't create super admins
create or replace function public.protect_profile_fields() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null or public.is_super_admin() then return new; end if;
  new.role := old.role;
  if public.my_role() = 'member' then
    new.department_id := old.department_id;
    new.manager_id := old.manager_id;
    new.status := old.status;
    new.employee_code := old.employee_code;
    new.designation := old.designation;
    new.join_date := old.join_date;
  end if;
  return new;
end $$;

drop trigger if exists protect_profile on public.profiles;
create trigger protect_profile before update on public.profiles
for each row execute function public.protect_profile_fields();

-- Audit log
create or replace function public.audit_trigger() returns trigger
language plpgsql security definer set search_path = public as $$
declare r jsonb;
begin
  r := case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end;
  insert into public.audit_log (actor_id, action, entity, entity_id, summary)
  values (auth.uid(), lower(tg_op), tg_table_name, r->>'id',
          coalesce(r->>'title', r->>'name', r->>'full_name', r->>'date', ''));
  return null;
end $$;

do $$
declare t text;
begin
  foreach t in array array['profiles','departments','attendance','objectives','key_results','okr_templates','tasks','leave_requests','announcements','org_settings','channels']
  loop
    execute format('drop trigger if exists audit_%1$s on public.%1$s', t);
    execute format('create trigger audit_%1$s after insert or update or delete on public.%1$s for each row execute function public.audit_trigger()', t);
  end loop;
end $$;

-- =====================================================================
-- Row Level Security
-- =====================================================================
alter table public.org_settings enable row level security;
alter table public.departments enable row level security;
alter table public.profiles enable row level security;
alter table public.attendance enable row level security;
alter table public.breaks enable row level security;
alter table public.objectives enable row level security;
alter table public.key_results enable row level security;
alter table public.kr_updates enable row level security;
alter table public.okr_templates enable row level security;
alter table public.channels enable row level security;
alter table public.messages enable row level security;
alter table public.tasks enable row level security;
alter table public.leave_requests enable row level security;
alter table public.announcements enable row level security;
alter table public.audit_log enable row level security;

-- settings
create policy settings_read on public.org_settings for select to authenticated using (true);
create policy settings_write on public.org_settings for update to authenticated using (public.is_super_admin());

-- departments
create policy dept_read on public.departments for select to authenticated using (true);
create policy dept_write on public.departments for all to authenticated using (public.is_super_admin()) with check (public.is_super_admin());

-- profiles (directory visible to all employees)
create policy profiles_read on public.profiles for select to authenticated using (true);
create policy profiles_update on public.profiles for update to authenticated
  using (id = auth.uid() or public.can_manage_user(id));
create policy profiles_delete on public.profiles for delete to authenticated using (public.is_super_admin());

-- attendance
create policy att_read on public.attendance for select to authenticated
  using (user_id = auth.uid() or public.can_manage_user(user_id) or (public.members_see_team() and public.same_department(user_id)));
create policy att_insert on public.attendance for insert to authenticated with check (user_id = auth.uid() or public.can_manage_user(user_id));
create policy att_update on public.attendance for update to authenticated using (user_id = auth.uid() or public.can_manage_user(user_id));
create policy att_delete on public.attendance for delete to authenticated using (public.is_super_admin());

-- breaks
create policy brk_read on public.breaks for select to authenticated
  using (user_id = auth.uid() or public.can_manage_user(user_id) or (public.members_see_team() and public.same_department(user_id)));
create policy brk_insert on public.breaks for insert to authenticated with check (user_id = auth.uid());
create policy brk_update on public.breaks for update to authenticated using (user_id = auth.uid() or public.can_manage_user(user_id));
create policy brk_delete on public.breaks for delete to authenticated using (public.can_manage_user(user_id));

-- objectives (transparent OKRs: everyone can read)
create policy obj_read on public.objectives for select to authenticated using (true);
create policy obj_insert on public.objectives for insert to authenticated with check (
  created_by = auth.uid() and (
    public.is_super_admin()
    or (public.my_role() = 'admin' and level <> 'company' and (owner_id = auth.uid() or public.can_manage_user(owner_id)))
    or (level = 'individual' and owner_id = auth.uid() and (select members_can_create_okrs from org_settings where id = 1))
  ));
create policy obj_update on public.objectives for update to authenticated using (public.can_edit_objective(id));
create policy obj_delete on public.objectives for delete to authenticated using (public.can_edit_objective(id));

-- key results
create policy kr_read on public.key_results for select to authenticated using (true);
create policy kr_write on public.key_results for all to authenticated
  using (public.can_edit_objective(objective_id)) with check (public.can_edit_objective(objective_id));

create policy kru_read on public.kr_updates for select to authenticated using (true);
create policy kru_insert on public.kr_updates for insert to authenticated with check (
  user_id = auth.uid() and public.can_edit_objective((select objective_id from key_results k where k.id = key_result_id)));

-- templates
create policy tpl_read on public.okr_templates for select to authenticated using (true);
create policy tpl_write on public.okr_templates for all to authenticated using (public.is_admin_or_above()) with check (public.is_admin_or_above());

-- channels & messages
create policy ch_read on public.channels for select to authenticated using (public.can_see_channel(id));
create policy ch_insert on public.channels for insert to authenticated with check (created_by = auth.uid() and (public.is_admin_or_above() or type = 'private'));
create policy ch_update on public.channels for update to authenticated using (created_by = auth.uid() or public.is_super_admin());
create policy ch_delete on public.channels for delete to authenticated using (created_by = auth.uid() or public.is_super_admin());

create policy msg_read on public.messages for select to authenticated using (public.can_see_channel(channel_id));
create policy msg_insert on public.messages for insert to authenticated with check (user_id = auth.uid() and public.can_see_channel(channel_id));
create policy msg_delete on public.messages for delete to authenticated using (user_id = auth.uid() or public.is_super_admin());

-- tasks
create policy task_read on public.tasks for select to authenticated using (
  assignee_id = auth.uid() or created_by = auth.uid() or public.is_super_admin()
  or (assignee_id is not null and public.can_manage_user(assignee_id))
  or (department_id is not null and department_id = public.my_department()));
create policy task_insert on public.tasks for insert to authenticated with check (created_by = auth.uid());
create policy task_update on public.tasks for update to authenticated using (
  assignee_id = auth.uid() or created_by = auth.uid() or public.is_super_admin() or (assignee_id is not null and public.can_manage_user(assignee_id)));
create policy task_delete on public.tasks for delete to authenticated using (created_by = auth.uid() or public.is_super_admin());

-- leave
create policy leave_read on public.leave_requests for select to authenticated using (user_id = auth.uid() or public.can_manage_user(user_id));
create policy leave_insert on public.leave_requests for insert to authenticated with check (user_id = auth.uid() and status = 'pending');
create policy leave_update on public.leave_requests for update to authenticated using (public.can_manage_user(user_id) or (user_id = auth.uid() and status = 'pending'));
create policy leave_delete on public.leave_requests for delete to authenticated using ((user_id = auth.uid() and status = 'pending') or public.is_super_admin());

-- announcements
create policy ann_read on public.announcements for select to authenticated using (department_id is null or department_id = public.my_department() or public.is_admin_or_above());
create policy ann_write on public.announcements for all to authenticated using (public.is_admin_or_above()) with check (public.is_admin_or_above());

-- audit
create policy audit_read on public.audit_log for select to authenticated using (public.is_super_admin());

-- =====================================================================
-- Storage: private selfie bucket. Path = <user_id>/<file>.jpg
-- =====================================================================
insert into storage.buckets (id, name, public) values ('selfies', 'selfies', false) on conflict (id) do nothing;

create policy selfie_upload on storage.objects for insert to authenticated
  with check (bucket_id = 'selfies' and (storage.foldername(name))[1] = auth.uid()::text);
create policy selfie_read on storage.objects for select to authenticated
  using (bucket_id = 'selfies' and ((storage.foldername(name))[1] = auth.uid()::text or public.can_manage_user(((storage.foldername(name))[1])::uuid)));

-- =====================================================================
-- Realtime
-- =====================================================================
do $$ begin
  alter publication supabase_realtime add table public.messages, public.attendance, public.breaks, public.org_settings;
exception when others then null; end $$;
