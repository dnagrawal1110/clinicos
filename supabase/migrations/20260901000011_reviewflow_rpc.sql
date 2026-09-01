-- ClinicOS — the public ReviewFlow API (section 12), implemented as
-- SECURITY DEFINER Postgres functions exposed by PostgREST as RPC calls.
-- This is deliberately NOT raw table access for the `anon` role: a patient's
-- browser only ever calls these functions with an opaque token, and each
-- function returns/accepts only display-safe fields — never patient_id,
-- campaign_id, location_id, client_id, or any other internal identifier
-- (section 10).
--
-- Why RPC functions instead of Edge Functions for the data operations:
-- Edge Functions are the right place for anything that calls OUT (AI
-- provider, WhatsApp, Google) — see src/lib/ai-service.ts and
-- src/lib/messaging-provider.ts for those seams. Pure state-transition CRUD
-- on one row is simpler, faster, and just as safe as a SECURITY DEFINER SQL
-- function with an explicit grant, so that's what's used here. An Edge
-- Function can (and for AI-assist, should) call these same functions.

create or replace function public.hash_review_token(p_token text)
returns text
language sql immutable as $$
  select encode(extensions.digest(p_token, 'sha256'), 'hex');
$$;

-- ---------------------------------------------------------------------------
-- Request creation — agency-side only (authenticated, not anon). Returns the
-- raw token exactly once; only token_hash is ever persisted (section 10/11).
-- ---------------------------------------------------------------------------
create or replace function public.create_review_request(
  p_client_id uuid,
  p_location_id uuid,
  p_campaign_id uuid,
  p_patient_id uuid,
  p_channel text,
  p_trigger text,
  p_doctor_id uuid default null,
  p_expiry_days int default 7
)
returns table (request_id uuid, raw_token text)
language plpgsql security definer set search_path = public as $$
declare
  v_agency_id uuid := public.auth_agency_id();
  v_token text;
  v_campaign record;
  v_location record;
  v_patient record;
  v_eligible boolean := true;
  v_reason text;
  v_request_id uuid;
begin
  if v_agency_id is null or not public.has_capability('manage-campaigns') then
    raise exception 'not authorized to create review requests';
  end if;

  select * into v_campaign from public.campaigns where id = p_campaign_id and agency_id = v_agency_id;
  select * into v_location from public.locations where id = p_location_id and agency_id = v_agency_id;
  select * into v_patient from public.patients where id = p_patient_id and agency_id = v_agency_id;
  if v_campaign is null or v_location is null or v_patient is null then
    raise exception 'campaign, location, or patient not found in this agency';
  end if;

  -- Server-side eligibility (section 18/19) — mirrors src/lib/eligibility.ts.
  if v_patient.opt_out then
    v_eligible := false; v_reason := 'opted-out';
  elsif v_campaign.status <> 'active' then
    v_eligible := false; v_reason := 'campaign-inactive';
  elsif v_location.status <> 'active' then
    v_eligible := false; v_reason := 'location-inactive';
  elsif exists (
    select 1 from public.patient_requests pr
    where pr.patient_id = p_patient_id and pr.location_id = p_location_id
      and pr.created_at > now() - (v_campaign.frequency_cap_days || ' days')::interval
      and pr.status not in ('failed', 'expired', 'suppressed')
  ) then
    v_eligible := false; v_reason := 'frequency-cap';
  end if;

  v_token := encode(extensions.gen_random_bytes(32), 'hex');

  insert into public.patient_requests (
    agency_id, client_id, location_id, campaign_id, doctor_id, patient_id,
    channel, trigger, token_hash, status, eligibility, suppression_reason,
    expires_at
  ) values (
    v_agency_id, p_client_id, p_location_id, p_campaign_id, p_doctor_id, p_patient_id,
    p_channel, p_trigger, public.hash_review_token(v_token),
    case when v_eligible then 'created' else 'suppressed' end,
    case when v_eligible then 'eligible' else 'suppressed' end,
    v_reason,
    now() + (p_expiry_days || ' days')::interval
  )
  returning id into v_request_id;

  insert into public.domain_events (agency_id, location_id, request_id, event_type, metadata, idempotency_key)
  values (
    v_agency_id, p_location_id, v_request_id,
    case when v_eligible then 'review_request_created' else 'review_request_failed' end,
    jsonb_build_object('channel', p_channel, 'suppression_reason', v_reason),
    v_request_id::text || ':created'
  )
  on conflict (idempotency_key) do nothing;

  return query select v_request_id, v_token;
end;
$$;
revoke all on function public.create_review_request from public;
grant execute on function public.create_review_request to authenticated;

-- ---------------------------------------------------------------------------
-- Internal helper: resolve + validate a token. Not exposed directly.
-- ---------------------------------------------------------------------------
create or replace function public._resolve_review_request(p_token text)
returns public.patient_requests
language plpgsql security definer set search_path = public as $$
declare
  v_request public.patient_requests;
begin
  select * into v_request from public.patient_requests
  where token_hash = public.hash_review_token(p_token);

  if v_request is null then
    raise exception 'invalid_token';
  end if;
  if v_request.eligibility = 'suppressed' then
    raise exception 'invalid_token';
  end if;
  if v_request.expires_at is not null and v_request.expires_at < now() and v_request.status not in ('completed', 'expired') then
    update public.patient_requests set status = 'expired' where id = v_request.id;
    raise exception 'expired_token';
  end if;

  return v_request;
end;
$$;

-- ---------------------------------------------------------------------------
-- GET /review-request/:token — display-safe DTO only.
-- ---------------------------------------------------------------------------
create or replace function public.reviewflow_get_by_token(p_token text)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_request public.patient_requests;
  v_location public.locations;
  v_client public.clients;
  v_doctor public.doctors;
  v_destination public.review_destinations;
begin
  v_request := public._resolve_review_request(p_token);
  select * into v_location from public.locations where id = v_request.location_id;
  select * into v_client from public.clients where id = v_request.client_id;
  select * into v_doctor from public.doctors where id = v_request.doctor_id;
  select * into v_destination from public.review_destinations where id = (
    select destination_id from public.campaigns where id = v_request.campaign_id
  );

  return jsonb_build_object(
    'status', v_request.status,
    'clinicDisplayName', coalesce(v_client.brand, v_client.name),
    'doctorDisplayName', v_doctor.name,
    'locationDisplayName', v_location.name,
    'googleReviewUrl', v_destination.url,
    'ratingGiven', v_request.rating_given,
    'expiresAt', v_request.expires_at
  );
end;
$$;
grant execute on function public.reviewflow_get_by_token to anon, authenticated;

-- ---------------------------------------------------------------------------
-- POST /review-request/:token/rating
-- ---------------------------------------------------------------------------
create or replace function public.reviewflow_submit_rating(p_token text, p_rating int)
returns void
language plpgsql security definer set search_path = public as $$
declare
  v_request public.patient_requests;
begin
  if p_rating not between 1 and 5 then
    raise exception 'invalid_rating';
  end if;
  v_request := public._resolve_review_request(p_token);

  update public.patient_requests
  set status = 'rating-selected', rating_given = p_rating,
      sentiment = case when p_rating >= 4 then 'positive' when p_rating = 3 then 'neutral' else 'needs-attention' end
  where id = v_request.id;

  insert into public.domain_events (agency_id, location_id, request_id, event_type, metadata, idempotency_key)
  values (v_request.agency_id, v_request.location_id, v_request.id, 'rating_selected',
    jsonb_build_object('rating', p_rating), v_request.id::text || ':rating_selected')
  on conflict (idempotency_key) do nothing;
end;
$$;
grant execute on function public.reviewflow_submit_rating to anon, authenticated;

-- ---------------------------------------------------------------------------
-- POST /review-request/:token/feedback — stores the patient's own words.
-- Length/content validation happens here; AI rewriting happens in the app
-- layer (src/lib/review-ai.ts) and is recorded via reviewflow_ai_assist.
-- ---------------------------------------------------------------------------
create or replace function public.reviewflow_submit_feedback(p_token text, p_text text)
returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_request public.patient_requests;
  v_feedback_id uuid;
begin
  if length(trim(p_text)) < 10 then
    raise exception 'feedback_too_short';
  end if;
  v_request := public._resolve_review_request(p_token);

  insert into public.feedback (agency_id, patient_request_id, original_text)
  values (v_request.agency_id, v_request.id, p_text)
  on conflict (patient_request_id) do update set original_text = excluded.original_text
  returning id into v_feedback_id;

  update public.patient_requests set status = 'feedback-submitted', feedback_id = v_feedback_id where id = v_request.id;

  insert into public.domain_events (agency_id, location_id, request_id, event_type, metadata, idempotency_key)
  values (v_request.agency_id, v_request.location_id, v_request.id, 'feedback_submitted', '{}'::jsonb,
    v_request.id::text || ':feedback_submitted')
  on conflict (idempotency_key) do nothing;

  return v_feedback_id;
end;
$$;
grant execute on function public.reviewflow_submit_feedback to anon, authenticated;

-- ---------------------------------------------------------------------------
-- POST /review-request/:token/ai-assist — records the AI-rewritten version
-- generated by the app layer. The AI call itself never happens in SQL.
-- ---------------------------------------------------------------------------
create or replace function public.reviewflow_record_ai_version(p_token text, p_ai_text text)
returns void
language plpgsql security definer set search_path = public as $$
declare
  v_request public.patient_requests;
begin
  v_request := public._resolve_review_request(p_token);
  update public.feedback set ai_text = p_ai_text where patient_request_id = v_request.id;
  update public.patient_requests set status = 'ai-assisted' where id = v_request.id;

  insert into public.domain_events (agency_id, location_id, request_id, event_type, metadata, idempotency_key)
  values (v_request.agency_id, v_request.location_id, v_request.id, 'ai_version_selected', '{}'::jsonb,
    v_request.id::text || ':ai_version_selected')
  on conflict (idempotency_key) do nothing;
end;
$$;
grant execute on function public.reviewflow_record_ai_version to anon, authenticated;

-- ---------------------------------------------------------------------------
-- POST /review-request/:token/approve — final text the patient will share.
-- ---------------------------------------------------------------------------
create or replace function public.reviewflow_approve(p_token text, p_final_text text, p_used_ai boolean)
returns void
language plpgsql security definer set search_path = public as $$
declare
  v_request public.patient_requests;
begin
  v_request := public._resolve_review_request(p_token);
  update public.feedback set final_text = p_final_text, used_ai_version = p_used_ai where patient_request_id = v_request.id;
  update public.patient_requests set status = 'final-approved' where id = v_request.id;

  insert into public.domain_events (agency_id, location_id, request_id, event_type, metadata, idempotency_key)
  values (v_request.agency_id, v_request.location_id, v_request.id, 'final_review_approved',
    jsonb_build_object('used_ai_version', p_used_ai), v_request.id::text || ':final_review_approved')
  on conflict (idempotency_key) do nothing;
end;
$$;
grant execute on function public.reviewflow_approve to anon, authenticated;

-- ---------------------------------------------------------------------------
-- POST /review-request/:token/public-click — the "Share on Google" click.
-- This fires identically regardless of rating (never gate a negative
-- rating away from the same public destination everyone else gets).
-- ---------------------------------------------------------------------------
create or replace function public.reviewflow_public_click(p_token text)
returns void
language plpgsql security definer set search_path = public as $$
declare
  v_request public.patient_requests;
begin
  v_request := public._resolve_review_request(p_token);
  update public.patient_requests
  set status = 'public-clicked', public_review_clicked = true, public_destination_clicked_at = now()
  where id = v_request.id;

  insert into public.domain_events (agency_id, location_id, request_id, event_type, metadata, idempotency_key)
  values (v_request.agency_id, v_request.location_id, v_request.id, 'public_destination_clicked', '{}'::jsonb,
    v_request.id::text || ':public_destination_clicked')
  on conflict (idempotency_key) do nothing;
end;
$$;
grant execute on function public.reviewflow_public_click to anon, authenticated;

-- ---------------------------------------------------------------------------
-- POST /review-request/:token/complete
-- ---------------------------------------------------------------------------
create or replace function public.reviewflow_complete(p_token text)
returns void
language plpgsql security definer set search_path = public as $$
declare
  v_request public.patient_requests;
begin
  v_request := public._resolve_review_request(p_token);
  update public.patient_requests set status = 'completed', completed_at = now() where id = v_request.id;

  -- Idempotent by construction: ON CONFLICT DO NOTHING means a duplicate
  -- "complete" call (e.g. a retried request) never double-counts a review.
  insert into public.domain_events (agency_id, location_id, request_id, event_type, metadata, idempotency_key)
  values (v_request.agency_id, v_request.location_id, v_request.id, 'review_request_completed', '{}'::jsonb,
    v_request.id::text || ':review_request_completed')
  on conflict (idempotency_key) do nothing;
end;
$$;
grant execute on function public.reviewflow_complete to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Patient opt-out (section 17) — reachable even from an expired/invalid
-- token context is intentionally NOT supported here (opt-out requires a
-- valid, resolvable request so we know which patient to mark).
-- ---------------------------------------------------------------------------
create or replace function public.reviewflow_opt_out(p_token text)
returns void
language plpgsql security definer set search_path = public as $$
declare
  v_request public.patient_requests;
begin
  v_request := public._resolve_review_request(p_token);
  update public.patients set opt_out = true, opted_out_at = now() where id = v_request.patient_id;
  update public.patient_requests set status = 'opted-out' where id = v_request.id;

  insert into public.domain_events (agency_id, location_id, request_id, event_type, metadata, idempotency_key)
  values (v_request.agency_id, v_request.location_id, v_request.id, 'patient_opted_out', '{}'::jsonb,
    v_request.id::text || ':patient_opted_out')
  on conflict (idempotency_key) do nothing;
end;
$$;
grant execute on function public.reviewflow_opt_out to anon, authenticated;
