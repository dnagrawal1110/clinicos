-- ClinicOS — ReviewFlow backend: programs, destinations, campaigns,
-- automations, patients, and the secure tokenized request lifecycle.
-- This is the highest-priority module in the spec (section 9).

create table public.review_destinations (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references public.agencies (id) on delete cascade,
  client_id uuid not null references public.clients (id) on delete cascade,
  location_id uuid not null references public.locations (id) on delete cascade,
  type text not null check (type in ('google', 'facebook', 'other', 'internal')),
  name text not null,
  url text not null,
  status text not null default 'not-configured'
    check (status in ('connected', 'disconnected', 'invalid', 'not-configured', 'unavailable')),
  priority int not null default 1,
  enabled boolean not null default true,
  external_ref text, -- e.g. Google place ID once mapped — see google integration migration
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index review_destinations_location_idx on public.review_destinations (location_id);
create trigger set_updated_at before update on public.review_destinations
  for each row execute function public.set_updated_at();

create table public.review_programs (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references public.agencies (id) on delete cascade,
  client_id uuid not null references public.clients (id) on delete cascade,
  location_id uuid not null references public.locations (id) on delete cascade,
  name text not null,
  status text not null default 'setup-required'
    check (status in ('setup-required', 'active', 'paused', 'needs-attention', 'disconnected', 'archived')),
  destination_id uuid references public.review_destinations (id) on delete set null,
  automation_enabled boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (location_id) -- one review program per location for now; revisit if a location ever needs >1
);
create index review_programs_agency_idx on public.review_programs (agency_id);
create trigger set_updated_at before update on public.review_programs
  for each row execute function public.set_updated_at();

create table public.campaign_templates (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references public.agencies (id) on delete cascade,
  name text not null,
  trigger text not null,
  channel text not null check (channel in ('whatsapp', 'sms', 'email', 'qr', 'link')),
  language text not null default 'en',
  message_body text not null,
  created_at timestamptz not null default now()
);
create index campaign_templates_agency_idx on public.campaign_templates (agency_id);

create table public.campaigns (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references public.agencies (id) on delete cascade,
  client_id uuid not null references public.clients (id) on delete cascade,
  location_id uuid not null references public.locations (id) on delete cascade,
  review_program_id uuid not null references public.review_programs (id) on delete cascade,
  doctor_id uuid references public.doctors (id) on delete set null,
  template_id uuid references public.campaign_templates (id) on delete set null,
  name text not null,
  status text not null default 'draft' check (status in ('active', 'paused', 'draft', 'completed')),
  trigger text not null,
  audience text not null default 'All patients',
  language text not null default 'English',
  channel text not null default 'WhatsApp',
  destination_id uuid references public.review_destinations (id) on delete set null,
  max_requests_per_patient int not null default 2,
  frequency_cap_days int not null default 30,
  eligible_patients int not null default 0,
  requests_sent int not null default 0,
  opened int not null default 0,
  feedback_received int not null default 0,
  google_clicks int not null default 0,
  reviews_generated int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index campaigns_agency_idx on public.campaigns (agency_id);
create index campaigns_location_idx on public.campaigns (location_id);
create index campaigns_program_idx on public.campaigns (review_program_id);
create trigger set_updated_at before update on public.campaigns
  for each row execute function public.set_updated_at();

-- Always-on automation (distinct from one-off Campaigns — section 5/6).
create table public.automations (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references public.agencies (id) on delete cascade,
  location_id uuid references public.locations (id) on delete cascade, -- null = agency-wide template
  name text not null,
  trigger_condition text not null
    check (trigger_condition in ('Appointment completed', 'Treatment completed', 'Follow-up completed', 'Invoice paid', 'Patient marked eligible', 'Manual trigger', 'Webhook trigger', 'Import trigger')),
  action text not null,
  enabled boolean not null default true,
  wait_hours int not null default 2,
  channel text default 'whatsapp' check (channel in ('whatsapp', 'sms', 'email', 'qr')),
  reminder_after_hours int default 24,
  max_attempts int not null default 2,
  frequency_cap_days int not null default 30,
  quiet_hours_start time default '21:00',
  quiet_hours_end time default '08:00',
  timezone text not null default 'Asia/Kolkata',
  conditions text[] not null default '{opted-out,recent-duplicate,campaign-active,location-active,destination-connected,quiet-hours}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index automations_agency_idx on public.automations (agency_id);
create trigger set_updated_at before update on public.automations
  for each row execute function public.set_updated_at();

create table public.automation_steps (
  id uuid primary key default gen_random_uuid(),
  automation_id uuid not null references public.automations (id) on delete cascade,
  position int not null,
  label text not null,
  detail text,
  unique (automation_id, position)
);

-- ---------------------------------------------------------------------------
-- Patients — deliberately minimal (section 16). No medical data, ever.
-- ---------------------------------------------------------------------------
create table public.patients (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references public.agencies (id) on delete cascade,
  client_id uuid not null references public.clients (id) on delete cascade,
  external_id text, -- the clinic/PMS's own patient reference, never a name
  masked_display_name text not null, -- e.g. "Patient #4821" — never a real name
  phone text, -- required to send a message; never shown to agency users in full (see RLS + app-level masking)
  email text,
  consent_status text not null default 'unknown' check (consent_status in ('unknown', 'granted', 'declined')),
  opt_out boolean not null default false,
  opted_out_at timestamptz,
  source text,
  created_at timestamptz not null default now()
);
create index patients_agency_idx on public.patients (agency_id);
create index patients_client_idx on public.patients (client_id);
create index patients_phone_idx on public.patients (phone) where phone is not null;

comment on column public.patients.phone is
  'Contact channel only. Never expose full value through the public ReviewFlow API or general agency list views — mask to last 4 digits at the query/view layer.';

-- ---------------------------------------------------------------------------
-- Patient Requests — the core ReviewFlow entity. Public access happens
-- exclusively through a hashed token, never the row id (section 10/11).
-- ---------------------------------------------------------------------------
create table public.patient_requests (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references public.agencies (id) on delete cascade,
  client_id uuid not null references public.clients (id) on delete cascade,
  location_id uuid not null references public.locations (id) on delete cascade,
  campaign_id uuid not null references public.campaigns (id) on delete cascade,
  doctor_id uuid references public.doctors (id) on delete set null,
  patient_id uuid not null references public.patients (id) on delete cascade,
  channel text not null check (channel in ('whatsapp', 'sms', 'qr', 'link')),
  trigger text not null,
  -- SHA-256 hex digest of the public token. The raw token is only ever
  -- returned once, at creation time, to whatever sent it (WhatsApp/SMS/QR) —
  -- see src/lib/reviewflow-token.ts. This column is what /r/:token resolves.
  token_hash text not null unique,
  status text not null default 'created' check (status in (
    'created', 'queued', 'sent', 'delivered', 'opened', 'started',
    'rating-selected', 'feedback-submitted', 'ai-assisted', 'final-approved',
    'public-clicked', 'completed', 'expired', 'failed', 'opted-out', 'suppressed'
  )),
  eligibility text not null default 'eligible' check (eligibility in ('eligible', 'suppressed')),
  suppression_reason text check (suppression_reason in (
    'opted-out', 'recent-duplicate', 'duplicate-appointment', 'campaign-inactive',
    'location-inactive', 'destination-disconnected', 'quiet-hours', 'frequency-cap'
  )),
  rating_given int check (rating_given between 1 and 5),
  feedback_id uuid, -- FK added after public.feedback exists, see below
  sentiment text check (sentiment in ('positive', 'neutral', 'negative', 'needs-attention')),
  public_review_clicked boolean not null default false,
  created_at timestamptz not null default now(),
  expires_at timestamptz,
  responded_at timestamptz,
  public_destination_clicked_at timestamptz,
  completed_at timestamptz
);
create index patient_requests_agency_idx on public.patient_requests (agency_id);
create index patient_requests_location_idx on public.patient_requests (location_id);
create index patient_requests_campaign_idx on public.patient_requests (campaign_id);
create index patient_requests_patient_idx on public.patient_requests (patient_id);
create index patient_requests_status_idx on public.patient_requests (status);
-- token_hash already has a unique index from the column constraint — token
-- lookups (the hottest public-facing query) hit that index directly.

comment on column public.patient_requests.token_hash is
  'sha256(raw_token). The public /r/:token route hashes the incoming token and looks up this column — the raw token itself is never persisted.';

create table public.feedback (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references public.agencies (id) on delete cascade,
  patient_request_id uuid not null unique references public.patient_requests (id) on delete cascade,
  original_text text not null,
  ai_text text,
  final_text text,
  used_ai_version boolean not null default false,
  status text not null default 'new' check (status in ('new', 'shared', 'declined-to-share', 'flagged')),
  submitted_at timestamptz not null default now()
);
create index feedback_agency_idx on public.feedback (agency_id);

alter table public.patient_requests
  add constraint patient_requests_feedback_fk
  foreign key (feedback_id) references public.feedback (id) on delete set null;

-- ---------------------------------------------------------------------------
-- Domain event log (sections 13/14/15) — append-only, idempotent, and
-- intentionally free of patient PII in metadata.
-- ---------------------------------------------------------------------------
create table public.domain_events (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references public.agencies (id) on delete cascade,
  location_id uuid references public.locations (id) on delete set null,
  request_id uuid references public.patient_requests (id) on delete set null,
  event_type text not null check (event_type in (
    'review_request_created', 'review_request_sent', 'review_request_delivered',
    'review_request_opened', 'rating_selected', 'feedback_submitted',
    'ai_assist_requested', 'ai_version_selected', 'feedback_edited',
    'final_review_approved', 'public_destination_clicked', 'review_request_completed',
    'review_request_expired', 'review_request_failed', 'patient_opted_out'
  )),
  metadata jsonb not null default '{}'::jsonb,
  -- Callers MUST supply a stable idempotency_key (e.g. "{request_id}:{event_type}"
  -- for one-shot events, or "{request_id}:{event_type}:{provider_message_id}" for
  -- webhook-driven ones) so the same event arriving twice is a no-op — the
  -- unique index below is what makes that a guarantee, not a convention.
  idempotency_key text not null unique,
  created_at timestamptz not null default now()
);
create index domain_events_agency_idx on public.domain_events (agency_id);
create index domain_events_request_idx on public.domain_events (request_id);

comment on table public.domain_events is
  'Append-only. Insert with ON CONFLICT (idempotency_key) DO NOTHING and check rowcount to know whether this was a genuinely new event before triggering side effects (task creation, metric increments, message sends).';
