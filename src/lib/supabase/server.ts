import "server-only";

// Server-only Supabase clients. Two flavors:
//  - getSupabaseServerClient(): respects the current user's session/RLS —
//    use this for anything an authenticated agency user does.
//  - getSupabaseServiceRoleClient(): bypasses RLS entirely. Only for trusted
//    server code (seed scripts, Edge Functions, sync jobs) that legitimately
//    needs cross-tenant access. NEVER import this from a "use client" file —
//    the `server-only` import above makes that a build-time error, not just
//    a lint warning.
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

// No generated Database type exists yet — see the same note in
// lib/supabase/client.ts. `any` here is deliberate and narrow, not a
// general escape hatch.
export async function getSupabaseServerClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL/NEXT_PUBLIC_SUPABASE_ANON_KEY are not set.");
  }
  const cookieStore = await cookies();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return createServerClient<any>(url, anonKey, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (cookiesToSet) => {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Called from a Server Component with no response to write to —
          // safe to ignore as long as middleware refreshes the session.
        }
      },
    },
  });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let cachedServiceRoleClient: ReturnType<typeof createClient<any>> | null = null;

export function getSupabaseServiceRoleClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY is not set. This client must never be reachable without it — " +
      "do not fall back to the anon key here."
    );
  }
  if (!cachedServiceRoleClient) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    cachedServiceRoleClient = createClient<any>(url, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
  }
  return cachedServiceRoleClient;
}
