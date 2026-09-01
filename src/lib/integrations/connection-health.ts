"use client";

// Derives a per-location, per-integration ConnectionStatus. This is the
// single source of truth the Connection Health Center, Sync Center, and
// per-location integration page all read from — nobody else invents a
// status string.
//
// Demo Workspace: the existing mock flags (location.googleConnected,
// location.hasAds, etc.) represent "this demo pretends the integration is
// active" — they are surfaced as "mock", never "connected", so nobody
// mistakes fictional data for a real account (the exact anti-pattern
// section 19/20 warns against).
// Live Agency Workspace: reads the real Supabase tables. Until a real OAuth
// flow completes for a client, every integration is honestly
// "needs-authorization" or "disconnected" — there is no fallback that
// paints over an empty table with a green checkmark.
import { getWorkspaceMode } from "@/lib/runtime-store";
import type { Location } from "@/lib/types";
import { INTEGRATION_KINDS, type ConnectionStatus, type IntegrationKind, type LocationIntegrationStatus } from "./types";

export function getLocationIntegrationStatus(location: Location): LocationIntegrationStatus {
  const mode = getWorkspaceMode();
  const statuses = {} as Record<IntegrationKind, ConnectionStatus>;

  if (mode === "demo") {
    statuses.google = location.googleConnected ? "mock" : "disconnected";
    statuses.instagram = "mock";
    statuses.facebook = "mock";
    statuses.whatsapp = "mock";
    statuses["google-ads"] = location.hasAds ? "mock" : "disconnected";
    statuses["meta-ads"] = location.hasAds ? "mock" : "disconnected";
    statuses.website = "mock";
  } else {
    // Live mode with nothing connected yet — every table is empty, so this
    // is the honest state until a real OAuth flow / connection exists.
    // A future pass wires this to real reads from google_locations,
    // social_accounts, whatsapp_connections, ad_accounts, websites.
    for (const kind of INTEGRATION_KINDS) statuses[kind] = "needs-authorization";
  }

  return { locationId: location.id, statuses };
}

export function overallStatusForLocation(status: LocationIntegrationStatus): ConnectionStatus {
  const values = Object.values(status.statuses);
  if (values.every((v) => v === "connected")) return "connected";
  if (values.some((v) => v === "error")) return "error";
  if (values.some((v) => v === "connected" || v === "mock")) return "partially-connected";
  if (values.every((v) => v === "needs-authorization")) return "needs-authorization";
  return "disconnected";
}

export function countByStatus(locations: Location[]): Record<ConnectionStatus, number> {
  const counts: Record<ConnectionStatus, number> = {
    connected: 0, "needs-authorization": 0, "partially-connected": 0, syncing: 0, error: 0, disconnected: 0, mock: 0,
  };
  for (const loc of locations) {
    const overall = overallStatusForLocation(getLocationIntegrationStatus(loc));
    counts[overall] += 1;
  }
  return counts;
}
