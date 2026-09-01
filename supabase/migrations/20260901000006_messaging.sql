-- ClinicOS — messaging provider abstraction (section 23-25) and inbound
-- webhook log. No provider is wired up yet; this is the shape a real
-- WhatsApp Business Platform / SMS / email provider integration writes into.

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references public.agencies (id) on delete cascade,
  patient_request_id uuid references public.patient_requests (id) on delete set null,
  provider text not null default 'mock', -- 'mock' | 'whatsapp-meta' | 'twilio-sms' | ...
  channel text not null check (channel in ('whatsapp', 'sms', 'email', 'qr', 'link')),
  recipient_masked text not null, -- last-4-digits style, never full phone/email
  template_name text,
  variables jsonb not null default '{}'::jsonb,
  status text not null default 'queued' check (status in ('queued', 'sent', 'delivered', 'read', 'failed')),
  provider_message_id text,
  sent_at timestamptz,
  delivered_at timestamptz,
  read_at timestamptz,
  failed_at timestamptz,
  error_code text,
  created_at timestamptz not null default now()
);
create index messages_agency_idx on public.messages (agency_id);
create index messages_request_idx on public.messages (patient_request_id);
create unique index messages_provider_message_idx on public.messages (provider, provider_message_id)
  where provider_message_id is not null;

create table public.webhook_events (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid references public.agencies (id) on delete cascade,
  provider text not null,
  event_type text not null,
  payload jsonb not null default '{}'::jsonb,
  -- Provider-supplied delivery id (or a hash of the payload if the provider
  -- doesn't give one) — the uniqueness guarantee that makes replay a no-op.
  idempotency_key text not null unique,
  processed_at timestamptz,
  processing_error text,
  created_at timestamptz not null default now()
);
create index webhook_events_provider_idx on public.webhook_events (provider, created_at desc);

comment on table public.webhook_events is
  'Insert raw payload first (ON CONFLICT (idempotency_key) DO NOTHING), then process asynchronously and stamp processed_at. Never process before the insert commits — that ordering is what prevents duplicate side effects on redelivery.';
