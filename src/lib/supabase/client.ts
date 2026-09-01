"use client";

// Browser Supabase client. Uses only the anon/publishable key — safe to ship
// to the client because RLS (see supabase/migrations/*_rls_policies.sql) is
// what actually protects the data, not secrecy of this key.
import { createBrowserClient } from "@supabase/ssr";

let cached: ReturnType<typeof createBrowserClient> | null = null;

export function getSupabaseBrowserClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    throw new Error(
      "Supabase browser client requested but NEXT_PUBLIC_SUPABASE_URL/NEXT_PUBLIC_SUPABASE_ANON_KEY are not set. " +
      "Check INTEGRATION_MODE before calling this — it should only be reached when INTEGRATION_MODE=live."
    );
  }
  if (!cached) cached = createBrowserClient(url, anonKey);
  return cached;
}
