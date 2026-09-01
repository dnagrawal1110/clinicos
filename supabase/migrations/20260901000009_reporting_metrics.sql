-- ClinicOS — reporting model and daily metric snapshots (sections 48, 55-56).
-- Dashboards should read aggregates here, not recompute from raw event/request
-- tables on every render.

create table public.location_daily_metrics (
  location_id uuid not null references public.locations (id) on delete cascade,
  date date not null,
  review_requests int not null default 0,
  feedback int not null default 0,
  reviews int not null default 0,
  rating numeric(2,1),
  review_velocity int not null default 0, -- % change vs trailing period
  conversion numeric(5,2) not null default 0,
  sentiment jsonb not null default '{}'::jsonb, -- {"positive": n, "neutral": n, "negative": n}
  campaign_spend numeric(12,2) not null default 0,
  leads int not null default 0,
  reputation_health int, -- cached output of the reputation scoring service for this date
  primary key (location_id, date)
);
create index location_daily_metrics_date_idx on public.location_daily_metrics (date);

comment on table public.location_daily_metrics is
  'Populated by a daily job (calculate_reputation_score / snapshot job in the job-queue architecture). All Reputation Overview/velocity-chart/comparison-table reads should hit this table, not raw patient_requests, once live.';

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references public.agencies (id) on delete cascade,
  client_id uuid not null references public.clients (id) on delete cascade,
  period_start date not null,
  period_end date not null,
  location_ids uuid[] not null default '{}',
  -- Client-safe aggregate figures only (section 44/49) — never include
  -- individual patient feedback, internal notes, task assignments, upsell
  -- opportunities, or AI diagnostic text. Enforce that boundary in the
  -- report-generation service, not just by convention here.
  metrics jsonb not null default '{}'::jsonb,
  insights jsonb not null default '[]'::jsonb,
  recommendations jsonb not null default '[]'::jsonb,
  status text not null default 'draft' check (status in ('draft', 'ready', 'sent')),
  generated_at timestamptz,
  created_at timestamptz not null default now()
);
create index reports_client_idx on public.reports (client_id);

comment on table public.reports is
  'Client-facing. RLS must never grant a client-portal role SELECT on tasks, audit_log, growth_opportunities, or website_audits directly — this table is the only sanctioned client-visible surface for agency-generated numbers.';
