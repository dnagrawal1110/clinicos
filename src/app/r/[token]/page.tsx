"use client";

// The secure, tokenized ReviewFlow surface (section 10). Unlike
// /review/:slug (a per-location/campaign link — QR codes, reception mode),
// this URL is unique per patient request and reveals nothing about which
// patient, campaign, location, or client it belongs to until the token
// resolves through reviewflow_get_by_token. Same underlying UI component as
// /review/:slug — only the persistence wiring differs.
import { use, useEffect, useState } from "react";
import { ReviewFlowExperience } from "@/components/reviewflow/ReviewFlowExperience";
import { PatientErrorState, PatientLoadingState } from "@/components/reviewflow/PatientErrorState";
import type { PatientErrorKind } from "@/components/reviewflow/PatientErrorState";
import { resolveReviewFlowToken, createTokenPersistence, type TokenResolutionError } from "@/repositories/reviewRequests";
import type { ReviewFlowConfig } from "@/lib/types";

const ERROR_MAP: Record<TokenResolutionError, PatientErrorKind> = {
  invalid_token: "invalid-link",
  expired_token: "expired",
  network_error: "network-error",
};

export default function TokenReviewPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const [state, setState] = useState<{ status: "loading" } | { status: "error"; kind: PatientErrorKind } | { status: "ready"; config: ReviewFlowConfig }>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;
    resolveReviewFlowToken(token).then((result) => {
      if (cancelled) return;
      if (!result.ok) {
        setState({ status: "error", kind: ERROR_MAP[result.error] });
        return;
      }
      setState({ status: "ready", config: result.data.config });
    });
    return () => {
      cancelled = true;
    };
  }, [token]);

  if (state.status === "loading") return <PatientLoadingState label="Loading..." />;
  if (state.status === "error") return <PatientErrorState kind={state.kind} />;

  return <ReviewFlowExperience config={state.config} persistence={createTokenPersistence(token)} />;
}
