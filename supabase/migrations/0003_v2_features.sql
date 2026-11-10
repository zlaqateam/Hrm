-- =====================================================================
-- Zlaqa Team OS v2: standup + mood pulse, geofence, holidays, kudos,
-- notifications, tamper-resistant server timestamps.
-- Run after 0001_schema.sql.
-- =====================================================================

-- ---------- settings ----------
alter table public.org_settings
  add column if not exists daily_plan_prompt boolean not null default true,
  add column if not exists mood_pulse boolean not null default true,
  add column if not exists geofence_mode text not null default 'off' check (geofence_mode in ('off','flag','block')),
  add column if not exists office_lat double precision,
  add column if not exists office_lng double precision,
  add column if not exists office_radius_m int not null default 250,
  add column if not exists kudos_values text[] not null default '{"Ownership","Teamwork","Courage","Craft","Customer love","Kindness"}';

update public.org_settings
set modules = modules || '{"kudos":true,"calendar":true}'::jsonb
where id = 1 and not (modules ? 'kudos');

-- new dashboard defaults, only if the Super Admin never customised them
update public.org_settings
set dashboard_widgets = '{"super_admin":["welcome","org_stats","insights","team_pulse","attendance_trend","leaderboard","dept_breakdown","okr_progress","standup","kudos","celebrations","leave_pending"],"admin":["welcome","my_shift","org_stats","insights","team_status","standup","team_pulse","okr_progress","leaderboard","leave_pending","kudos","my_tasks"],"member":["welcome","my_shift","my_performance","my_okrs","my_tasks","kudos","celebrations","announcements","standup"]}'::jsonb
where id = 1 and dashboard_widgets = '{"super_admin":["welcome","org_stats","attendance_trend","leaderboard","dept_breakdown","okr_progress","team_status","leave_pending","announcements"],"admin":["welcome","my_shift","org_stats","team_status","okr_progress","leaderboard","leave_pending","my_tasks","announcements"],"member":["welcome","my_shift","my_performance","my_okrs","my_tasks","announcements","leaderboard"]}'::jsonb;

-- ---------- attendance: standup + pulse ----------
alter table public.attendance
  add column if not exists plan text not null default '',
  add column if not exists summary text not null default '',
  add column if not exists mood smallint check (mood between 1 and 5);

-- ---------- new tables ----------
create table if not exists public.holidays (
  id uuid primary key default gen_random_uuid(),
  date date not null unique,
  name text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.kudos (
  id uuid primary key default gen_random_uuid(),
  from_id uuid not null references public.profiles(id) on delete cascade,
  to_id uuid not null references public.profiles(id) on delete cascade,
  value text not null default '',
  message text not null check (length(message) between 1 and 500),
  created_at timestamptz not null default now(),
  check (from_id <> to_id)
);
create index if not exists kudos_created_idx on public.kudos(created_at desc);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  body text not null default '',
  link text not null default '',
  kind text not null default 'info',
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists notifications_user_idx on public.notifications(user_id, created_at desc);

alter table public.holidays enable row level security;
alter table public.kudos enable row level security;
alter table public.notifications enable row level security;

create policy hol_read on public.holidays for select to authenticated using (true);
create policy hol_write on public.holidays for all to authenticated using (public.is_super_admin()) with check (public.is_super_admin());

create policy kudos_read on public.kudos for select to authenticated using (true);
create policy kudos_insert on public.kudos for insert to authenticated with check (from_id = auth.uid());
create policy kudos_delete on public.kudos for delete to authenticated using (from_id = auth.uid() or public.is_super_admin());

create policy notif_read on public.notifications for select to authenticated using (user_id = auth.uid());
create policy notif_insert on public.notifications for insert to authenticated with check (true);
create policy notif_update on public.notifications for update to authenticated using (user_id = auth.uid());
create policy notif_delete on public.notifications for delete to authenticated using (user_id = auth.uid());

drop trigger if exists audit_holidays on public.holidays;
create trigger audit_holidays after insert or update or delete on public.holidays for each row execute function public.audit_trigger();

-- ---------- tamper-resistant time ----------
-- When an employee checks in/out or takes a break, the SERVER clock decides the time
-- and the late status. Managers' corrections (can_manage_user) are kept as entered.
create or replace function public.stamp_attendance() returns trigger
language plpgsql security definer set search_path = public as $$
declare s record;
begin
  if auth.uid() is null or new.user_id <> auth.uid() then return new; end if;
  select timezone, work_start, late_after_minutes into s from org_settings where id = 1;
  if tg_op = 'INSERT' then
    new.date := (now() at time zone s.timezone)::date;
    if new.check_in is not null then
      new.check_in := now();
      new.status := case
        when now() > ((new.date + s.work_start::time) at time zone s.timezone) + make_interval(mins => s.late_after_minutes) then 'late'
        else 'present' end;
    end if;
  elsif not public.is_super_admin() then
    new.check_in := old.check_in;
    new.date := old.date;
    if old.check_out is null and new.check_out is not null then new.check_out := now(); end if;
  end if;
  return new;
end $$;

drop trigger if exists stamp_attendance on public.attendance;
create trigger stamp_attendance before insert or update on public.attendance
for each row execute function public.stamp_attendance();

create or replace function public.stamp_breaks() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null or new.user_id <> auth.uid() then return new; end if;
  if tg_op = 'INSERT' then new.start_at := now();
  else
    new.start_at := old.start_at;
    if old.end_at is null and new.end_at is not null then new.end_at := now(); end if;
  end if;
  return new;
end $$;

drop trigger if exists stamp_breaks on public.breaks;
create trigger stamp_breaks before insert or update on public.breaks
for each row execute function public.stamp_breaks();

-- ---------- realtime ----------
do $$ begin
  alter publication supabase_realtime add table public.notifications, public.kudos;
exception when others then null; end $$;
