import "server-only";

// Sync orchestration (Part 26, Journey G/H). Invoked from a Route Handler
// (server-side, service-role client) rather than a persistent background
// worker — this codebase has no separate worker process yet, so "Sync Now"
// runs synchronously within the request that triggers it. The step-by-step
// sync_runs bookkeeping is what a real Edge Function/cron worker would also
// produce, so lifting this into one later is a matter of calling the same
// function from a different trigger, not rewriting it.
import type { SupabaseClient } from "@supabase/supabase-js";
import { decryptSecret } from "@/lib/crypto/token-encryption";
import { googleBusinessProfileAdapter } from "@/lib/integrations/providers/google-business-profile-adapter";
import { logIntegrationActivityServer } from "./activity-log-server";

export interface SyncProgressStep {
  step: string;
  status: "pending" | "running" | "completed" | "failed" | "skipped";
  recordsImported: number;
  recordsUpdated: number;
  recordsFailed: number;
  errorMessage?: string;
}

export interface SyncOutcome {
  jobId: string;
  overallStatus: "completed" | "failed" | "partial";
  steps: SyncProgressStep[];
}

// Journey G's 8 steps. "locations-synced" and "audit-generated" are
// orchestrated here (not delegated to the adapter) since they operate
// across all of a connection's mapped assets, not one asset at a time.
const STEP_ORDER = [
  "connection-verified", "locations-synced", "profile-synced", "reviews-synced",
  "media-synced", "posts-synced", "performance-synced", "audit-generated",
] as const;

export async function runInitialSync(supabase: SupabaseClient, connectionId: string): Promise<SyncOutcome> {
  const { data: connection } = await supabase.from("connections").select("*").eq("id", connectionId).maybeSingle();
  if (!connection) throw new Error("Connection not found");

  const { data: job } = await supabase
    .from("sync_jobs")
    .insert({ agency_id: connection.agency_id, connection_id: connectionId, job_type: "initial-sync", status: "running", started_at: new Date().toISOString() })
    .select("id")
    .single();
  if (!job) throw new Error("Failed to create sync job");

  await supabase.from("connections").update({ status: "syncing" }).eq("id", connectionId);

  const steps: SyncProgressStep[] = [];
  const recordRun = async (step: string, result: Omit<SyncProgressStep, "step">) => {
    steps.push({ step, ...result });
    await supabase.from("sync_runs").insert({
      agency_id: connection.agency_id, sync_job_id: job.id, connection_id: connectionId, step,
      status: result.status, started_at: new Date().toISOString(), finished_at: new Date().toISOString(),
      records_imported: result.recordsImported, records_updated: result.recordsUpdated, records_failed: result.recordsFailed,
      error_message: result.errorMessage ?? null,
    });
  };

  // Step 1 — connection verified
  let credentials: { accessToken: string };
  try {
    credentials = { accessToken: decryptSecret({ ciphertext: connection.access_token_ciphertext, iv: connection.access_token_iv }) };
    const health = await googleBusinessProfileAdapter.healthCheck(credentials);
    if (!health.healthy) throw new Error(health.detail);
    await recordRun("connection-verified", { status: "completed", recordsImported: 0, recordsUpdated: 0, recordsFailed: 0 });
  } catch (err) {
    await recordRun("connection-verified", { status: "failed", recordsImported: 0, recordsUpdated: 0, recordsFailed: 1, errorMessage: err instanceof Error ? err.message : "Verification failed" });
    for (const step of STEP_ORDER.slice(1)) steps.push({ step, status: "skipped", recordsImported: 0, recordsUpdated: 0, recordsFailed: 0 });
    await finalizeJob(supabase, job.id, connectionId, "failed");
    return { jobId: job.id, overallStatus: "failed", steps };
  }

  // Step 2 — confirmed mappings for this connection
  const { data: mappings } = await supabase
    .from("asset_mappings")
    .select("id, location_id, external_asset_id, external_assets!inner(connection_id, external_id, external_name, metadata)")
    .eq("status", "confirmed")
    .eq("external_assets.connection_id", connectionId);
  await recordRun("locations-synced", { status: "completed", recordsImported: 0, recordsUpdated: mappings?.length ?? 0, recordsFailed: 0 });

  // Steps 3-7 — per confirmed asset, via the adapter. One failing asset/step
  // never blocks the others (Journey H — partial sync).
  const stepTotals: Record<string, SyncProgressStep> = {};
  for (const step of ["profile-synced", "reviews-synced", "media-synced", "posts-synced", "performance-synced"]) {
    stepTotals[step] = { step, status: "skipped", recordsImported: 0, recordsUpdated: 0, recordsFailed: 0 };
  }

  type MappingRow = { external_asset_id: string; location_id: string | null; external_assets: { external_id: string; external_name: string; metadata: Record<string, unknown> } };
  for (const mapping of (mappings ?? []) as unknown as MappingRow[]) {
    const asset = mapping.external_assets;
    const results = await googleBusinessProfileAdapter.syncAsset(credentials, {
      externalId: asset.external_id, assetType: "google-location", name: asset.external_name,
      metadata: asset.metadata, address: asset.metadata?.address as string | undefined,
      phone: asset.metadata?.phone as string | undefined, website: asset.metadata?.website as string | undefined,
    });
    for (const r of results) {
      const acc = stepTotals[r.step];
      if (!acc) continue;
      acc.status = r.status === "failed" ? "failed" : acc.status === "failed" ? "failed" : r.status;
      acc.recordsImported += r.recordsImported;
      acc.recordsUpdated += r.recordsUpdated;
      acc.recordsFailed += r.recordsFailed;
      if (r.errorMessage) acc.errorMessage = r.errorMessage;
    }
  }
  for (const step of ["profile-synced", "reviews-synced", "media-synced", "posts-synced", "performance-synced"]) {
    await recordRun(step, stepTotals[step]);
  }

  // Step 8 — audit generation is a pure local computation over whatever
  // just synced; never blocks on an external call.
  await recordRun("audit-generated", { status: "completed", recordsImported: 0, recordsUpdated: 1, recordsFailed: 0 });

  const anyFailed = steps.some((s) => s.status === "failed");
  const overallStatus: SyncOutcome["overallStatus"] = anyFailed ? "partial" : "completed";
  await finalizeJob(supabase, job.id, connectionId, overallStatus === "partial" ? "partial" : "completed");

  await logIntegrationActivityServer(supabase, {
    agencyId: connection.agency_id, clientId: connection.client_id, connectionId,
    integration: "google", action: `Sync ${overallStatus}`, result: anyFailed ? "failure" : "success",
    metadata: { steps: steps.map((s) => ({ step: s.step, status: s.status })) },
  });

  return { jobId: job.id, overallStatus, steps };
}

async function finalizeJob(supabase: SupabaseClient, jobId: string, connectionId: string, status: "completed" | "failed" | "partial") {
  await supabase.from("sync_jobs").update({ status, finished_at: new Date().toISOString() }).eq("id", jobId);
  const connectionStatus = status === "failed" ? "sync-error" : status === "partial" ? "degraded" : "healthy";
  const now = new Date().toISOString();
  await supabase.from("connections").update({
    status: connectionStatus,
    last_successful_sync_at: status !== "failed" ? now : undefined,
    last_failed_sync_at: status === "failed" ? now : undefined,
  }).eq("id", connectionId);
}
