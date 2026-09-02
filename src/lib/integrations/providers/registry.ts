import "server-only";

import type { ProviderAdapter } from "./provider-adapter";
import { googleBusinessProfileAdapter } from "./google-business-profile-adapter";
import { metaAdapter, googleAdsAdapter, whatsAppAdapter } from "./stub-adapters";

export const PROVIDER_ADAPTERS: Record<string, ProviderAdapter> = {
  "google-business-profile": googleBusinessProfileAdapter,
  meta: metaAdapter,
  "google-ads": googleAdsAdapter,
  whatsapp: whatsAppAdapter,
};

export function getProviderAdapter(provider: string): ProviderAdapter {
  const adapter = PROVIDER_ADAPTERS[provider];
  if (!adapter) throw new Error(`Unknown provider: ${provider}`);
  return adapter;
}
