import "server-only";

// Server-side counterpart to runtime-store's logIntegrationActivity (which
// only works from the browser). Route handlers and sync jobs call this
// instead, writing straight to the real integration_activity_log table via
// the service-role client. Never pass token/secret values in `metadata`.
import type { SupabaseClient } from "@supabase/supabase-js";

export interface ServerActivityLogEntry {
  agencyId: string;
  actorLabel?: string;
  clientId?: string;
  locationId?: string;
  connectionId?: string;
  assetId?: string;
  integration: "google" | "instagram" | "facebook" | "whatsapp" | "google-ads" | "meta-ads" | "website";
  action: string;
  result: "success" | "failure" | "skipped";
  error?: string;
  metadata?: Record<string, unknown>;
}

export async function logIntegrationActivityServer(supabase: SupabaseClient, entry: ServerActivityLogEntry) {
  const { error } = await supabase.from("integration_activity_log").insert({
    agency_id: entry.agencyId,
    actor_label: entry.actorLabel ?? "System",
    client_id: entry.clientId ?? null,
    location_id: entry.locationId ?? null,
    connection_id: entry.connectionId ?? null,
    asset_id: entry.assetId ?? null,
    integration: entry.integration,
    action: entry.action,
    result: entry.result,
    error: entry.error ?? null,
    metadata: entry.metadata ?? {},
  });
  if (error) console.error("[integration-activity-log]", error.message);
}
