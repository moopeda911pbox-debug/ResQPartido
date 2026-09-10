-- ResQPartido — dispatcher agency tagging
-- Run this AFTER dispatcher_schema.sql. Adds which responding agency a
-- dispatcher account belongs to (PNP, BFP, or MDRRMO), so the console can
-- show who's logged in and, later, route/filter alerts by agency if needed.
-- Citizen accounts are unaffected — this column stays null for them.

alter table public.profiles
  add column if not exists agency text
  check (agency in ('PNP', 'BFP', 'MDRRMO'));
