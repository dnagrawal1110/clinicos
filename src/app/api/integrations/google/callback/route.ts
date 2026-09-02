import { NextRequest, NextResponse } from "next/server";
import { googleBusinessProfileAdapter } from "@/lib/integrations/providers/google-business-profile-adapter";
import { encryptSecret } from "@/lib/crypto/token-encryption";
import { getSupabaseServiceRoleClient } from "@/lib/supabase/server";
import { logIntegrationActivityServer } from "@/lib/integrations/activity-log-server";

// GET /api/integrations/google/callback — Journey C. OAuth success here
// means AUTHENTICATED only; it deliberately does not discover, map, or
// sync. Those are separate steps the UI triggers explicitly afterward.
export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  const contextCookie = req.cookies.get("google_oauth_context")?.value;
  const context = contextCookie ? (JSON.parse(contextCookie) as { clientId: string; returnTo: string }) : null;
  const returnTo = context?.returnTo ?? "/integrations";

  // Journey: user cancels OAuth — Google appends ?error=access_denied.
  if (params.get("error")) {
    return redirectWithStatus(req, returnTo, "cancelled");
  }

  const state = params.get("state");
  const expectedState = req.cookies.get("google_oauth_state")?.value;
  if (!state || !expectedState || state !== expectedState) {
    return redirectWithStatus(req, returnTo, "invalid-state");
  }

  const code = params.get("code");
  if (!code || !context) {
    return redirectWithStatus(req, returnTo, "missing-code");
  }

  const redirectUri = process.env.GOOGLE_OAUTH_REDIRECT_URI ?? new URL("/api/integrations/google/callback", req.url).toString();

  try {
    const tokens = await googleBusinessProfileAdapter.exchangeCodeForTokens(code, redirectUri);
    const accessTokenEnc = encryptSecret(tokens.accessToken);
    const refreshTokenEnc = encryptSecret(tokens.refreshToken);

    const supabase = getSupabaseServiceRoleClient();
    // Agency is derived server-side from the client record, never trusted
    // from a query param — this is the seam that becomes "from the
    // authenticated session" once real Supabase Auth exists (Part 24).
    const { data: client, error: clientErr } = await supabase.from("clients").select("id, agency_id").eq("id", context.clientId).maybeSingle();
    if (clientErr || !client) {
      return redirectWithStatus(req, returnTo, "client-not-found");
    }

    const { data: connection, error: insertErr } = await supabase
      .from("connections")
      .insert({
        agency_id: client.agency_id,
        client_id: client.id,
        provider: "google-business-profile",
        connection_type: "oauth",
        status: "authenticated",
        granted_scopes: tokens.grantedScopes,
        access_token_ciphertext: accessTokenEnc.ciphertext,
        access_token_iv: accessTokenEnc.iv,
        refresh_token_ciphertext: refreshTokenEnc.ciphertext,
        refresh_token_iv: refreshTokenEnc.iv,
        token_expires_at: tokens.expiresAt,
        read_capabilities: ["read_profile", "read_reviews"],
        write_capabilities_enabled: [],
      })
      .select("id")
      .single();
    if (insertErr || !connection) {
      throw new Error(insertErr?.message ?? "connection insert returned no row");
    }

    await logIntegrationActivityServer(supabase, {
      agencyId: client.agency_id, clientId: client.id, connectionId: connection.id,
      integration: "google", action: "OAuth completed", result: "success",
    });

    const res = NextResponse.redirect(new URL(`${returnTo}?googleConnectionId=${connection.id}&googleStatus=authenticated`, req.url));
    res.cookies.delete("google_oauth_state");
    res.cookies.delete("google_oauth_context");
    return res;
  } catch (err) {
    // Part 24: never surface the raw provider error (may contain
    // request details) — log server-side, show a safe message client-side.
    console.error("[google-oauth-callback]", err);
    if (context) {
      const supabase = getSupabaseServiceRoleClient();
      const { data: client } = await supabase.from("clients").select("id, agency_id").eq("id", context.clientId).maybeSingle();
      if (client) {
        await logIntegrationActivityServer(supabase, {
          agencyId: client.agency_id, clientId: client.id, integration: "google",
          action: "OAuth failed", result: "failure", error: "Token exchange failed",
        });
      }
    }
    return redirectWithStatus(req, returnTo, "oauth-failed");
  }
}

function redirectWithStatus(req: NextRequest, returnTo: string, status: string) {
  const res = NextResponse.redirect(new URL(`${returnTo}?googleStatus=${status}`, req.url));
  res.cookies.delete("google_oauth_state");
  res.cookies.delete("google_oauth_context");
  return res;
}
