// Seeds the Supabase project with the existing deterministic mock dataset
// (section 7). Run with:
//   npx tsx --env-file=.env.local scripts/seed-supabase.ts
//
// Idempotency: this script assumes an EMPTY public schema (fresh migrations,
// no prior seed). It does not attempt to upsert/dedupe against a previously
// seeded run — re-running against an already-seeded project will duplicate
// rows or hit unique-constraint errors (slug/token_hash/external_review_id).
// Wipe the public schema (or spin up a fresh project) before re-seeding.
import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";

import { ALL_CLIENTS, allLocations, allDoctors } from "../src/lib/mock/clients";
import { TEAM_MEMBERS } from "../src/lib/mock/pools";
import { REVIEW_CAMPAIGNS, TASKS, ALERTS } from "../src/lib/mock/operations";
import { REVIEW_PROGRAMS, REVIEW_DESTINATIONS, getPrimaryDestination } from "../src/lib/mock/review-programs";
import { REVIEW_REQUESTS } from "../src/lib/mock/reviewflow-requests";
import { GOOGLE_REVIEWS, generateAIResponseDraft } from "../src/lib/mock/google-reviews";
import { AUTOMATION_RULES } from "../src/lib/mock/automation";
import { REPUTATION_ALERTS } from "../src/lib/mock/reputation-alerts";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. Check .env.local.");
  process.exit(1);
}
const supabase = createClient(url, serviceKey);

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

async function insertBatched<T extends Record<string, unknown>>(table: string, rows: T[], batchSize = 500) {
  let inserted = 0;
  for (const batch of chunk(rows, batchSize)) {
    const { error } = await supabase.from(table).insert(batch);
    if (error) throw new Error(`Insert into ${table} failed: ${error.message}`);
    inserted += batch.length;
    process.stdout.write(`\r  ${table}: ${inserted}/${rows.length}`);
  }
  console.log();
}

// Same batching, but returns the inserted rows (order-preserving per Postgres
// RETURNING-after-single-VALUES-insert semantics) so callers can build an
// old-id -> new-uuid map incrementally.
async function insertBatchedReturning<T extends Record<string, unknown>>(table: string, rows: T[], select: string, batchSize = 500) {
  const results: Record<string, unknown>[] = [];
  for (const batch of chunk(rows, batchSize)) {
    const { data, error } = await supabase.from(table).insert(batch).select(select);
    if (error) throw new Error(`Insert into ${table} failed: ${error.message}`);
    results.push(...(data ?? []));
    process.stdout.write(`\r  ${table}: ${results.length}/${rows.length}`);
  }
  console.log();
  return results;
}

async function main() {
  console.log("Seeding ClinicOS demo data into Supabase...\n");

  // 1. Agency ------------------------------------------------------------
  const { data: agency, error: agencyErr } = await supabase
    .from("agencies")
    .insert({ name: "MixMedia", tagline: "Growth Agency" })
    .select("id")
    .single();
  if (agencyErr || !agency) throw new Error(`Agency insert failed: ${agencyErr?.message}`);
  const agencyId = agency.id as string;
  console.log(`agency: ${agencyId}`);

  // 2. Team members --------------------------------------------------------
  const teamMemberIdByName = new Map<string, string>();
  {
    const rows = TEAM_MEMBERS.map((t) => ({ agency_id: agencyId, name: t.name, role: t.role, team: t.team }));
    const inserted = await insertBatchedReturning("team_members", rows, "id, name");
    inserted.forEach((r) => teamMemberIdByName.set(r.name as string, r.id as string));
  }

  // 3. Clients --------------------------------------------------------------
  const clientIdMap = new Map<string, string>();
  {
    const rows = ALL_CLIENTS.map((c) => ({
      agency_id: agencyId,
      name: c.name,
      brand: c.brand ?? null,
      specialty: c.specialty,
      city: c.city,
      status: c.status,
      account_manager_id: teamMemberIdByName.get(c.accountManager) ?? null,
      active_services: c.activeServices,
      scores: c.scores,
      health_overall: c.healthOverall,
      health_trend: c.healthTrend,
      created_at: new Date(c.createdAt).toISOString(),
    }));
    const inserted = await insertBatchedReturning("clients", rows, "id");
    ALL_CLIENTS.forEach((c, i) => clientIdMap.set(c.id, inserted[i].id as string));
  }

  // 4. Doctors ----------------------------------------------------------------
  const doctorIdMap = new Map<string, string>();
  const allDocs = allDoctors();
  {
    const rows = allDocs.map((d) => ({
      agency_id: agencyId,
      client_id: clientIdMap.get(d.clientId),
      name: d.name,
      specialty: d.specialty,
    }));
    const inserted = await insertBatchedReturning("doctors", rows, "id");
    allDocs.forEach((d, i) => doctorIdMap.set(d.id, inserted[i].id as string));
  }

  // 5. Locations ----------------------------------------------------------------
  const locationIdMap = new Map<string, string>();
  const allLocs = allLocations();
  {
    const rows = allLocs.map((l) => ({
      agency_id: agencyId,
      client_id: clientIdMap.get(l.clientId),
      slug: l.slug,
      name: l.name,
      city: l.city,
      address: l.address,
      phone: l.phone,
      hours: l.hours,
      status: l.status,
      google_connected: l.googleConnected,
      rating: l.rating,
      review_count: l.reviewCount,
      reviews_this_month: l.reviewsThisMonth,
      review_delta_30d: l.reviewDelta30d,
      scores: l.scores,
      health_overall: l.healthOverall,
      services: l.services,
      photos: l.photos,
      posts_active: l.postsActive,
      leads_this_month: l.leadsThisMonth,
      ad_spend_this_month: l.adSpendThisMonth,
      has_ads: l.hasAds,
      last_activity: l.lastActivity,
    }));
    const inserted = await insertBatchedReturning("locations", rows, "id");
    allLocs.forEach((l, i) => locationIdMap.set(l.id, inserted[i].id as string));
  }

  // 6. doctor_locations join -------------------------------------------------
  {
    const rows: { doctor_id: string; location_id: string }[] = [];
    for (const d of allDocs) {
      for (const locId of d.locationIds) {
        const doctorId = doctorIdMap.get(d.id);
        const locationId = locationIdMap.get(locId);
        if (doctorId && locationId) rows.push({ doctor_id: doctorId, location_id: locationId });
      }
    }
    await insertBatched("doctor_locations", rows);
  }

  // 7. team_member_locations (account manager assignment, section 6) --------
  {
    const rows: { team_member_id: string; location_id: string }[] = [];
    for (const c of ALL_CLIENTS) {
      const tmId = teamMemberIdByName.get(c.accountManager);
      if (!tmId) continue;
      for (const loc of c.locations) {
        const locationId = locationIdMap.get(loc.id);
        if (locationId) rows.push({ team_member_id: tmId, location_id: locationId });
      }
    }
    await insertBatched("team_member_locations", rows);
  }

  // 8. Review destinations ----------------------------------------------------
  const destinationIdMap = new Map<string, string>();
  {
    const rows = REVIEW_DESTINATIONS.map((d) => ({
      agency_id: agencyId,
      client_id: clientIdMap.get(d.clientId),
      location_id: locationIdMap.get(d.locationId),
      type: d.type,
      name: d.name,
      url: d.url,
      status: d.status,
      priority: d.priority,
      enabled: d.enabled,
    }));
    const inserted = await insertBatchedReturning("review_destinations", rows, "id");
    REVIEW_DESTINATIONS.forEach((d, i) => destinationIdMap.set(d.id, inserted[i].id as string));
  }

  // 9. Review programs (one per location) --------------------------------------
  const programIdByLocationId = new Map<string, string>(); // mock locationId -> new program uuid
  {
    const rows = REVIEW_PROGRAMS.map((p) => ({
      agency_id: agencyId,
      client_id: clientIdMap.get(p.clientId),
      location_id: locationIdMap.get(p.locationId),
      name: p.name,
      status: p.status,
      destination_id: p.destinationId ? destinationIdMap.get(p.destinationId) ?? null : null,
      automation_enabled: p.automationEnabled,
    }));
    const inserted = await insertBatchedReturning("review_programs", rows, "id");
    REVIEW_PROGRAMS.forEach((p, i) => programIdByLocationId.set(p.locationId, inserted[i].id as string));
  }

  // 10. Campaigns ---------------------------------------------------------------
  const campaignIdMap = new Map<string, string>();
  {
    const rows = REVIEW_CAMPAIGNS.map((c) => {
      const primaryDest = getPrimaryDestination(c.locationId);
      return {
        agency_id: agencyId,
        client_id: clientIdMap.get(c.clientId),
        location_id: locationIdMap.get(c.locationId),
        review_program_id: programIdByLocationId.get(c.locationId),
        doctor_id: c.doctorId ? doctorIdMap.get(c.doctorId) ?? null : null,
        name: c.name,
        status: c.status,
        trigger: c.trigger,
        audience: c.audience,
        language: c.language,
        channel: c.channel,
        destination_id: primaryDest ? destinationIdMap.get(primaryDest.id) ?? null : null,
        max_requests_per_patient: c.maxRequestsPerPatient,
        frequency_cap_days: c.frequencyDays,
        eligible_patients: c.eligiblePatients,
        requests_sent: c.requestsSent,
        opened: c.opened,
        feedback_received: c.feedbackReceived,
        google_clicks: c.googleClicks,
        reviews_generated: c.reviewsGenerated,
      };
    });
    const inserted = await insertBatchedReturning("campaigns", rows, "id");
    REVIEW_CAMPAIGNS.forEach((c, i) => campaignIdMap.set(c.id, inserted[i].id as string));
  }

  // 11. Automations + steps (agency-wide templates) ----------------------------
  {
    for (const rule of AUTOMATION_RULES) {
      const { data: auto, error } = await supabase
        .from("automations")
        .insert({
          agency_id: agencyId,
          location_id: null,
          name: rule.name,
          trigger_condition: rule.trigger,
          action: rule.action,
          enabled: rule.enabled,
          wait_hours: rule.waitHours ?? 2,
          channel: rule.channel ?? "whatsapp",
          reminder_after_hours: rule.reminderAfterHours ?? 24,
          max_attempts: rule.maxAttempts ?? 2,
          frequency_cap_days: rule.frequencyCapDays ?? 30,
          quiet_hours_start: rule.quietHoursStart ?? "21:00",
          quiet_hours_end: rule.quietHoursEnd ?? "08:00",
          timezone: rule.timezone ?? "Asia/Kolkata",
          conditions: rule.conditions ?? [],
        })
        .select("id")
        .single();
      if (error || !auto) throw new Error(`automations insert failed: ${error?.message}`);
      const steps = rule.steps.map((s, i) => ({ automation_id: auto.id, position: i, label: s.label, detail: s.detail }));
      if (steps.length) await insertBatched("automation_steps", steps);
    }
    console.log(`automations: ${AUTOMATION_RULES.length}`);
  }

  // 12. Patients + Patient Requests + Feedback (the big one) ------------------
  {
    const patientRows = REVIEW_REQUESTS.map((r) => ({
      agency_id: agencyId,
      client_id: clientIdMap.get(r.clientId),
      masked_display_name: r.patientMasked,
      source: r.channel,
    }));
    const patients = await insertBatchedReturning("patients", patientRows, "id");

    const requestRows = REVIEW_REQUESTS.map((r, i) => ({
      agency_id: agencyId,
      client_id: clientIdMap.get(r.clientId),
      location_id: locationIdMap.get(r.locationId),
      campaign_id: campaignIdMap.get(r.campaignId),
      doctor_id: r.doctorId ? doctorIdMap.get(r.doctorId) ?? null : null,
      patient_id: patients[i].id,
      channel: r.channel,
      trigger: r.trigger,
      // Historical/seeded rows only — nobody resolves these tokens for real,
      // so a random placeholder satisfies the unique/not-null constraint
      // without needing the real hashing scheme used for live-created ones.
      token_hash: `seed_${randomUUID()}`,
      status: r.status,
      eligibility: r.eligibility,
      suppression_reason: r.suppressionReason ?? null,
      rating_given: r.ratingGiven ?? null,
      sentiment: r.sentiment ?? null,
      public_review_clicked: r.publicReviewClicked,
      created_at: r.createdAt,
      expires_at: r.expiresAt ?? null,
      responded_at: r.respondedAt ?? null,
      public_destination_clicked_at: r.status === "public-clicked" || r.status === "completed" ? r.respondedAt ?? null : null,
      completed_at: r.status === "completed" ? r.respondedAt ?? null : null,
    }));
    const requests = await insertBatchedReturning("patient_requests", requestRows, "id");

    const feedbackRows: Record<string, unknown>[] = [];
    REVIEW_REQUESTS.forEach((r, i) => {
      if (!r.feedbackText) return;
      feedbackRows.push({
        agency_id: agencyId,
        patient_request_id: requests[i].id,
        original_text: r.feedbackText,
        final_text: r.feedbackText,
        submitted_at: r.respondedAt ?? r.createdAt,
      });
    });
    const feedback = await insertBatchedReturning("feedback", feedbackRows, "id, patient_request_id");

    // Back-fill patient_requests.feedback_id now that feedback rows exist.
    const feedbackByRequestId = new Map(feedback.map((f) => [f.patient_request_id as string, f.id as string]));
    const updates = requests
      .map((r, i) => ({ requestId: r.id as string, mockRequest: REVIEW_REQUESTS[i] }))
      .filter((x) => x.mockRequest.feedbackText);
    for (const group of chunk(updates, 200)) {
      await Promise.all(
        group.map(({ requestId }) =>
          supabase.from("patient_requests").update({ feedback_id: feedbackByRequestId.get(requestId) }).eq("id", requestId)
        )
      );
    }
    console.log(`patient_requests: ${requests.length} (${feedback.length} with feedback)`);
  }

  // 13. Google reviews + response drafts ---------------------------------------
  {
    const RESPONSE_STATUS_MAP: Record<string, string> = {
      pending: "needs-response",
      drafted: "ai-draft-ready",
      responded: "published",
    };
    const rows = GOOGLE_REVIEWS.map((r) => ({
      agency_id: agencyId,
      client_id: clientIdMap.get(r.clientId),
      location_id: locationIdMap.get(r.locationId),
      external_review_id: r.id, // mock id is already unique; stands in for Google's real resource id
      reviewer_display_name: r.reviewer,
      rating: r.rating,
      review_text: r.text,
      sentiment: r.sentiment,
      published_at: r.date,
      response_status: RESPONSE_STATUS_MAP[r.responseStatus] ?? "needs-response",
    }));
    const inserted = await insertBatchedReturning("google_reviews", rows, "id");

    const responseRows: Record<string, unknown>[] = [];
    GOOGLE_REVIEWS.forEach((r, i) => {
      if (r.responseStatus === "pending") return;
      const draftText = r.aiResponseDraft ?? generateAIResponseDraft(r);
      responseRows.push({
        agency_id: agencyId,
        google_review_id: inserted[i].id,
        draft_text: draftText,
        status: r.responseStatus === "responded" ? "published" : "drafted",
        published_at: r.responseStatus === "responded" ? r.date : null,
      });
    });
    await insertBatched("review_responses", responseRows);
    console.log(`google_reviews: ${inserted.length}`);
  }

  // 14. Tasks -------------------------------------------------------------------
  {
    const rows = TASKS.filter((t) => clientIdMap.has(t.clientId)).map((t) => ({
      agency_id: agencyId,
      client_id: clientIdMap.get(t.clientId),
      location_id: t.locationId ? locationIdMap.get(t.locationId) ?? null : null,
      doctor_id: t.doctorId ? doctorIdMap.get(t.doctorId) ?? null : null,
      module: t.module,
      title: t.title,
      priority: t.priority,
      owner_team_member_id: teamMemberIdByName.get(t.owner) ?? null,
      due_date: t.dueDate.slice(0, 10),
      status: t.status,
      ai_recommended: t.aiRecommended,
      source: t.source,
    }));
    await insertBatched("tasks", rows);
  }

  // 15. Alerts --------------------------------------------------------------------
  {
    const all = [...ALERTS, ...REPUTATION_ALERTS];
    const rows = all
      .filter((a) => !a.clientId || clientIdMap.has(a.clientId))
      .map((a) => ({
        agency_id: agencyId,
        client_id: a.clientId ? clientIdMap.get(a.clientId) ?? null : null,
        location_id: a.locationId ? locationIdMap.get(a.locationId) ?? null : null,
        module: a.module ?? null,
        tone: a.tone,
        title: a.title,
        detail: a.detail,
        created_at: a.createdAt,
      }));
    await insertBatched("alerts", rows);
  }

  console.log("\nSeed complete.");
}

main().catch((err) => {
  console.error("\nSeed failed:", err);
  process.exit(1);
});
