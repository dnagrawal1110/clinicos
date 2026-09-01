-- ClinicOS — website/local-SEO audit engine, social + ads architecture,
-- content pipeline, and leads (sections 35-47). Architecture-first: ad
-- platform tables capture what the domain needs today without binding to
-- one API's exact shape.

create table public.website_audits (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references public.agencies (id) on delete cascade,
  client_id uuid not null references public.clients (id) on delete cascade,
  url text not null,
  crawl_status text not null default 'pending' check (crawl_status in ('pending', 'crawling', 'complete', 'failed')),
  seo_score int,
  technical_score int,
  content_score int,
  local_seo_score int,
  mobile_score int,
  performance_score int,
  schema_score int,
  conversion_score int,
  -- Per-check detail (title/meta/H1/canonical/robots/sitemap/schema/NAP/
  -- alt-text/CTA presence etc, per spec section 41) — flexible by design
  -- since the checklist will grow independently of the table shape.
  breakdown jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index website_audits_client_idx on public.website_audits (client_id);

create table public.audit_blockers (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references public.agencies (id) on delete cascade,
  location_id uuid not null references public.locations (id) on delete cascade,
  category text not null, -- 'google-profile' | 'website' | 'reviews' | 'local-seo' | ...
  severity text not null check (severity in ('critical', 'high', 'attention', 'medium', 'low')),
  title text not null,
  evidence text,
  recommendation text,
  estimated_impact text check (estimated_impact in ('high', 'medium', 'low')),
  status text not null default 'open' check (status in ('open', 'task-created', 'resolved', 'dismissed')),
  task_id uuid references public.tasks (id) on delete set null,
  created_at timestamptz not null default now()
);
create index audit_blockers_location_idx on public.audit_blockers (location_id);

-- Internal-only (section 39) — never exposed through the client-facing
-- report/portal. Enforced by RLS + application-layer report generation
-- explicitly excluding this table.
create table public.growth_opportunities (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references public.agencies (id) on delete cascade,
  client_id uuid not null references public.clients (id) on delete cascade,
  location_id uuid references public.locations (id) on delete cascade,
  module text not null,
  title text not null,
  description text,
  priority text not null default 'medium' check (priority in ('high', 'medium', 'low')),
  created_at timestamptz not null default now()
);
create index growth_opportunities_client_idx on public.growth_opportunities (client_id);

create table public.social_accounts (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references public.agencies (id) on delete cascade,
  client_id uuid not null references public.clients (id) on delete cascade,
  platform text not null check (platform in ('instagram', 'facebook', 'youtube', 'linkedin')),
  handle text,
  connected boolean not null default false,
  followers int not null default 0,
  engagement_rate numeric(5,2) not null default 0,
  oauth_connection_ref uuid, -- points at a future generic oauth_connections table if/when one exists
  created_at timestamptz not null default now()
);
create index social_accounts_client_idx on public.social_accounts (client_id);

create table public.content_items (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references public.agencies (id) on delete cascade,
  client_id uuid not null references public.clients (id) on delete cascade,
  location_id uuid not null references public.locations (id) on delete cascade,
  channel text not null check (channel in ('google', 'instagram', 'facebook', 'youtube', 'reels')),
  type text not null,
  status text not null default 'idea' check (status in ('idea', 'draft', 'pending', 'approved', 'scheduled', 'published', 'failed')),
  scheduled_date date,
  owner_team_member_id uuid references public.team_members (id) on delete set null,
  caption text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index content_items_location_idx on public.content_items (location_id);
create trigger set_updated_at before update on public.content_items
  for each row execute function public.set_updated_at();

-- Ad platforms — one row per connected account, campaigns/spend rolled up
-- rather than modeling every ad-set/creative level (architecture-first).
create table public.ad_accounts (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references public.agencies (id) on delete cascade,
  client_id uuid not null references public.clients (id) on delete cascade,
  platform text not null check (platform in ('google', 'meta')),
  external_account_id text,
  connected boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.ad_campaigns (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references public.agencies (id) on delete cascade,
  client_id uuid not null references public.clients (id) on delete cascade,
  location_id uuid not null references public.locations (id) on delete cascade,
  ad_account_id uuid references public.ad_accounts (id) on delete set null,
  platform text not null check (platform in ('google', 'meta')),
  name text not null,
  service text,
  landing_page text,
  status text not null default 'active' check (status in ('active', 'paused', 'ended')),
  spend numeric(12,2) not null default 0,
  leads int not null default 0,
  cpl numeric(10,2) not null default 0,
  appointments int not null default 0,
  cpa numeric(10,2) not null default 0,
  conversion_rate numeric(5,2) not null default 0,
  created_at timestamptz not null default now()
);
create index ad_campaigns_location_idx on public.ad_campaigns (location_id);

create table public.leads (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references public.agencies (id) on delete cascade,
  client_id uuid not null references public.clients (id) on delete cascade,
  location_id uuid not null references public.locations (id) on delete cascade,
  doctor_id uuid references public.doctors (id) on delete set null,
  name text,
  source text not null check (source in ('Google Ads', 'Meta Ads', 'Google Business Profile', 'Organic Website', 'WhatsApp', 'Referral', 'ReviewFlow')),
  ad_campaign_id uuid references public.ad_campaigns (id) on delete set null,
  service text,
  value numeric(10,2) not null default 0,
  quality text check (quality in ('hot', 'warm', 'cold')),
  response_time_minutes int,
  status text not null default 'new' check (status in ('new', 'contacted', 'qualified', 'appointment', 'completed', 'lost', 'reactivation')),
  created_at timestamptz not null default now()
);
create index leads_location_idx on public.leads (location_id);
