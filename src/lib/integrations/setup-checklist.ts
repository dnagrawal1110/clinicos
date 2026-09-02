// Part 33/34 — the setup checklist and system-health status. Runs
// server-side only (checks process.env directly) and never returns a
// secret value, only whether each one is present/well-formed.
export interface SetupCheckItem {
  key: string;
  label: string;
  configured: boolean;
  detail?: string;
}

export function getGoogleSetupChecklist(): SetupCheckItem[] {
  return [
    { key: "GOOGLE_OAUTH_CLIENT_ID", label: "Google OAuth client ID", configured: Boolean(process.env.GOOGLE_OAUTH_CLIENT_ID) },
    { key: "GOOGLE_OAUTH_CLIENT_SECRET", label: "Google OAuth client secret", configured: Boolean(process.env.GOOGLE_OAUTH_CLIENT_SECRET) },
    { key: "GOOGLE_OAUTH_REDIRECT_URI", label: "Production redirect URI configured", configured: Boolean(process.env.GOOGLE_OAUTH_REDIRECT_URI) },
    { key: "TOKEN_ENCRYPTION_KEY", label: "Token encryption key (32 bytes, base64)", configured: isEncryptionKeyConfigured() },
    { key: "NEXT_PUBLIC_SUPABASE_URL", label: "Supabase project URL", configured: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL) },
    { key: "SUPABASE_SERVICE_ROLE_KEY", label: "Supabase service role key", configured: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY) },
  ];
}

function isEncryptionKeyConfigured(): boolean {
  const raw = process.env.TOKEN_ENCRYPTION_KEY;
  if (!raw) return false;
  try {
    return Buffer.from(raw, "base64").length === 32;
  } catch {
    return false;
  }
}

// The full agency/admin setup checklist (Part 34) — includes items no
// environment variable can verify (Google Cloud console configuration,
// legal URLs), shown as informational reminders rather than pass/fail.
export const GOOGLE_SETUP_STEPS = [
  "Google Cloud project created",
  "Required APIs enabled (Business Profile APIs, My Business API)",
  "OAuth consent screen configured",
  "OAuth client (Web application) created",
  "Production redirect URI added to the OAuth client",
  "API access approved for Business Profile scopes (may require Google's approval process)",
  "Production domain configured",
  "Privacy policy URL set on the OAuth consent screen",
  "Terms of service URL set on the OAuth consent screen",
  "Environment variables configured in production",
  "OAuth test completed against a real Google account",
  "First real client connected",
];
