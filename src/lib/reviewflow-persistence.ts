// The persistence seam ReviewFlowExperience calls into for each lifecycle
// step. The default (used by the existing /review/:slug campaign/QR-link
// surface) is a no-op except for the same runtime-store completion it
// always recorded — behavior is unchanged for that route. The tokenized
// /r/:token route (backed by a real patient_requests row) passes a
// different implementation that calls the Supabase RPCs instead.
import { recordReviewCompletion } from "./runtime-store";

export interface ReviewFlowPersistence {
  onRatingSelected?: (rating: number) => void | Promise<void>;
  onFeedbackSubmitted?: (text: string) => void | Promise<void>;
  onAiVersionRecorded?: (aiText: string) => void | Promise<void>;
  onApprove?: (finalText: string, usedAiVersion: boolean) => void | Promise<void>;
  onPublicClick?: () => void | Promise<void>;
  onComplete?: (rating: number) => void | Promise<void>;
  onOptOut?: () => void | Promise<void>;
}

export function defaultReviewFlowPersistence(locationId: string): ReviewFlowPersistence {
  return {
    onComplete: (rating) => {
      recordReviewCompletion(locationId, { rating, shared: true });
    },
  };
}
