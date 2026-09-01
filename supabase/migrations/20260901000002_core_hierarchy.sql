-- ClinicOS — core org hierarchy: Agency -> Client -> Doctor -> Location,
-- plus the app-level user/team layer that sits on top of Supabase Auth.
--
-- Every tenant-owned table in this schema carries an agency_id. Nothing here
-- assumes a single-agency deployment: a fresh install can seed N agencies
-- and RLS (see 20260901000010_rls_policies.sql) keeps them isolated.

create table public.agencies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  tagline text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger set_updated_at before update on public.agencies
  for each row execute function public.set_updated_at();

-- One row per authenticated Supabase Auth user, extending auth.users with
-- the agency/role information the rest of the app (and RLS) needs.
-- IMPORTANT: never widen RLS on this table to let a user read other users'
-- rows outside their own agency — auth_agency_id() depends on it being safe.
create table public.app_users (
  id uuid primary key references auth.users (id) on delete cascade,
  agency_id uuid not null references public.agencies (id) on delete cascade,
  team_member_id uuid, -- FK added after team_members exists, see below
  email text not null,
  display_name text,
  role text not null default 'Read Only'
    check (role in ('Admin', 'Account Manager', 'Reputation Manager', 'Content Manager', 'Read Only')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index app_users_agency_idx on public.app_users (agency_id);
create trigger set_updated_at before update on public.app_users
  for each row execute function public.set_updated_at();

-- Team members mirror the existing TeamMember mock type. Not every team
-- member has a login (e.g. seeded historical assignees) — app_users links
-- in only when that person actually gets Supabase Auth access.
create table public.team_members (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references public.agencies (id) on delete cascade,
  name text not null,
  role text not null
    check (role in ('Admin', 'Account Manager', 'SEO', 'Content', 'Social', 'Performance', 'Reputation', 'Web/Tech', 'Creative', 'Read Only')),
  team text not null,
  created_at timestamptz not null default now()
);
create index team_members_agency_idx on public.team_members (agency_id);

alter table public.app_users
  add constraint app_users_team_member_fk
  foreign key (team_member_id) references public.team_members (id) on delete set null;

create table public.clients (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references public.agencies (id) on delete cascade,
  name text not null,
  brand text,
  specialty text not null,
  city text not null,
  status text not null default 'active'
    check (status in ('active', 'onboarding', 'at-risk', 'paused')),
  account_manager_id uuid references public.team_members (id) on delete set null,
  active_services text[] not null default '{}',
  scores jsonb not null default '{}'::jsonb, -- ModuleScores snapshot; authoritative history lives in location_daily_metrics
  health_overall int not null default 0,
  health_trend int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index clients_agency_idx on public.clients (agency_id);
create index clients_name_trgm_idx on public.clients using gin (name extensions.gin_trgm_ops);
create trigger set_updated_at before update on public.clients
  for each row execute function public.set_updated_at();

create table public.doctors (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references public.agencies (id) on delete cascade,
  client_id uuid not null references public.clients (id) on delete cascade,
  name text not null,
  specialty text not null,
  created_at timestamptz not null default now()
);
create index doctors_agency_idx on public.doctors (agency_id);
create index doctors_client_idx on public.doctors (client_id);

create table public.locations (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references public.agencies (id) on delete cascade,
  client_id uuid not null references public.clients (id) on delete cascade,
  slug text not null unique, -- public-facing ReviewFlow URL segment
  name text not null,
  city text not null,
  address text,
  phone text,
  hours text,
  status text not null default 'active' check (status in ('active', 'onboarding', 'paused')),
  google_connected boolean not null default false,
  rating numeric(2,1) not null default 0,
  review_count int not null default 0,
  reviews_this_month int not null default 0,
  review_delta_30d int not null default 0,
  scores jsonb not null default '{}'::jsonb,
  health_overall int not null default 0,
  services int not null default 0,
  photos int not null default 0,
  posts_active boolean not null default false,
  leads_this_month int not null default 0,
  ad_spend_this_month numeric(12,2) not null default 0,
  has_ads boolean not null default false,
  last_activity timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index locations_agency_idx on public.locations (agency_id);
create index locations_client_idx on public.locations (client_id);
create trigger set_updated_at before update on public.locations
  for each row execute function public.set_updated_at();

-- A doctor can practice at multiple locations; a location can have multiple
-- doctors. Never assume 1:1 (see spec section 1/3).
create table public.doctor_locations (
  doctor_id uuid not null references public.doctors (id) on delete cascade,
  location_id uuid not null references public.locations (id) on delete cascade,
  primary key (doctor_id, location_id)
);
create index doctor_locations_location_idx on public.doctor_locations (location_id);

-- Explicit account-manager-style assignment (section 6). A row here grants
-- that team member visibility into that location under RLS. Assigning an
-- entire client just means inserting one row per that client's locations —
-- kept flat rather than a separate client-level table so every downstream
-- query (My Accounts, RLS) has one shape to check.
create table public.team_member_locations (
  team_member_id uuid not null references public.team_members (id) on delete cascade,
  location_id uuid not null references public.locations (id) on delete cascade,
  assigned_at timestamptz not null default now(),
  primary key (team_member_id, location_id)
);
create index team_member_locations_location_idx on public.team_member_locations (location_id);
