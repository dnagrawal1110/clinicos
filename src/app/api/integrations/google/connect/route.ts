import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { googleBusinessProfileAdapter } from "@/lib/integrations/providers/google-business-profile-adapter";

// GET /api/integrations/google/connect?clientId=...&returnTo=...
//
// Journey B: "ClinicOS will open Google so you can authorize access to the
// Google Business Profiles you manage. ClinicOS never receives your Google
// password." This route is step 1 — it never talks to Google's token
// endpoint, only builds the authorization redirect.
export async function GET(req: NextRequest) {
  if (!googleBusinessProfileAdapter.isConfigured()) {
    // Part 35: never fake success. Redirect to a UI route that explains
    // exactly what's missing instead of a raw 500.
    return NextResponse.redirect(new URL("/integrations/google/setup-required", req.url));
  }

  const clientId = req.nextUrl.searchParams.get("clientId");
  if (!clientId) {
    return NextResponse.json({ error: "clientId query parameter is required" }, { status: 400 });
  }
  const returnTo = req.nextUrl.searchParams.get("returnTo") ?? `/clients/${clientId}`;

  // CSRF protection (Part 24): a random nonce goes both to Google (as
  // `state`) and into an httpOnly cookie. The callback rejects any request
  // whose `state` doesn't match the cookie — an attacker who tricks a user
  // into visiting a crafted callback URL can't forge this without also
  // controlling the user's cookies.
  const nonce = randomBytes(24).toString("base64url");
  const redirectUri = requireRedirectUri(req);
  const authUrl = googleBusinessProfileAdapter.buildAuthorizationUrl(nonce, redirectUri);

  const res = NextResponse.redirect(authUrl);
  res.cookies.set("google_oauth_state", nonce, { httpOnly: true, secure: true, sameSite: "lax", maxAge: 600, path: "/" });
  res.cookies.set("google_oauth_context", JSON.stringify({ clientId, returnTo }), { httpOnly: true, secure: true, sameSite: "lax", maxAge: 600, path: "/" });
  return res;
}

function requireRedirectUri(req: NextRequest): string {
  return process.env.GOOGLE_OAUTH_REDIRECT_URI ?? new URL("/api/integrations/google/callback", req.url).toString();
}
