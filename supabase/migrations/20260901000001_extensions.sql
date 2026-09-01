-- ClinicOS — extensions and shared helpers.
-- Kept in its own migration since extensions must exist before anything
-- that uses gen_random_uuid()/crypto functions.

create extension if not exists pgcrypto with schema extensions;
create extension if not exists pg_trgm with schema extensions; -- fast ILIKE search across clients/locations/patients

-- updated_at trigger helper, reused by every table that has one.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

comment on function public.set_updated_at() is
  'Generic BEFORE UPDATE trigger: stamps updated_at = now() on every row change.';
