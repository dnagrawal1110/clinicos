// The mock/live switch (section 69). Every repository checks this before
// deciding whether to read src/lib/mock/* or call Supabase. Never mix the
// two silently within a single request — a repository function picks one
// path or the other, in full, based on this value.
export type IntegrationMode = "mock" | "live";

export function getIntegrationMode(): IntegrationMode {
  // A single NEXT_PUBLIC_-prefixed var, read the same way on the server and
  // in the browser — the mode itself isn't a secret, so there's no reason to
  // maintain two variables that could drift out of sync.
  return process.env.NEXT_PUBLIC_INTEGRATION_MODE === "live" ? "live" : "mock";
}

export function isLiveMode(): boolean {
  return getIntegrationMode() === "live";
}
