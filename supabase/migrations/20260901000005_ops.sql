-- ClinicOS — agency operating layer: tasks, alerts, audit log, notifications.

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references public.agencies (id) on delete cascade,
  client_id uuid not null references public.clients (id) on delete cascade,
  location_id uuid references public.locations (id) on delete cascade,
  doctor_id uuid references public.doctors (id) on delete set null,
  module text not null,
  title text not null,
  priority text not null default 'medium' check (priority in ('high', 'medium', 'low')),
  owner_team_member_id uuid references public.team_members (id) on delete set null,
  due_date date,
  status text not null default 'open' check (status in ('open', 'in-progress', 'done', 'blocked')),
  ai_recommended boolean not null default false,
  source text not null default 'manual' check (source in ('ai-audit', 'manual', 'client-request', 'system')),
  -- Where a task originated from a specific piece of feedback/audit finding —
  -- keeps the "evidence" link without a hard FK to every possible source table.
  origin_type text,
  origin_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index tasks_agency_idx on public.tasks (agency_id);
create index tasks_location_idx on public.tasks (location_id);
create index tasks_status_idx on public.tasks (status);
create trigger set_updated_at before update on public.tasks
  for each row execute function public.set_updated_at();

create table public.alerts (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references public.agencies (id) on delete cascade,
  client_id uuid references public.clients (id) on delete cascade,
  location_id uuid references public.locations (id) on delete cascade,
  module text,
  tone text not null check (tone in ('critical', 'attention', 'opportunity', 'info', 'success')),
  title text not null,
  detail text not null,
  created_at timestamptz not null default now()
);
create index alerts_agency_idx on public.alerts (agency_id);
create index alerts_location_idx on public.alerts (location_id);

create table public.audit_log (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references public.agencies (id) on delete cascade,
  actor_user_id uuid references public.app_users (id) on delete set null,
  actor_label text not null, -- denormalized display name/role, survives user deletion
  action text not null,
  entity_type text not null,
  entity_id text not null,
  client_id uuid references public.clients (id) on delete set null,
  location_id uuid references public.locations (id) on delete set null,
  old_value jsonb,
  new_value jsonb,
  detail text,
  created_at timestamptz not null default now()
);
create index audit_log_agency_idx on public.audit_log (agency_id, created_at desc);

comment on table public.audit_log is
  'Append-only. IP/device columns intentionally omitted — add only with explicit legal review per spec section 51.';

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references public.agencies (id) on delete cascade,
  user_id uuid not null references public.app_users (id) on delete cascade,
  type text not null,
  title text not null,
  body text,
  related_entity_type text,
  related_entity_id uuid,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index notifications_user_idx on public.notifications (user_id, read_at);

create table public.notification_preferences (
  user_id uuid not null references public.app_users (id) on delete cascade,
  channel text not null check (channel in ('in-app', 'email', 'whatsapp', 'slack', 'push')),
  notification_type text not null,
  enabled boolean not null default true,
  primary key (user_id, channel, notification_type)
);
