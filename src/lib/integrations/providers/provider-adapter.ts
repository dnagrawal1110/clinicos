// Provider adapter interface (Part 28). Every external platform ClinicOS
// ever connects to implements this same shape, so the Connection/
// ExternalAsset/AssetMapping/SyncJob architecture works identically for
// Google, Meta, Google Ads, and WhatsApp — only the adapter differs.
export interface DiscoveredAccount {
  externalId: string;
  name: string;
}

export interface DiscoveredAsset {
  externalId: string;
  externalParentId?: string;
  assetType: string;
  name: string;
  address?: string;
  phone?: string;
  website?: string;
  metadata: Record<string, unknown>;
}

export interface SyncStepResult {
  step: string;
  status: "completed" | "failed" | "skipped";
  recordsImported: number;
  recordsUpdated: number;
  recordsFailed: number;
  errorCode?: string;
  errorMessage?: string;
}

export interface HealthCheckResult {
  healthy: boolean;
  detail: string;
}

// Decrypted-at-call-time credentials, passed in rather than looked up
// internally — keeps every adapter method pure/testable without needing to
// know how tokens are stored or decrypted.
export interface ProviderCredentials {
  accessToken: string;
  refreshToken?: string;
}

export interface ProviderAdapter {
  readonly provider: string;
  isConfigured(): boolean; // env vars / app credentials present, independent of any specific connection
  buildAuthorizationUrl(state: string, redirectUri: string): string;
  exchangeCodeForTokens(code: string, redirectUri: string): Promise<{ accessToken: string; refreshToken: string; expiresAt: string; grantedScopes: string[] }>;
  discoverAccounts(credentials: ProviderCredentials): Promise<DiscoveredAccount[]>;
  discoverAssets(credentials: ProviderCredentials, accountExternalId: string): Promise<DiscoveredAsset[]>;
  syncAsset(credentials: ProviderCredentials, asset: DiscoveredAsset): Promise<SyncStepResult[]>;
  healthCheck(credentials: ProviderCredentials): Promise<HealthCheckResult>;
  revoke(credentials: ProviderCredentials): Promise<void>;
}
