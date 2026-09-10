-- ResQPartido — dispatcher-broadcast emergency alerts
-- Run this in the Supabase SQL editor AFTER dispatcher_schema.sql (it relies
-- on public.is_dispatcher() and public.profiles.role created there).
--
-- This is the "post an alert" feature on the Manage Alerts screen: a
-- dispatcher writes a title, description, emergency type, threat level,
-- location, and optional photo/video, and every citizen using the app can
-- read it in real time.

-- ---------------------------------------------------------------
-- 1. emergency_alerts — one row per broadcast alert a dispatcher posts.
-- ---------------------------------------------------------------
create table if not exists public.emergency_alerts (
  id uuid primary key default gen_random_uuid(),
  dispatcher_id uuid references auth.users(id) on delete set null,
  title text not null,
  description text not null,
  alert_type text not null,
  threat_level text not null check (threat_level in ('low', 'moderate', 'high', 'critical')),
  municipality text,
  address text,
  latitude double precision,
  longitude double precision,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.emergency_alerts enable row level security;

-- Every signed-in user (citizen or dispatcher) can read alerts — this is a
-- public broadcast, not private data.
create policy "emergency_alerts: read all" on public.emergency_alerts
  for select using (true);

create policy "emergency_alerts: dispatcher insert" on public.emergency_alerts
  for insert with check (public.is_dispatcher());

create policy "emergency_alerts: dispatcher update" on public.emergency_alerts
  for update using (public.is_dispatcher()) with check (public.is_dispatcher());

create policy "emergency_alerts: dispatcher delete" on public.emergency_alerts
  for delete using (public.is_dispatcher());

-- ---------------------------------------------------------------
-- 2. emergency_alert_media — photo/video attachments for a posted alert.
-- ---------------------------------------------------------------
create table if not exists public.emergency_alert_media (
  id uuid primary key default gen_random_uuid(),
  alert_id uuid not null references public.emergency_alerts(id) on delete cascade,
  file_url text not null,
  file_type text not null, -- photo | video
  created_at timestamptz not null default now()
);

alter table public.emergency_alert_media enable row level security;

create policy "emergency_alert_media: read all" on public.emergency_alert_media
  for select using (true);

create policy "emergency_alert_media: dispatcher insert" on public.emergency_alert_media
  for insert with check (public.is_dispatcher());

create policy "emergency_alert_media: dispatcher delete" on public.emergency_alert_media
  for delete using (public.is_dispatcher());

-- ---------------------------------------------------------------
-- 3. Realtime — push new/updated alerts to the citizen app instantly.
-- ---------------------------------------------------------------
alter publication supabase_realtime add table public.emergency_alerts;

-- ---------------------------------------------------------------
-- 4. Storage: bucket for alert photos/videos, dispatcher-only upload,
--    public read (same pattern as the citizen app's incident-media bucket).
-- ---------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('alert-media', 'alert-media', true)
on conflict (id) do nothing;

create policy "alert-media: dispatcher upload"
  on storage.objects for insert
  with check (bucket_id = 'alert-media' and public.is_dispatcher());

create policy "alert-media: dispatcher delete"
  on storage.objects for delete
  using (bucket_id = 'alert-media' and public.is_dispatcher());

create policy "alert-media: public read"
  on storage.objects for select
  using (bucket_id = 'alert-media');
