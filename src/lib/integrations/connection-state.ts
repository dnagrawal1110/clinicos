// The 15-state connection lifecycle (Part 6). OAuth success means
// AUTHENTICATED — never jump straight to "healthy". A connection only
// reaches "healthy" after mapping is confirmed AND a sync has completed.
export type ConnectionState =
  | "not-connected" | "authorization-required" | "authorizing" | "authenticated"
  | "discovering" | "mapping-required" | "partially-mapped" | "syncing"
  | "healthy" | "degraded" | "sync-error" | "token-expired" | "revoked"
  | "disconnected" | "write-disabled";

export const CONNECTION_STATE_LABEL: Record<ConnectionState, string> = {
  "not-connected": "Not Connected",
  "authorization-required": "Authorization Required",
  authorizing: "Authorizing",
  authenticated: "Authenticated",
  discovering: "Discovering",
  "mapping-required": "Mapping Required",
  "partially-mapped": "Partially Mapped",
  syncing: "Syncing",
  healthy: "Healthy",
  degraded: "Degraded",
  "sync-error": "Sync Error",
  "token-expired": "Token Expired",
  revoked: "Revoked",
  disconnected: "Disconnected",
  "write-disabled": "Write Disabled",
};

export const CONNECTION_STATE_TONE: Record<ConnectionState, "success" | "warning" | "critical" | "neutral" | "info"> = {
  "not-connected": "neutral",
  "authorization-required": "warning",
  authorizing: "info",
  authenticated: "info",
  discovering: "info",
  "mapping-required": "warning",
  "partially-mapped": "warning",
  syncing: "info",
  healthy: "success",
  degraded: "warning",
  "sync-error": "critical",
  "token-expired": "warning",
  revoked: "critical",
  disconnected: "neutral",
  "write-disabled": "neutral",
};

// Valid forward transitions. Not exhaustive of every recovery path (e.g.
// "reconnect" from token-expired/revoked goes back to "authorizing" — see
// RECOVERY_TRANSITIONS) but enough to guard against skipping a required
// step (Part 5's "OAuth success does not mean synced, mapped, or healthy").
const FORWARD_TRANSITIONS: Record<ConnectionState, ConnectionState[]> = {
  "not-connected": ["authorization-required"],
  "authorization-required": ["authorizing"],
  authorizing: ["authenticated", "authorization-required"], // user cancels -> back to authorization-required
  authenticated: ["discovering"],
  discovering: ["mapping-required", "authorization-required"], // discovery can fail auth (revoked mid-flow)
  "mapping-required": ["partially-mapped", "mapping-required"],
  "partially-mapped": ["partially-mapped", "syncing"], // stays partially-mapped until every asset is confirmed/rejected
  syncing: ["healthy", "degraded", "sync-error"],
  healthy: ["syncing", "degraded", "token-expired", "revoked", "disconnected"],
  degraded: ["syncing", "healthy", "token-expired", "revoked", "disconnected"],
  "sync-error": ["syncing", "token-expired", "revoked", "disconnected"],
  "token-expired": ["authorizing", "disconnected"],
  revoked: ["authorizing", "disconnected"],
  disconnected: ["authorization-required"],
  "write-disabled": [], // orthogonal flag in the UI, not a lifecycle terminal — see capabilities model
};

export function canTransition(from: ConnectionState, to: ConnectionState): boolean {
  return FORWARD_TRANSITIONS[from]?.includes(to) ?? false;
}

export function assertTransition(from: ConnectionState, to: ConnectionState): void {
  if (!canTransition(from, to)) {
    throw new Error(`Invalid connection state transition: ${from} -> ${to}`);
  }
}

// Derives the display state from the underlying facts, rather than trusting
// a single stored enum that could drift from reality (e.g. a token that
// silently expired between syncs).
export function deriveConnectionState(input: {
  hasConnection: boolean;
  tokenExpiresAt: string | null;
  storedStatus: ConnectionState;
  unmappedAssetCount: number;
  totalAssetCount: number;
  lastSyncFailed: boolean;
}): ConnectionState {
  if (!input.hasConnection) return "not-connected";
  if (input.storedStatus === "revoked" || input.storedStatus === "disconnected") return input.storedStatus;
  if (input.tokenExpiresAt && new Date(input.tokenExpiresAt) < new Date()) return "token-expired";
  if (input.storedStatus === "authenticated" || input.storedStatus === "discovering") return input.storedStatus;
  if (input.totalAssetCount > 0 && input.unmappedAssetCount === input.totalAssetCount) return "mapping-required";
  if (input.unmappedAssetCount > 0) return "partially-mapped";
  if (input.lastSyncFailed) return "sync-error";
  if (input.storedStatus === "syncing") return "syncing";
  return "healthy";
}
