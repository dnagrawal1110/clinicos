import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServiceRoleClient } from "@/lib/supabase/server";
import { decryptSecret } from "@/lib/crypto/token-encryption";
import { googleBusinessProfileAdapter } from "@/lib/integrations/providers/google-business-profile-adapter";
import { suggestMapping, type MappingCandidateLocation } from "@/lib/integrations/mapping-confidence";
import { logIntegrationActivityServer } from "@/lib/integrations/activity-log-server";

// POST /api/integrations/google/discover  { connectionId }
//
// Journey C/D: after OAuth, discover every account and location the
// authorized identity has access to — never assume it's exactly one
// business (Part 3/7). Each discovered location becomes an external_asset
// row plus a scored, pending asset_mapping — nothing is auto-confirmed.
export async function POST(req: NextRequest) {
  const { connectionId } = await req.json() as { connectionId?: string };
  if (!connectionId) return NextResponse.json({ error: "connectionId is required" }, { status: 400 });

  const supabase = getSupabaseServiceRoleClient();
  const { data: connection, error: connErr } = await supabase.from("connections").select("*").eq("id", connectionId).maybeSingle();
  if (connErr || !connection) return NextResponse.json({ error: "Connection not found" }, { status: 404 });

  await supabase.from("connections").update({ status: "discovering" }).eq("id", connectionId);

  try {
    const credentials = {
      accessToken: decryptSecret({ ciphertext: connection.access_token_ciphertext, iv: connection.access_token_iv }),
    };

    const accounts = await googleBusinessProfileAdapter.discoverAccounts(credentials);
    let totalAssets = 0;

    // Candidate locations to score against: every location under the
    // connection's own client, plus (deliberately) every other location in
    // the agency — Google can return unrelated businesses under the same
    // identity (Journey: "another business/location"), and a wrong-agency
    // match should never be silently offered.
    const { data: client } = await supabase.from("clients").select("id, name, brand").eq("id", connection.client_id).maybeSingle();
    const { data: locations } = await supabase.from("locations").select("id, name, city, address, phone, client_id").eq("agency_id", connection.agency_id);
    const clientNameById = new Map<string, string>();
    if (client) clientNameById.set(client.id, client.brand ?? client.name);
    const candidates: MappingCandidateLocation[] = (locations ?? []).map((l) => ({
      id: l.id, name: l.name, city: l.city, address: l.address ?? undefined, phone: l.phone ?? undefined,
      clientLabel: clientNameById.get(l.client_id) ?? "",
    }));

    for (const account of accounts) {
      const assets = await googleBusinessProfileAdapter.discoverAssets(credentials, account.externalId);
      totalAssets += assets.length;

      for (const asset of assets) {
        const { data: assetRow, error: assetErr } = await supabase
          .from("external_assets")
          .upsert(
            {
              agency_id: connection.agency_id, connection_id: connectionId, provider: "google-business-profile",
              asset_type: asset.assetType, external_id: asset.externalId, external_parent_id: asset.externalParentId,
              external_name: asset.name, metadata: { address: asset.address, phone: asset.phone, website: asset.website, ...asset.metadata },
              last_seen_at: new Date().toISOString(),
            },
            { onConflict: "connection_id,external_id" }
          )
          .select("id")
          .single();
        if (assetErr || !assetRow) continue;

        const { best } = suggestMapping({ externalLocationId: asset.externalId, name: asset.name, address: asset.address, phone: asset.phone, website: asset.website }, candidates);

        await supabase.from("asset_mappings").upsert(
          {
            agency_id: connection.agency_id, external_asset_id: assetRow.id,
            location_id: best?.locationId ?? null, client_id: best ? connection.client_id : null,
            confidence: best?.confidence ?? 0, match_reasons: best?.reasons ?? [],
            status: "pending",
          },
          { onConflict: "external_asset_id" }
        );
      }
    }

    await supabase.from("connections").update({ status: "mapping-required" }).eq("id", connectionId);
    await logIntegrationActivityServer(supabase, {
      agencyId: connection.agency_id, clientId: connection.client_id, connectionId,
      integration: "google", action: `Discovered ${totalAssets} asset(s) across ${accounts.length} account(s)`, result: "success",
    });

    return NextResponse.json({ accountsDiscovered: accounts.length, assetsDiscovered: totalAssets });
  } catch (err) {
    console.error("[google-discover]", err);
    await supabase.from("connections").update({ status: "authorization-required", last_error_code: "discovery-failed", last_error_message: "Asset discovery failed" }).eq("id", connectionId);
    await logIntegrationActivityServer(supabase, {
      agencyId: connection.agency_id, clientId: connection.client_id, connectionId,
      integration: "google", action: "Asset discovery failed", result: "failure", error: "Discovery failed",
    });
    return NextResponse.json({ error: "Discovery failed" }, { status: 502 });
  }
}
