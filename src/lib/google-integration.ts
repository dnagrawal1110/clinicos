// Google Business Profile OAuth + sync architecture (sections 26-34). No
// real Google API calls happen here — this defines the flow and the types
// a real implementation fills in, matching the tables in
// supabase/migrations/20260901000007_google_integration.sql exactly.
export type GoogleConnectionStatus = "connected" | "needs-reauth" | "revoked" | "error";
export type GoogleSyncStatus = "never-synced" | "syncing" | "synced" | "delayed" | "needs-reauth" | "error";

export interface GoogleOAuthConnection {
  id: string;
  agencyId: string;
  clientId?: string;
  status: GoogleConnectionStatus;
  scope: string;
  tokenExpiresAt: string;
  // access_token/refresh_token are intentionally absent from this type —
  // they never leave the server. A UI component should never hold them.
}

export interface GoogleAccountSummary {
  id: string;
  externalAccountId: string;
  displayName?: string;
}

export interface GoogleLocationSummary {
  id: string;
  externalLocationId: string;
  displayName?: string;
  address?: string;
  mappedLocationId?: string; // set once mapped to a ClinicOS location
}

// The connect flow (section 28) — each step is a server-side operation
// (Edge Function or route handler) using the service-role client; nothing
// here runs in the browser beyond kicking off the redirect.
export type GoogleConnectStep =
  | "redirect-to-google" // 1. Connect Google
  | "exchange-code" // 2. Authorize (OAuth callback exchanges code for tokens)
  | "discover-accounts" // 3. Fetch accessible business accounts
  | "discover-locations" // 4. Fetch locations for each account
  | "await-mapping" // 5. Display selectable locations to the agency user
  | "save-mapping"; // 6. Persist ClinicOS location <-> Google location mapping

export interface GoogleSyncResult {
  locationId: string;
  status: GoogleSyncStatus;
  lastSyncAt: string;
  error?: string;
}

// What a real sync job (section 31, every 6-12h) refreshes per location.
// Each field maps to an UPDATE on locations/google_reviews — never a
// wholesale table replace, so partial API failures don't wipe good data.
export interface GoogleProfileSyncFields {
  name?: string;
  address?: string;
  phone?: string;
  website?: string;
  categories?: string[];
  hours?: string;
  rating?: number;
  reviewCount?: number;
}

// UI status mapping (section 32) — never let a raw API failure surface;
// always resolve to one of these five before rendering anything.
export function displaySyncStatus(status: GoogleSyncStatus): { label: string; tone: "success" | "info" | "warning" | "critical" } {
  switch (status) {
    case "synced": return { label: "Connected", tone: "success" };
    case "syncing": return { label: "Syncing", tone: "info" };
    case "delayed": return { label: "Delayed", tone: "warning" };
    case "needs-reauth": return { label: "Needs Reauthorization", tone: "warning" };
    case "error": return { label: "Error", tone: "critical" };
    case "never-synced": return { label: "Not Connected", tone: "info" };
  }
}
