-- ClinicOS — provider-neutral production integration model (Production
-- Activation Phase 1, Part 2-4). Replaces the Google-specific architecture
-- tables from 20260901000007_google_integration.sql, which never held real
-- data (no OAuth flow existed yet) — safe to drop and replace rather than
-- migrate in place.
--
-- Core hierarchy (Agency -> Client -> Doctor -> Location -> Channel) is
-- untouched. This migration adds the INDEPENDENT hierarchy:
--   Agency -> Connection -> External Asset -> Asset Mapping -> Sync Job -> Sync Run -> Sync Error

drop table if exists public.google_location_mapping_candidates;
drop table if exists public.google_sync_status;
drop table if exists public.google_locations;
drop table if exists public.google_accounts;
drop table if exists public.google_oauth_connections;

-- ---------------------------------------------------------------------------
-- CONNECTION — an authorized external identity/session. Token columns hold
-- ciphertext only (see src/lib/crypto/token-encryption.ts); the encryption
-- key never lives in this database. Direct table SELECT is revoked from
-- authenticated/anon below — everyone reads through connection_summaries.
-- ---------------------------------------------------------------------------
create table public.connections (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references public.agencies (id) on delete cascade,
  client_id uuid references public.clients (id) on delete cascade, -- nullable: true until a location is mapped
  provider text not null check (provider in ('google-business-profile', 'google-ads', 'meta', 'whatsapp')),
  connection_type text not null default 'oauth' check (connection_type in ('oauth', 'api-key', 'manual')),
  status text not null default 'not-connected' check (status in (
    'not-connected', 'authorization-required', 'authorizing', 'authenticated', 'discovering',
    'mapping-required', 'partially-mapped', 'syncing', 'healthy', 'degraded', 'sync-error',
    'token-expired', 'revoked', 'disconnected', 'write-disabled'
  )),
  external_account_id text,
  external_account_name text,
  granted_scopes text[] not null default '{}',
  access_token_ciphertext text,
  access_token_iv text,
  refresh_token_ciphertext text,
  refresh_token_iv text,
  token_expires_at timestamptz,
  created_by uuid references public.app_users (id) on delete set null,
  last_successful_sync_at timestamptz,
  last_failed_sync_at timestamptz,
  last_error_code text,
  last_error_message text,
  -- Granular capabilities (Part 10) — never a single write-enabled boolean.
  -- Read capabilities are populated from granted_scopes at connect time;
  -- write capabilities require an explicit, separate opt-in per capability.
  read_capabilities text[] not null default '{}',
  write_capabilities_enabled text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index connections_agency_idx on public.connections (agency_id);
create index connections_client_idx on public.connections (client_id);
create trigger set_updated_at before update on public.connections
  for each row execute function public.set_updated_at();

comment on column public.connections.access_token_ciphertext is
  'AES-256-GCM ciphertext, encrypted server-side before insert. Never selectable by authenticated/anon roles — see connection_summaries view and the revoked grants below.';

-- ---------------------------------------------------------------------------
-- EXTERNAL ASSET — anything discovered under a connection: a Google
-- account, a Google location, a Meta business portfolio, a WhatsApp phone
-- number, etc. One connection can expose many assets (Part 3).
-- ---------------------------------------------------------------------------
create table public.external_assets (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references public.agencies (id) on delete cascade,
  connection_id uuid not null references public.connections (id) on delete cascade,
  provider text not null,
  asset_type text not null check (asset_type in (
    'google-account', 'google-location', 'google-ads-customer',
    'meta-business-portfolio', 'facebook-page', 'instagram-account',
    'whatsapp-business-account', 'whatsapp-phone-number'
  )),
  external_id text not null,
  external_parent_id text,
  external_name text,
  status text not null default 'discovered' check (status in ('discovered', 'stale', 'unavailable', 'not-authorized')),
  metadata jsonb not null default '{}'::jsonb,
  discovered_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  unique (connection_id, external_id)
);
create index external_assets_agency_idx on public.external_assets (agency_id);
create index external_assets_connection_idx on public.external_assets (connection_id);

-- ---------------------------------------------------------------------------
-- ASSET MAPPING — explicit, auditable, reversible, confidence-scored
-- (Part 4). One row per external asset; never silently created for a
-- low-confidence match.
-- ---------------------------------------------------------------------------
create table public.asset_mappings (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references public.agencies (id) on delete cascade,
  external_asset_id uuid not null references public.external_assets (id) on delete cascade,
  client_id uuid references public.clients (id) on delete set null,
  doctor_id uuid references public.doctors (id) on delete set null,
  location_id uuid references public.locations (id) on delete set null,
  channel text not null default 'google-business-profile',
  confidence numeric(5,2) not null default 0,
  match_reasons text[] not null default '{}',
  status text not null default 'pending' check (status in ('pending', 'confirmed', 'rejected', 'changed')),
  confirmed_by uuid references public.app_users (id) on delete set null,
  confirmed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (external_asset_id)
);
create index asset_mappings_agency_idx on public.asset_mappings (agency_id, status);
create index asset_mappings_location_idx on public.asset_mappings (location_id);

-- ---------------------------------------------------------------------------
-- SYNC JOB / SYNC RUN / SYNC ERROR — server-side sync execution history
-- (Part 26). A job is one "Sync Now" invocation; a run is one step within
-- it (Journey G's 8 steps); an error is a retryable failure within a run.
-- ---------------------------------------------------------------------------
create table public.sync_jobs (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references public.agencies (id) on delete cascade,
  connection_id uuid not null references public.connections (id) on delete cascade,
  job_type text not null check (job_type in ('initial-sync', 'incremental-sync', 'manual-sync', 'retry')),
  status text not null default 'pending' check (status in ('pending', 'running', 'completed', 'failed', 'partial')),
  scheduled_at timestamptz not null default now(),
  started_at timestamptz,
  finished_at timestamptz,
  created_at timestamptz not null default now()
);
create index sync_jobs_connection_idx on public.sync_jobs (connection_id, created_at desc);

create table public.sync_runs (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references public.agencies (id) on delete cascade,
  sync_job_id uuid not null references public.sync_jobs (id) on delete cascade,
  connection_id uuid not null references public.connections (id) on delete cascade,
  step text not null check (step in (
    'connection-verified', 'locations-synced', 'profile-synced', 'reviews-synced',
    'media-synced', 'posts-synced', 'performance-synced', 'audit-generated'
  )),
  status text not null default 'pending' check (status in ('pending', 'running', 'completed', 'failed', 'skipped')),
  started_at timestamptz,
  finished_at timestamptz,
  records_imported int not null default 0,
  records_updated int not null default 0,
  records_failed int not null default 0,
  error_code text,
  error_message text,
  created_at timestamptz not null default now()
);
create index sync_runs_job_idx on public.sync_runs (sync_job_id);

create table public.sync_errors (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references public.agencies (id) on delete cascade,
  sync_run_id uuid not null references public.sync_runs (id) on delete cascade,
  error_code text not null,
  error_message text not null,
  retry_count int not null default 0,
  occurred_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Audit log + provenance extensions (Part 12, 31)
-- ---------------------------------------------------------------------------
alter table public.integration_activity_log
  add column if not exists connection_id uuid references public.connections (id) on delete set null,
  add column if not exists asset_id uuid references public.external_assets (id) on delete set null,
  add column if not exists metadata jsonb not null default '{}'::jsonb;

alter table public.google_reviews
  add column if not exists source_connection_id uuid references public.connections (id) on delete set null,
  add column if not exists last_synced_at timestamptz;

comment on column public.google_reviews.external_review_id is
  'Provenance + idempotency key (Part 25/31): upsert on this column, never insert blindly, so a re-run sync cannot duplicate a review.';

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.connections enable row level security;
alter table public.external_assets enable row level security;
alter table public.asset_mappings enable row level security;
alter table public.sync_jobs enable row level security;
alter table public.sync_runs enable row level security;
alter table public.sync_errors enable row level security;

-- Row-level policy still applies (agency isolation) — column-level secrecy
-- is enforced separately by revoking table SELECT and granting the view
-- instead (see below). Both layers matter: RLS stops cross-agency reads,
-- the view stops even same-agency users from ever seeing ciphertext.
create policy connections_select on public.connections for select
  using (agency_id = public.auth_agency_id() and public.auth_role() in ('Admin', 'Account Manager', 'Reputation Manager'));
create policy connections_write on public.connections for all
  using (agency_id = public.auth_agency_id() and public.auth_role() = 'Admin')
  with check (agency_id = public.auth_agency_id());

create view public.connection_summaries
with (security_invoker = true) as
  select id, agency_id, client_id, provider, connection_type, status,
         external_account_id, external_account_name, granted_scopes,
         token_expires_at, created_by, last_successful_sync_at, last_failed_sync_at,
         last_error_code, last_error_message, read_capabilities, write_capabilities_enabled,
         created_at, updated_at
  from public.connections;

revoke select on public.connections from authenticated, anon;
grant select on public.connection_summaries to authenticated;

create policy external_assets_select on public.external_assets for select
  using (agency_id = public.auth_agency_id() and public.auth_role() in ('Admin', 'Account Manager', 'Reputation Manager'));

create policy asset_mappings_select on public.asset_mappings for select
  using (agency_id = public.auth_agency_id() and public.auth_role() in ('Admin', 'Account Manager', 'Reputation Manager'));
create policy asset_mappings_write on public.asset_mappings for update
  using (agency_id = public.auth_agency_id() and public.auth_role() in ('Admin', 'Account Manager'))
  with check (agency_id = public.auth_agency_id());

create policy sync_jobs_select on public.sync_jobs for select
  using (agency_id = public.auth_agency_id());
create policy sync_runs_select on public.sync_runs for select
  using (agency_id = public.auth_agency_id());
create policy sync_errors_select on public.sync_errors for select
  using (agency_id = public.auth_agency_id());
