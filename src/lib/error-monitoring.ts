// Central error-reporting abstraction for external integrations (section 62).
// No real monitoring provider (Sentry, etc.) is wired up — this is the seam
// every integration call site reports through, so plugging one in later is
// a one-file change instead of scattered try/catch blocks with inconsistent
// shapes.
export interface IntegrationError {
  provider: "google" | "whatsapp" | "meta" | "google-ads" | "ai" | "supabase";
  operation: string;
  locationId?: string;
  clientId?: string;
  errorCode?: string;
  message: string;
  timestamp: string;
  retryStatus: "not-retried" | "will-retry" | "retries-exhausted";
}

const listeners = new Set<(err: IntegrationError) => void>();

export function reportIntegrationError(err: Omit<IntegrationError, "timestamp">) {
  const full: IntegrationError = { ...err, timestamp: new Date().toISOString() };
  if (process.env.NODE_ENV !== "production") console.error("[integration-error]", full);
  listeners.forEach((l) => l(full));
}

export function onIntegrationError(cb: (err: IntegrationError) => void): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}
