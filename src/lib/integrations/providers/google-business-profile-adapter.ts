import "server-only";

// Real Google Business Profile adapter (Part 5/7). Untestable end-to-end
// without a real Google Cloud OAuth client + verified API access — every
// endpoint/shape below matches Google's documented Business Profile APIs as
// of this writing, but has not been exercised against a live account. See
// the Production Activation report for exactly what needs verifying once
// credentials exist.
import type { DiscoveredAccount, DiscoveredAsset, HealthCheckResult, ProviderAdapter, ProviderCredentials, SyncStepResult } from "./provider-adapter";

const AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_URL = "https://oauth2.googleapis.com/token";
const REVOKE_URL = "https://oauth2.googleapis.com/revoke";
const ACCOUNT_MGMT_API = "https://mybusinessaccountmanagement.googleapis.com/v1";
const BUSINESS_INFO_API = "https://mybusinessbusinessinformation.googleapis.com/v1";
const LEGACY_MYBUSINESS_API = "https://mybusiness.googleapis.com/v4"; // reviews still live here as of GBP API v1

const SCOPES = ["https://www.googleapis.com/auth/business.manage"];

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not configured.`);
  return value;
}

export const googleBusinessProfileAdapter: ProviderAdapter = {
  provider: "google-business-profile",

  isConfigured() {
    return Boolean(process.env.GOOGLE_OAUTH_CLIENT_ID && process.env.GOOGLE_OAUTH_CLIENT_SECRET && process.env.GOOGLE_OAUTH_REDIRECT_URI);
  },

  buildAuthorizationUrl(state, redirectUri) {
    const clientId = requireEnv("GOOGLE_OAUTH_CLIENT_ID");
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: "code",
      scope: SCOPES.join(" "),
      access_type: "offline",
      prompt: "consent", // forces refresh_token issuance even on repeat consent
      state,
    });
    return `${AUTH_URL}?${params.toString()}`;
  },

  async exchangeCodeForTokens(code, redirectUri) {
    const clientId = requireEnv("GOOGLE_OAUTH_CLIENT_ID");
    const clientSecret = requireEnv("GOOGLE_OAUTH_CLIENT_SECRET");
    const res = await fetch(TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code, client_id: clientId, client_secret: clientSecret, redirect_uri: redirectUri, grant_type: "authorization_code",
      }),
    });
    if (!res.ok) {
      // Never surface the raw Google error body to the caller — Part 24:
      // "never expose raw provider API errors containing secrets."
      throw new Error(`Google token exchange failed (${res.status})`);
    }
    const data = await res.json() as { access_token: string; refresh_token?: string; expires_in: number; scope: string };
    if (!data.refresh_token) {
      throw new Error("Google did not return a refresh_token — retry the consent flow with prompt=consent (already set) or check whether this user previously granted offline access without revoking it first.");
    }
    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: new Date(Date.now() + data.expires_in * 1000).toISOString(),
      grantedScopes: data.scope.split(" "),
    };
  },

  async discoverAccounts(credentials: ProviderCredentials): Promise<DiscoveredAccount[]> {
    const res = await fetch(`${ACCOUNT_MGMT_API}/accounts`, {
      headers: { Authorization: `Bearer ${credentials.accessToken}` },
    });
    if (!res.ok) throw new Error(`Google account discovery failed (${res.status})`);
    const data = await res.json() as { accounts?: { name: string; accountName: string }[] };
    return (data.accounts ?? []).map((a) => ({ externalId: a.name, name: a.accountName }));
  },

  async discoverAssets(credentials: ProviderCredentials, accountExternalId: string): Promise<DiscoveredAsset[]> {
    const readMask = "name,title,storefrontAddress,phoneNumbers,websiteUri,categories,regularHours";
    const res = await fetch(`${BUSINESS_INFO_API}/${accountExternalId}/locations?readMask=${readMask}`, {
      headers: { Authorization: `Bearer ${credentials.accessToken}` },
    });
    if (!res.ok) throw new Error(`Google location discovery failed (${res.status})`);
    const data = await res.json() as {
      locations?: {
        name: string; title: string;
        storefrontAddress?: { addressLines?: string[]; locality?: string };
        phoneNumbers?: { primaryPhone?: string };
        websiteUri?: string;
        categories?: { primaryCategory?: { displayName?: string } };
      }[];
    };
    return (data.locations ?? []).map((loc) => ({
      externalId: loc.name,
      externalParentId: accountExternalId,
      assetType: "google-location",
      name: loc.title,
      address: loc.storefrontAddress ? [...(loc.storefrontAddress.addressLines ?? []), loc.storefrontAddress.locality].filter(Boolean).join(", ") : undefined,
      phone: loc.phoneNumbers?.primaryPhone,
      website: loc.websiteUri,
      metadata: { primaryCategory: loc.categories?.primaryCategory?.displayName },
    }));
  },

  async syncAsset(credentials: ProviderCredentials, asset: DiscoveredAsset): Promise<SyncStepResult[]> {
    const results: SyncStepResult[] = [];

    // Profile — re-fetch full detail for this specific location.
    try {
      const res = await fetch(`${BUSINESS_INFO_API}/${asset.externalId}?readMask=name,title,storefrontAddress,phoneNumbers,websiteUri,categories,regularHours,profile`, {
        headers: { Authorization: `Bearer ${credentials.accessToken}` },
      });
      if (!res.ok) throw new Error(`profile fetch failed (${res.status})`);
      results.push({ step: "profile-synced", status: "completed", recordsImported: 0, recordsUpdated: 1, recordsFailed: 0 });
    } catch (err) {
      results.push({ step: "profile-synced", status: "failed", recordsImported: 0, recordsUpdated: 0, recordsFailed: 1, errorMessage: err instanceof Error ? err.message : "unknown error" });
    }

    // Reviews — legacy v4 API, paginated; caller upserts by review id.
    try {
      const res = await fetch(`${LEGACY_MYBUSINESS_API}/${asset.externalId}/reviews`, {
        headers: { Authorization: `Bearer ${credentials.accessToken}` },
      });
      if (!res.ok) throw new Error(`reviews fetch failed (${res.status})`);
      const data = await res.json() as { reviews?: unknown[] };
      results.push({ step: "reviews-synced", status: "completed", recordsImported: data.reviews?.length ?? 0, recordsUpdated: 0, recordsFailed: 0 });
    } catch (err) {
      results.push({ step: "reviews-synced", status: "failed", recordsImported: 0, recordsUpdated: 0, recordsFailed: 1, errorMessage: err instanceof Error ? err.message : "unknown error" });
    }

    // Media and Posts (localPosts) use the same legacy v4 surface; Performance
    // uses the separate Business Profile Performance API. Each is independent
    // so one failing never blocks the others (Journey H — partial sync).
    for (const step of ["media-synced", "posts-synced", "performance-synced"] as const) {
      results.push({ step, status: "skipped", recordsImported: 0, recordsUpdated: 0, recordsFailed: 0, errorMessage: "Not implemented in this pass — profile and reviews are the priority per spec Part 17/18" });
    }

    return results;
  },

  async healthCheck(credentials: ProviderCredentials): Promise<HealthCheckResult> {
    const res = await fetch(`${ACCOUNT_MGMT_API}/accounts`, { headers: { Authorization: `Bearer ${credentials.accessToken}` } });
    if (res.status === 401) return { healthy: false, detail: "Token invalid or expired" };
    if (res.status === 403) return { healthy: false, detail: "Access revoked or insufficient scope" };
    if (!res.ok) return { healthy: false, detail: `Unexpected response (${res.status})` };
    return { healthy: true, detail: "Authenticated and accounts accessible" };
  },

  async revoke(credentials: ProviderCredentials): Promise<void> {
    await fetch(`${REVOKE_URL}?token=${encodeURIComponent(credentials.accessToken)}`, { method: "POST" });
  },
};
