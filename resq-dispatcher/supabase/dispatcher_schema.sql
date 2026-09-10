-- ResQPartido — dispatcher console schema patch
-- Run this in the Supabase SQL editor AFTER the citizen app's schema.sql.
-- It gives dispatcher accounts read/update access to every incident (the
-- citizen app's original policies only let a citizen see their own rows),
-- and turns on Realtime so the dispatcher dashboard updates live the
-- moment a citizen submits a report.

-- ---------------------------------------------------------------
-- 1. Role flag on profiles. Every signup defaults to 'citizen'.
--    Promote a dispatcher/admin account by hand:
--      update public.profiles set role = 'dispatcher' where email = '...';
-- ---------------------------------------------------------------
alter table public.profiles
  add column if not exists role text not null default 'citizen'
  check (role in ('citizen', 'dispatcher', 'admin'));

-- small helper so policies below stay readable
create or replace function public.is_dispatcher()
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role in ('dispatcher', 'admin')
  );
$$;

-- ---------------------------------------------------------------
-- 2. Incidents: dispatchers can read every report and update status.
-- ---------------------------------------------------------------
create policy "incidents: dispatcher read all" on public.incidents
  for select using (public.is_dispatcher());

create policy "incidents: dispatcher update status" on public.incidents
  for update using (public.is_dispatcher())
  with check (public.is_dispatcher());

-- ---------------------------------------------------------------
-- 3. Incident media: dispatchers can view attached photos/videos.
-- ---------------------------------------------------------------
create policy "incident_media: dispatcher read all" on public.incident_media
  for select using (public.is_dispatcher());

-- ---------------------------------------------------------------
-- 4. Profiles: dispatchers can look up the reporter's name/municipality
--    next to a report (read-only, no write access to other people's rows).
-- ---------------------------------------------------------------
create policy "profiles: dispatcher read all" on public.profiles
  for select using (public.is_dispatcher());

-- ---------------------------------------------------------------
-- 5. Turn on Realtime for incidents so new reports + status changes
--    push to the dashboard live (Database > Replication in the dashboard
--    does the same thing if you prefer the UI).
-- ---------------------------------------------------------------
alter publication supabase_realtime add table public.incidents;

-- ---------------------------------------------------------------
-- 6. Optional: verified_at / responded_at timestamps so the "Reports
--    Overview" trend chart can plot when a report moved through the
--    pipeline, not just when it was created.
-- ---------------------------------------------------------------
alter table public.incidents add column if not exists verified_at timestamptz;
alter table public.incidents add column if not exists responded_at timestamptz;
