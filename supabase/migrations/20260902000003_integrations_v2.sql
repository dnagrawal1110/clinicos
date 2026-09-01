-- ClinicOS — real-integration architecture: WhatsApp connections, website
-- connections, Google location mapping review, integration activity log,
-- and system health check history. Everything here starts empty — no
-- fabricated "connected" rows. Status columns default to states that are
-- honestly true when nothing has been connected yet ('not-configured',
-- 'disconnected', 'pending').

alter table public.agencies
  add column if not exists workspace_mode text not null default 'demo' check (workspace_mode in ('demo', 'live')),
  add column if not exists read_only_sync boolean not null default true;

comment on column public.agencies.workspace_mode is
  'demo = the deterministic seed dataset; live = only real connected data. Never mixed silently — every read path branches on this, not on presence of rows.';
comment on column public.agencies.read_only_sync is
  'While true, sync jobs may only read from external providers, never write (post content, publish a review response to Google, send a WhatsApp template). Flip to false only after read-only sync has been verified end-to-end for a given integration.';

create table public.whatsapp_connections (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references public.agencies (id) on delete cascade,
  client_id uuid not null references public.clients (id) on delete cascade,
  phone_number text,
  business_account_id text,
  status text not null default 'not-configured'
    check (status in ('connected', 'needs-authorization', 'partially-connected', 'syncing', 'error', 'disconnected', 'mock', 'not-configured')),
  template_status jsonb not null default '{}'::jsonb,
  connected_at timestamptz,
  created_at timestamptz not null default now()
);
create index whatsapp_connections_client_idx on public.whatsapp_connections (client_id);

create table public.websites (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references public.agencies (id) on delete cascade,
  client_id uuid not null references public.clients (id) on delete cascade,
  location_id uuid references public.locations (id) on delete cascade,
  url text,
  status text not null default 'not-configured'
    check (status in ('connected', 'crawling', 'error', 'not-configured')),
  last_crawled_at timestamptz,
  created_at timestamptz not null default now()
);
create index websites_client_idx on public.websites (client_id);

-- The Data Mapping Review queue (section 12/13) — a discovered Google
-- location proposed against a ClinicOS location with a computed confidence,
-- never auto-applied.
create table public.google_location_mapping_candidates (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references public.agencies (id) on delete cascade,
  google_account_id uuid references public.google_accounts (id) on delete cascade,
  external_location_id text not null,
  discovered_name text not null,
  discovered_address text,
  discovered_phone text,
  discovered_website text,
  suggested_location_id uuid references public.locations (id) on delete set null,
  confidence numeric(5,2) not null default 0,
  match_reasons text[] not null default '{}',
  status text not null default 'pending' check (status in ('pending', 'confirmed', 'rejected')),
  reviewed_by uuid references public.app_users (id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);
create index mapping_candidates_agency_idx on public.google_location_mapping_candidates (agency_id, status);

create table public.integration_activity_log (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references public.agencies (id) on delete cascade,
  actor_label text not null,
  client_id uuid references public.clients (id) on delete set null,
  location_id uuid references public.locations (id) on delete set null,
  integration text not null check (integration in ('google', 'instagram', 'facebook', 'whatsapp', 'google-ads', 'meta-ads', 'website')),
  action text not null,
  result text not null check (result in ('success', 'failure', 'skipped')),
  error text,
  created_at timestamptz not null default now()
);
create index integration_activity_log_agency_idx on public.integration_activity_log (agency_id, created_at desc);

create table public.system_health_check_runs (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references public.agencies (id) on delete cascade,
  run_by uuid references public.app_users (id) on delete set null,
  total_locations int not null default 0,
  connected int not null default 0,
  partial int not null default 0,
  errors int not null default 0,
  unmapped int not null default 0,
  needs_attention int not null default 0,
  summary jsonb not null default '{}'::jsonb,
  run_at timestamptz not null default now()
);
create index system_health_check_runs_agency_idx on public.system_health_check_runs (agency_id, run_at desc);

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.whatsapp_connections enable row level security;
alter table public.websites enable row level security;
alter table public.google_location_mapping_candidates enable row level security;
alter table public.integration_activity_log enable row level security;
alter table public.system_health_check_runs enable row level security;

create policy whatsapp_connections_select on public.whatsapp_connections for select
  using (agency_id = public.auth_agency_id() and public.can_access_client(client_id));
create policy whatsapp_connections_write on public.whatsapp_connections for all
  using (agency_id = public.auth_agency_id() and public.auth_role() = 'Admin')
  with check (agency_id = public.auth_agency_id());

create policy websites_select on public.websites for select
  using (agency_id = public.auth_agency_id() and public.can_access_client(client_id));
create policy websites_write on public.websites for all
  using (agency_id = public.auth_agency_id() and public.auth_role() in ('Admin', 'Account Manager'))
  with check (agency_id = public.auth_agency_id());

create policy mapping_candidates_select on public.google_location_mapping_candidates for select
  using (agency_id = public.auth_agency_id() and public.auth_role() = 'Admin');
create policy mapping_candidates_write on public.google_location_mapping_candidates for update
  using (agency_id = public.auth_agency_id() and public.auth_role() = 'Admin')
  with check (agency_id = public.auth_agency_id());

create policy integration_activity_log_select on public.integration_activity_log for select
  using (agency_id = public.auth_agency_id());
create policy integration_activity_log_insert on public.integration_activity_log for insert
  with check (agency_id = public.auth_agency_id());

create policy system_health_check_runs_select on public.system_health_check_runs for select
  using (agency_id = public.auth_agency_id());
create policy system_health_check_runs_insert on public.system_health_check_runs for insert
  with check (agency_id = public.auth_agency_id());
