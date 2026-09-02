"use client";

// Browser Supabase client. Uses only the anon/publishable key — safe to ship
// to the client because RLS (see supabase/migrations/*_rls_policies.sql) is
// what actually protects the data, not secrecy of this key.
import { createBrowserClient } from "@supabase/ssr";

// No generated Database type exists yet (no `supabase gen types` step in
// this build) — `any` here is a deliberate, narrow substitute so
// .from(table) doesn't collapse to `never` for arbitrary table names.
// Callers narrow each query's result with their own local row interfaces
// (see repositories/*.ts) rather than relying on this for type safety.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let cached: ReturnType<typeof createBrowserClient<any>> | null = null;

export function getSupabaseBrowserClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    throw new Error(
      "Supabase browser client requested but NEXT_PUBLIC_SUPABASE_URL/NEXT_PUBLIC_SUPABASE_ANON_KEY are not set. " +
      "Check INTEGRATION_MODE before calling this — it should only be reached when INTEGRATION_MODE=live."
    );
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if (!cached) cached = createBrowserClient<any>(url, anonKey);
  return cached;
}
