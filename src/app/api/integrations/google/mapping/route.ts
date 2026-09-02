import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServiceRoleClient } from "@/lib/supabase/server";
import { logIntegrationActivityServer } from "@/lib/integrations/activity-log-server";

// PATCH /api/integrations/google/mapping
// Body: { mappingId, action: "confirm" | "reject" | "change", locationId? }
//
// Journey D/E/F/18 — every mapping decision is explicit and audited.
// "confirm" requires a locationId (either the suggested one or a
// user-chosen one via "change" first). Never auto-applies a suggestion.
export async function PATCH(req: NextRequest) {
  const { mappingId, action, locationId } = await req.json() as { mappingId?: string; action?: string; locationId?: string };
  if (!mappingId || !action) return NextResponse.json({ error: "mappingId and action are required" }, { status: 400 });

  const supabase = getSupabaseServiceRoleClient();
  const { data: mapping, error: mappingErr } = await supabase.from("asset_mappings").select("*, external_assets(connection_id)").eq("id", mappingId).maybeSingle();
  if (mappingErr || !mapping) return NextResponse.json({ error: "Mapping not found" }, { status: 404 });

  if (action === "confirm") {
    const targetLocationId = locationId ?? mapping.location_id;
    if (!targetLocationId) return NextResponse.json({ error: "No location to confirm — provide locationId or use a mapping with a suggestion" }, { status: 400 });
    await supabase.from("asset_mappings").update({ status: "confirmed", location_id: targetLocationId, confirmed_at: new Date().toISOString() }).eq("id", mappingId);
  } else if (action === "reject") {
    await supabase.from("asset_mappings").update({ status: "rejected" }).eq("id", mappingId);
  } else if (action === "change") {
    if (!locationId) return NextResponse.json({ error: "locationId is required for action=change" }, { status: 400 });
    await supabase.from("asset_mappings").update({ status: "pending", location_id: locationId, confidence: 0, match_reasons: ["Manually selected"] }).eq("id", mappingId);
  } else {
    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  }

  // Recompute the connection's overall state: mapping-required while any
  // pending mapping remains, partially-mapped once some are resolved,
  // otherwise ready for sync.
  const connectionId = (mapping.external_assets as unknown as { connection_id: string }).connection_id;
  const { data: allMappings } = await supabase
    .from("asset_mappings")
    .select("status, external_assets!inner(connection_id)")
    .eq("external_assets.connection_id", connectionId);
  const pending = (allMappings ?? []).filter((m) => m.status === "pending").length;
  const nextStatus = pending === (allMappings ?? []).length ? "mapping-required" : pending > 0 ? "partially-mapped" : "authenticated";
  await supabase.from("connections").update({ status: nextStatus }).eq("id", connectionId);

  const { data: connection } = await supabase.from("connections").select("agency_id, client_id").eq("id", connectionId).maybeSingle();
  if (connection) {
    await logIntegrationActivityServer(supabase, {
      agencyId: connection.agency_id, clientId: connection.client_id, connectionId, assetId: mapping.external_asset_id,
      integration: "google", action: `Mapping ${action}ed`, result: "success",
    });
  }

  return NextResponse.json({ ok: true, connectionStatus: nextStatus });
}
