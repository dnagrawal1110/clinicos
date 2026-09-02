// Stub adapters for providers not implemented in this phase (Part 28).
// `isConfigured()` always returns false — the UI must show "Not Configured"
// / "Coming Soon" for these, never a fake connect flow. Every other method
// throws if called, so a future implementer can't accidentally ship a
// silent no-op that looks like it worked.
import type { ProviderAdapter } from "./provider-adapter";

function notImplemented(provider: string): never {
  throw new Error(`${provider} adapter is not implemented yet — this is intentional (Part 28: only Google needs real implementation in this phase).`);
}

function stubAdapter(provider: string): ProviderAdapter {
  return {
    provider,
    isConfigured: () => false,
    buildAuthorizationUrl: () => notImplemented(provider),
    exchangeCodeForTokens: () => notImplemented(provider),
    discoverAccounts: () => notImplemented(provider),
    discoverAssets: () => notImplemented(provider),
    syncAsset: () => notImplemented(provider),
    healthCheck: async () => ({ healthy: false, detail: "Not configured" }),
    revoke: () => notImplemented(provider),
  };
}

export const metaAdapter = stubAdapter("meta");
export const googleAdsAdapter = stubAdapter("google-ads");
export const whatsAppAdapter = stubAdapter("whatsapp");
