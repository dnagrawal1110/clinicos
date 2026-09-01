"use client";

// Repository for the tokenized ReviewFlow surface (/r/:token). This is the
// thin seam between the UI and Supabase called for in section 8 — the
// component tree never imports @supabase/supabase-js directly.
//
// INTEGRATION_MODE=mock: token resolution/mutations are simulated in memory
// so /r/:token is demoable without a live project. INTEGRATION_MODE=live:
// every call hits the reviewflow_* Postgres RPCs (see
// supabase/migrations/20260901000011_reviewflow_rpc.sql), which are the
// only way this data is ever reached publicly — no raw table access.
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { isLiveMode } from "@/lib/integration-mode";
import type { ReviewFlowConfig } from "@/lib/types";
import type { ReviewFlowPersistence } from "@/lib/reviewflow-persistence";

export interface TokenReviewFlowResult {
  config: ReviewFlowConfig;
}

export type TokenResolutionError = "invalid_token" | "expired_token" | "network_error";

// A tiny in-memory mock store keyed by token, only used when
// INTEGRATION_MODE=mock, so the /r/:token route has something to resolve
// without a live project. Seed one demo token per app boot.
const MOCK_TOKENS: Record<string, ReviewFlowConfig> = {
  "demo-token": {
    locationId: "skinethics__kothrud",
    clientId: "skinethics",
    slug: "skinethics-kothrud",
    clinicDisplayName: "SkinEthics",
    doctorDisplayName: "Dr. Pallavi Ahire-Shelke",
    locationDisplayName: "Kothrud",
    logoInitial: "S",
    accentColor: "var(--color-primary)",
    welcomeText: "How was your experience?",
    thankYouText: "Thank you for sharing your experience.",
    supportContact: "+91 78647 89114",
    googleReviewUrl: "https://search.google.com/local/writereview?placeid=mock-skinethics__kothrud",
    language: "en",
    campaignId: "rc-1",
    campaignStatus: "active",
  },
};

export async function resolveReviewFlowToken(token: string): Promise<{ ok: true; data: TokenReviewFlowResult } | { ok: false; error: TokenResolutionError }> {
  if (!isLiveMode()) {
    const config = MOCK_TOKENS[token];
    return config ? { ok: true, data: { config } } : { ok: false, error: "invalid_token" };
  }
  try {
    const supabase = getSupabaseBrowserClient();
    const { data, error } = await supabase.rpc("reviewflow_get_by_token", { p_token: token });
    if (error) {
      if (error.message.includes("expired_token")) return { ok: false, error: "expired_token" };
      return { ok: false, error: "invalid_token" };
    }
    const row = data as {
      status: string; clinicDisplayName: string; doctorDisplayName: string | null;
      locationDisplayName: string; googleReviewUrl: string; ratingGiven: number | null; expiresAt: string | null;
    };
    const config: ReviewFlowConfig = {
      locationId: "", // deliberately not resolved client-side — see section 10
      clientId: "",
      slug: token,
      clinicDisplayName: row.clinicDisplayName,
      doctorDisplayName: row.doctorDisplayName ?? undefined,
      locationDisplayName: row.locationDisplayName,
      logoInitial: row.clinicDisplayName.replace(/^Dr\.\s*/i, "").slice(0, 1).toUpperCase(),
      accentColor: "var(--color-primary)",
      welcomeText: "How was your experience?",
      thankYouText: "Thank you for sharing your experience.",
      supportContact: "", // never sent to the client — see reviewflow_get_by_token
      googleReviewUrl: row.googleReviewUrl,
      language: "en",
      campaignId: "",
      campaignStatus: "active",
    };
    return { ok: true, data: { config } };
  } catch {
    return { ok: false, error: "network_error" };
  }
}

// Builds a ReviewFlowPersistence that calls the live RPCs for a given token.
// In mock mode, every call is a no-op (the mock token above isn't backed by
// a real row to mutate) — the UI still works end-to-end, it just doesn't
// persist anywhere durable, same as any other mock-mode demo path.
export function createTokenPersistence(token: string): ReviewFlowPersistence {
  if (!isLiveMode()) {
    return {};
  }
  const supabase = getSupabaseBrowserClient();
  return {
    onRatingSelected: async (rating) => {
      await supabase.rpc("reviewflow_submit_rating", { p_token: token, p_rating: rating });
    },
    onFeedbackSubmitted: async (text) => {
      await supabase.rpc("reviewflow_submit_feedback", { p_token: token, p_text: text });
    },
    onAiVersionRecorded: async (aiText) => {
      await supabase.rpc("reviewflow_record_ai_version", { p_token: token, p_ai_text: aiText });
    },
    onApprove: async (finalText, usedAiVersion) => {
      await supabase.rpc("reviewflow_approve", { p_token: token, p_final_text: finalText, p_used_ai: usedAiVersion });
    },
    onPublicClick: async () => {
      await supabase.rpc("reviewflow_public_click", { p_token: token });
    },
    onComplete: async () => {
      await supabase.rpc("reviewflow_complete", { p_token: token });
    },
    onOptOut: async () => {
      await supabase.rpc("reviewflow_opt_out", { p_token: token });
    },
  };
}
