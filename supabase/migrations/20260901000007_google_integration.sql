-- ClinicOS — Google Business Profile OAuth + sync architecture
-- (sections 26-34). No live Google API calls happen from this schema alone;
-- these tables are the target a real OAuth/sync job writes into.
--
-- SECURITY: google_oauth_connections holds encrypted tokens and has NO RLS
-- policies for anon/authenticated — see 20260901000010_rls_policies.sql.
-- Only the service role (used from a trusted server context / Edge Function)
-- may ever touch this table. The frontend must never see a refresh token.

create table public.google_oauth_connections (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references public.agencies (id) on delete cascade,
  client_id uuid references public.clients (id) on delete cascade,
  -- Encrypted at rest via pgsodium/Vault or application-layer envelope
  -- encryption before insert — never store either token in plaintext.
  access_token_encrypted text not null,
  refresh_token_encrypted text not null,
  scope text not null,
  token_expires_at timestamptz not null,
  connected_by uuid references public.app_users (id) on delete set null,
  status text not null default 'connected' check (status in ('connected', 'needs-reauth', 'revoked', 'error')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index google_oauth_connections_agency_idx on public.google_oauth_connections (agency_id);
create trigger set_updated_at before update on public.google_oauth_connections
  for each row execute function public.set_updated_at();

create table public.google_accounts (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references public.agencies (id) on delete cascade,
  oauth_connection_id uuid not null references public.google_oauth_connections (id) on delete cascade,
  external_account_id text not null, -- Google "accounts/{id}" resource name
  display_name text,
  created_at timestamptz not null default now(),
  unique (oauth_connection_id, external_account_id)
);

-- One Google account can expose multiple Business Profile locations —
-- never assume 1:1 with a ClinicOS location (section 28/29).
create table public.google_locations (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references public.agencies (id) on delete cascade,
  google_account_id uuid not null references public.google_accounts (id) on delete cascade,
  external_location_id text not null, -- Google "locations/{id}" resource name — never assumed unique by name
  display_name text,
  address text,
  mapped_location_id uuid references public.locations (id) on delete set null,
  created_at timestamptz not null default now(),
  unique (google_account_id, external_location_id)
);
create index google_locations_mapped_idx on public.google_locations (mapped_location_id);

create table public.google_sync_status (
  location_id uuid primary key references public.locations (id) on delete cascade,
  last_sync_at timestamptz,
  sync_status text not null default 'never-synced'
    check (sync_status in ('never-synced', 'syncing', 'synced', 'delayed', 'needs-reauth', 'error')),
  sync_error text,
  updated_at timestamptz not null default now()
);
create trigger set_updated_at before update on public.google_sync_status
  for each row execute function public.set_updated_at();

comment on table public.google_sync_status is
  'One row per location. A background job (every 6-12h per spec section 31) upserts this after each sync attempt — the UI reads sync_status to show Connected/Syncing/Delayed/Needs Reauthorization/Error without ever calling Google directly.';
