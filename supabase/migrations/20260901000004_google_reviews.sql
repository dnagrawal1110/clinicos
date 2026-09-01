-- ClinicOS — Google reviews ingested from the Business Profile, and the
-- human-in-the-loop response workflow (section 33/34). AI never auto-publishes.

create table public.google_reviews (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references public.agencies (id) on delete cascade,
  client_id uuid not null references public.clients (id) on delete cascade,
  location_id uuid not null references public.locations (id) on delete cascade,
  external_review_id text not null unique, -- Google's review resource id — upsert key, never duplicate
  reviewer_display_name text,
  rating int not null check (rating between 1 and 5),
  review_text text,
  sentiment text check (sentiment in ('positive', 'neutral', 'negative')),
  published_at timestamptz not null,
  updated_at timestamptz not null default now(),
  response_status text not null default 'pending' check (response_status in ('needs-response', 'ai-draft-ready', 'pending-approval', 'approved', 'published', 'escalated')),
  created_at timestamptz not null default now()
);
create index google_reviews_location_idx on public.google_reviews (location_id);
create index google_reviews_response_status_idx on public.google_reviews (response_status);

create table public.review_responses (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references public.agencies (id) on delete cascade,
  google_review_id uuid not null references public.google_reviews (id) on delete cascade,
  draft_text text not null,
  status text not null default 'drafted' check (status in ('drafted', 'edited', 'approved', 'published')),
  approved_by uuid references public.app_users (id) on delete set null,
  approved_at timestamptz,
  published_at timestamptz,
  external_response_id text, -- Google's response resource id once published
  created_at timestamptz not null default now()
);
create index review_responses_review_idx on public.review_responses (google_review_id);

comment on table public.review_responses is
  'One row per drafted response attempt. status only reaches published after a human approval — see spec section 34, never auto-publish AI text.';
