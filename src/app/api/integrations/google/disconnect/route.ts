import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServiceRoleClient } from "@/lib/supabase/server";
import { decryptSecret } from "@/lib/crypto/token-encryption";
import { googleBusinessProfileAdapter } from "@/lib/integrations/providers/google-business-profile-adapter";
import { logIntegrationActivityServer } from "@/lib/integrations/activity-log-server";

// POST /api/integrations/google/disconnect  { connectionId }
//
// Journey K — revokes with Google (best-effort), marks the connection
// disconnected, and explicitly does NOT delete external_assets,
// asset_mappings, google_reviews, or sync history. Historical synced data
// is preserved; only future syncing stops.
export async function POST(req: NextRequest) {
  const { connectionId } = await req.json() as { connectionId?: string };
  if (!connectionId) return NextResponse.json({ error: "connectionId is required" }, { status: 400 });

  const supabase = getSupabaseServiceRoleClient();
  const { data: connection } = await supabase.from("connections").select("*").eq("id", connectionId).maybeSingle();
  if (!connection) return NextResponse.json({ error: "Connection not found" }, { status: 404 });

  try {
    if (connection.access_token_ciphertext) {
      const accessToken = decryptSecret({ ciphertext: connection.access_token_ciphertext, iv: connection.access_token_iv });
      await googleBusinessProfileAdapter.revoke({ accessToken });
    }
  } catch (err) {
    // Revocation failing (e.g. token already invalid) shouldn't block
    // disconnecting locally — the user's intent is "stop using this",
    // which we can always honor on our side.
    console.error("[google-disconnect] revoke call failed, proceeding with local disconnect", err);
  }

  await supabase.from("connections").update({
    status: "disconnected",
    access_token_ciphertext: null, access_token_iv: null,
    refresh_token_ciphertext: null, refresh_token_iv: null,
  }).eq("id", connectionId);

  await logIntegrationActivityServer(supabase, {
    agencyId: connection.agency_id, clientId: connection.client_id, connectionId,
    integration: "google", action: "Connection disconnected", result: "success",
  });

  return NextResponse.json({ ok: true });
}
