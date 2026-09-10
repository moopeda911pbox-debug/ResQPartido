-- ResQPartido — account archiving
-- Run this in the Supabase SQL editor AFTER dispatcher_schema.sql (it needs
-- the `role` column and the is_dispatcher() helper that migration adds).
--
-- Lets an admin "archive" any account (citizen, dispatcher, or another
-- admin) instead of deleting it outright — reversible, and the archived
-- account is blocked from signing in until an admin restores it.

alter table public.profiles
  add column if not exists is_archived boolean not null default false;
alter table public.profiles
  add column if not exists archived_at timestamptz;

-- Stricter than is_dispatcher() (which also returns true for dispatchers) —
-- archiving accounts is an admin-only action.
create or replace function public.is_admin()
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'
  );
$$;

-- Admins can update any profile row (needed for the archive toggle below,
-- and generally appropriate for an admin-only account management screen).
-- Row-level, like the rest of these policies — Postgres RLS doesn't scope
-- to individual columns, so this isn't limited to just is_archived.
create policy "profiles: admin archive toggle" on public.profiles
  for update using (public.is_admin())
  with check (public.is_admin());
