-- ClinicOS — Row Level Security. This is the enforcement layer for section 4
-- (multi-tenancy) and section 5 (roles). Nothing here is optional: every
-- tenant-owned table gets RLS enabled, and the only way in is through the
-- helper functions below.
--
-- Design:
--  * auth_agency_id()/auth_role()/auth_team_member_id() read the caller's
--    own app_users row. SECURITY DEFINER so a user can look up their OWN
--    identity without needing a broader SELECT grant on app_users.
--  * has_capability(text) mirrors src/lib/permissions.ts's ROLE_CAPABILITIES
--    map — keep the two in sync by hand; there is no code generation here.
--  * can_access_location(uuid) adds the Account-Manager assignment check
--    (section 6/21) on top of agency isolation.
--  * The public ReviewFlow surface does NOT get anon RLS policies on these
--    tables at all — it goes through SECURITY DEFINER RPC functions in
--    20260901000011_reviewflow_rpc.sql instead, so a patient's session can
--    never run an arbitrary query against patient_requests.

create or replace function public.auth_agency_id()
returns uuid
language sql stable security definer set search_path = public as $$
  select agency_id from public.app_users where id = auth.uid();
$$;

create or replace function public.auth_role()
returns text
language sql stable security definer set search_path = public as $$
  select role from public.app_users where id = auth.uid();
$$;

create or replace function public.auth_team_member_id()
returns uuid
language sql stable security definer set search_path = public as $$
  select team_member_id from public.app_users where id = auth.uid();
$$;

create or replace function public.has_capability(capability text)
returns boolean
language sql stable security definer set search_path = public as $$
  select case public.auth_role()
    when 'Admin' then true
    when 'Account Manager' then capability in (
      'view-all-clients', 'manage-campaigns', 'manage-automation', 'approve-review-responses',
      'publish-review-responses', 'manage-destinations', 'manage-message-library', 'export-data'
    )
    when 'Reputation Manager' then capability in (
      'manage-campaigns', 'manage-automation', 'approve-review-responses',
      'publish-review-responses', 'manage-destinations', 'manage-message-library', 'export-data'
    )
    when 'Content Manager' then capability in ('manage-message-library', 'export-data')
    else false
  end;
$$;

-- Agency-wide roles (Admin/Reputation Manager/Content Manager) see every
-- location in their agency; Account Manager only sees explicitly assigned
-- ones; Read Only sees none through this path (reports are a separate,
-- narrower policy — see below).
create or replace function public.can_access_location(loc_id uuid)
returns boolean
language sql stable security definer set search_path = public as $$
  select case public.auth_role()
    when 'Admin' then true
    when 'Reputation Manager' then true
    when 'Content Manager' then true
    when 'Account Manager' then exists (
      select 1 from public.team_member_locations tml
      where tml.team_member_id = public.auth_team_member_id() and tml.location_id = loc_id
    )
    else false
  end;
$$;

create or replace function public.can_access_client(target_client_id uuid)
returns boolean
language sql stable security definer set search_path = public as $$
  select case public.auth_role()
    when 'Admin' then true
    when 'Reputation Manager' then true
    when 'Content Manager' then true
    when 'Account Manager' then exists (
      select 1 from public.team_member_locations tml
      join public.locations l on l.id = tml.location_id
      where tml.team_member_id = public.auth_team_member_id() and l.client_id = target_client_id
    )
    else false
  end;
$$;

-- ---------------------------------------------------------------------------
-- Enable RLS everywhere.
-- ---------------------------------------------------------------------------
alter table public.agencies enable row level security;
alter table public.app_users enable row level security;
alter table public.team_members enable row level security;
alter table public.clients enable row level security;
alter table public.doctors enable row level security;
alter table public.locations enable row level security;
alter table public.doctor_locations enable row level security;
alter table public.team_member_locations enable row level security;
alter table public.review_destinations enable row level security;
alter table public.review_programs enable row level security;
alter table public.campaign_templates enable row level security;
alter table public.campaigns enable row level security;
alter table public.automations enable row level security;
alter table public.automation_steps enable row level security;
alter table public.patients enable row level security;
alter table public.patient_requests enable row level security;
alter table public.feedback enable row level security;
alter table public.domain_events enable row level security;
alter table public.google_reviews enable row level security;
alter table public.review_responses enable row level security;
alter table public.tasks enable row level security;
alter table public.alerts enable row level security;
alter table public.audit_log enable row level security;
alter table public.notifications enable row level security;
alter table public.notification_preferences enable row level security;
alter table public.messages enable row level security;
alter table public.webhook_events enable row level security;
alter table public.google_oauth_connections enable row level security;
alter table public.google_accounts enable row level security;
alter table public.google_locations enable row level security;
alter table public.google_sync_status enable row level security;
alter table public.website_audits enable row level security;
alter table public.audit_blockers enable row level security;
alter table public.growth_opportunities enable row level security;
alter table public.social_accounts enable row level security;
alter table public.content_items enable row level security;
alter table public.ad_accounts enable row level security;
alter table public.ad_campaigns enable row level security;
alter table public.leads enable row level security;
alter table public.location_daily_metrics enable row level security;
alter table public.reports enable row level security;

-- google_oauth_connections, google_accounts, google_locations: deliberately
-- NO policies below for anon/authenticated. RLS-enabled + zero policies =
-- default deny for every role except service_role (which bypasses RLS
-- entirely by Supabase design). Only a trusted server context/Edge Function
-- using the service-role key may read or write these.

-- ---------------------------------------------------------------------------
-- Identity tables
-- ---------------------------------------------------------------------------
create policy agencies_self_select on public.agencies for select
  using (id = public.auth_agency_id());

create policy app_users_self_select on public.app_users for select
  using (agency_id = public.auth_agency_id());

create policy team_members_agency_select on public.team_members for select
  using (agency_id = public.auth_agency_id());
create policy team_members_admin_write on public.team_members for all
  using (agency_id = public.auth_agency_id() and public.auth_role() = 'Admin')
  with check (agency_id = public.auth_agency_id() and public.auth_role() = 'Admin');

create policy team_member_locations_agency_select on public.team_member_locations for select
  using (exists (
    select 1 from public.team_members tm
    where tm.id = team_member_locations.team_member_id and tm.agency_id = public.auth_agency_id()
  ));
create policy team_member_locations_admin_write on public.team_member_locations for all
  using (public.auth_role() = 'Admin' and exists (
    select 1 from public.team_members tm where tm.id = team_member_locations.team_member_id and tm.agency_id = public.auth_agency_id()
  ))
  with check (public.auth_role() = 'Admin' and exists (
    select 1 from public.team_members tm where tm.id = team_member_locations.team_member_id and tm.agency_id = public.auth_agency_id()
  ));

-- ---------------------------------------------------------------------------
-- Clients / Doctors / Locations — agency isolation + Account Manager scoping
-- ---------------------------------------------------------------------------
create policy clients_select on public.clients for select
  using (agency_id = public.auth_agency_id() and public.can_access_client(id));
create policy clients_write on public.clients for insert with check (agency_id = public.auth_agency_id() and public.auth_role() = 'Admin');
create policy clients_update on public.clients for update
  using (agency_id = public.auth_agency_id() and public.auth_role() = 'Admin')
  with check (agency_id = public.auth_agency_id());

create policy doctors_select on public.doctors for select
  using (agency_id = public.auth_agency_id() and public.can_access_client(client_id));
create policy doctors_write on public.doctors for all
  using (agency_id = public.auth_agency_id() and public.auth_role() = 'Admin')
  with check (agency_id = public.auth_agency_id());

create policy locations_select on public.locations for select
  using (agency_id = public.auth_agency_id() and public.can_access_location(id));
create policy locations_write on public.locations for all
  using (agency_id = public.auth_agency_id() and public.auth_role() = 'Admin')
  with check (agency_id = public.auth_agency_id());

create policy doctor_locations_select on public.doctor_locations for select
  using (exists (select 1 from public.locations l where l.id = doctor_locations.location_id and public.can_access_location(l.id)));

-- ---------------------------------------------------------------------------
-- ReviewFlow domain — agency-side (authenticated) access only. Patients
-- reach this data exclusively through the SECURITY DEFINER RPCs.
-- ---------------------------------------------------------------------------
create policy review_destinations_select on public.review_destinations for select
  using (agency_id = public.auth_agency_id() and public.can_access_location(location_id));
create policy review_destinations_write on public.review_destinations for all
  using (agency_id = public.auth_agency_id() and public.has_capability('manage-destinations'))
  with check (agency_id = public.auth_agency_id());

create policy review_programs_select on public.review_programs for select
  using (agency_id = public.auth_agency_id() and public.can_access_location(location_id));
create policy review_programs_write on public.review_programs for all
  using (agency_id = public.auth_agency_id() and public.has_capability('manage-campaigns'))
  with check (agency_id = public.auth_agency_id());

create policy campaign_templates_select on public.campaign_templates for select
  using (agency_id = public.auth_agency_id());
create policy campaign_templates_write on public.campaign_templates for all
  using (agency_id = public.auth_agency_id() and public.has_capability('manage-message-library'))
  with check (agency_id = public.auth_agency_id());

create policy campaigns_select on public.campaigns for select
  using (agency_id = public.auth_agency_id() and public.can_access_location(location_id));
create policy campaigns_write on public.campaigns for all
  using (agency_id = public.auth_agency_id() and public.has_capability('manage-campaigns') and public.can_access_location(location_id))
  with check (agency_id = public.auth_agency_id());

create policy automations_select on public.automations for select
  using (agency_id = public.auth_agency_id());
create policy automations_write on public.automations for all
  using (agency_id = public.auth_agency_id() and public.has_capability('manage-automation'))
  with check (agency_id = public.auth_agency_id());

create policy automation_steps_select on public.automation_steps for select
  using (exists (select 1 from public.automations a where a.id = automation_steps.automation_id and a.agency_id = public.auth_agency_id()));
create policy automation_steps_write on public.automation_steps for all
  using (exists (select 1 from public.automations a where a.id = automation_steps.automation_id and a.agency_id = public.auth_agency_id() and public.has_capability('manage-automation')));

create policy patients_select on public.patients for select
  using (agency_id = public.auth_agency_id() and public.can_access_client(client_id));
-- No direct authenticated INSERT/UPDATE policy on patients: rows are created
-- by trusted server code (service role) when a campaign target list is
-- loaded, or by the ReviewFlow RPCs for opt-out. Agency users never need to
-- hand-edit a patient row.

create policy patient_requests_select on public.patient_requests for select
  using (agency_id = public.auth_agency_id() and public.can_access_location(location_id));
-- Same rationale as patients: writes happen via RPCs/service role, not
-- direct authenticated table access, to keep the token/eligibility
-- invariants in one place instead of duplicated in RLS + application code.

create policy feedback_select on public.feedback for select
  using (agency_id = public.auth_agency_id());

create policy domain_events_select on public.domain_events for select
  using (agency_id = public.auth_agency_id());

-- ---------------------------------------------------------------------------
-- Google Reviews & responses
-- ---------------------------------------------------------------------------
create policy google_reviews_select on public.google_reviews for select
  using (agency_id = public.auth_agency_id() and public.can_access_location(location_id));
create policy google_reviews_update on public.google_reviews for update
  using (agency_id = public.auth_agency_id() and public.has_capability('approve-review-responses'))
  with check (agency_id = public.auth_agency_id());

create policy review_responses_select on public.review_responses for select
  using (agency_id = public.auth_agency_id());
create policy review_responses_write on public.review_responses for insert
  with check (agency_id = public.auth_agency_id() and public.has_capability('approve-review-responses'));
create policy review_responses_update on public.review_responses for update
  using (agency_id = public.auth_agency_id() and (
    (status = 'published' and public.has_capability('publish-review-responses'))
    or public.has_capability('approve-review-responses')
  ));

-- ---------------------------------------------------------------------------
-- Ops: tasks, alerts, audit log, notifications
-- ---------------------------------------------------------------------------
create policy tasks_select on public.tasks for select
  using (agency_id = public.auth_agency_id() and (location_id is null or public.can_access_location(location_id)));
create policy tasks_write on public.tasks for all
  using (agency_id = public.auth_agency_id() and public.auth_role() <> 'Read Only')
  with check (agency_id = public.auth_agency_id());

create policy alerts_select on public.alerts for select
  using (agency_id = public.auth_agency_id() and (location_id is null or public.can_access_location(location_id)));

create policy audit_log_select on public.audit_log for select
  using (agency_id = public.auth_agency_id() and public.auth_role() = 'Admin');
create policy audit_log_insert on public.audit_log for insert
  with check (agency_id = public.auth_agency_id());

create policy notifications_own on public.notifications for select
  using (user_id = auth.uid());
create policy notifications_own_update on public.notifications for update
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy notification_preferences_own on public.notification_preferences for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Messaging / webhooks — agency read-only from the app; writes are
-- service-role only (a message send or webhook delivery is never initiated
-- by an authenticated dashboard session directly).
-- ---------------------------------------------------------------------------
create policy messages_select on public.messages for select
  using (agency_id = public.auth_agency_id());

create policy webhook_events_select on public.webhook_events for select
  using (agency_id = public.auth_agency_id() and public.auth_role() = 'Admin');

-- ---------------------------------------------------------------------------
-- SEO / content / ads / leads
-- ---------------------------------------------------------------------------
create policy website_audits_select on public.website_audits for select
  using (agency_id = public.auth_agency_id() and public.can_access_client(client_id));

create policy audit_blockers_select on public.audit_blockers for select
  using (agency_id = public.auth_agency_id() and public.can_access_location(location_id));
create policy audit_blockers_update on public.audit_blockers for update
  using (agency_id = public.auth_agency_id() and public.can_access_location(location_id));

create policy growth_opportunities_select on public.growth_opportunities for select
  using (agency_id = public.auth_agency_id() and public.auth_role() in ('Admin', 'Account Manager', 'Reputation Manager')
    and public.can_access_client(client_id));

create policy social_accounts_select on public.social_accounts for select
  using (agency_id = public.auth_agency_id() and public.can_access_client(client_id));
create policy social_accounts_write on public.social_accounts for all
  using (agency_id = public.auth_agency_id() and public.auth_role() in ('Admin', 'Content Manager'))
  with check (agency_id = public.auth_agency_id());

create policy content_items_select on public.content_items for select
  using (agency_id = public.auth_agency_id() and public.can_access_location(location_id));
create policy content_items_write on public.content_items for all
  using (agency_id = public.auth_agency_id() and public.auth_role() in ('Admin', 'Content Manager'))
  with check (agency_id = public.auth_agency_id());

create policy ad_accounts_select on public.ad_accounts for select
  using (agency_id = public.auth_agency_id() and public.can_access_client(client_id));

create policy ad_campaigns_select on public.ad_campaigns for select
  using (agency_id = public.auth_agency_id() and public.can_access_location(location_id));

create policy leads_select on public.leads for select
  using (agency_id = public.auth_agency_id() and public.can_access_location(location_id));

-- ---------------------------------------------------------------------------
-- Metrics & reporting
-- ---------------------------------------------------------------------------
create policy location_daily_metrics_select on public.location_daily_metrics for select
  using (exists (
    select 1 from public.locations l
    where l.id = location_daily_metrics.location_id
      and l.agency_id = public.auth_agency_id()
      and public.can_access_location(l.id)
  ));

-- Reports are the one surface Read Only is explicitly granted (section 5).
create policy reports_select on public.reports for select
  using (agency_id = public.auth_agency_id() and public.can_access_client(client_id));
create policy reports_write on public.reports for all
  using (agency_id = public.auth_agency_id() and public.auth_role() in ('Admin', 'Account Manager'))
  with check (agency_id = public.auth_agency_id());
