// Shared types for the real-integration layer (Connection Health Center,
// Sync Center, Data Mapping Review, per-location integration page). These
// mirror the tables in supabase/migrations/20260902000003_integrations_v2.sql.
export type IntegrationKind = "google" | "instagram" | "facebook" | "whatsapp" | "google-ads" | "meta-ads" | "website";

export const INTEGRATION_KINDS: IntegrationKind[] = ["google", "instagram", "facebook", "whatsapp", "google-ads", "meta-ads", "website"];

export const INTEGRATION_LABEL: Record<IntegrationKind, string> = {
  google: "Google Business Profile",
  instagram: "Instagram",
  facebook: "Facebook",
  whatsapp: "WhatsApp",
  "google-ads": "Google Ads",
  "meta-ads": "Meta Ads",
  website: "Website",
};

// The exact 7 states section 10 calls for.
export type ConnectionStatus =
  | "connected" | "needs-authorization" | "partially-connected"
  | "syncing" | "error" | "disconnected" | "mock";

export const CONNECTION_STATUS_LABEL: Record<ConnectionStatus, string> = {
  connected: "Connected",
  "needs-authorization": "Needs Authorization",
  "partially-connected": "Partially Connected",
  syncing: "Syncing",
  error: "Error",
  disconnected: "Disconnected",
  mock: "Mock",
};

export interface LocationIntegrationStatus {
  locationId: string;
  statuses: Record<IntegrationKind, ConnectionStatus>;
}

export interface SyncCenterEntry {
  locationId: string;
  integration: IntegrationKind;
  lastSyncAt: string | null;
  nextSyncAt: string | null;
  recordsImported: number;
  recordsUpdated: number;
  recordsFailed: number;
  apiErrors: string[];
  needsReauthorization: boolean;
}

export interface ConnectionTestResult {
  integration: IntegrationKind;
  passed: boolean;
  checks: { label: string; passed: boolean; detail?: string }[];
}

export interface SystemHealthCheckResult {
  totalLocations: number;
  connected: number;
  partial: number;
  errors: number;
  unmapped: number;
  needsAttention: number;
  perLocation: { locationId: string; status: ConnectionStatus; issues: string[] }[];
}

export interface MappingCandidate {
  id: string;
  discoveredName: string;
  discoveredAddress?: string;
  discoveredPhone?: string;
  discoveredWebsite?: string;
  suggestedLocationId?: string;
  confidence: number; // 0-100
  matchReasons: string[];
  status: "pending" | "confirmed" | "rejected";
}

export interface IntegrationActivityLogEntry {
  id: string;
  actorLabel: string;
  clientId?: string;
  locationId?: string;
  integration: IntegrationKind;
  action: string;
  result: "success" | "failure" | "skipped";
  error?: string;
  createdAt: string;
}
