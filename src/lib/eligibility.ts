import type { EligibilityReason, Location, ReviewCampaign, ReviewDestination } from "./types";

export interface EligibilityInput {
  campaign: ReviewCampaign;
  location: Location;
  destination?: ReviewDestination;
  optedOut: boolean;
  recentRequestWithinFrequencyWindow: boolean;
  duplicateAppointment: boolean;
  isQuietHours: boolean;
}

export interface EligibilityResult {
  eligible: boolean;
  reason?: EligibilityReason;
  label?: string;
}

const REASON_LABEL: Record<EligibilityReason, string> = {
  "opted-out": "Patient previously opted out",
  "recent-duplicate": "Already received a request within the frequency window",
  "duplicate-appointment": "Duplicate request for the same appointment",
  "campaign-inactive": "Campaign is not active",
  "location-inactive": "Location is paused",
  "destination-disconnected": "Review destination is disconnected",
  "quiet-hours": "Attempted during configured quiet hours",
  "frequency-cap": "Maximum requests per patient already reached",
};

// Pure eligibility check run before a ReviewFlow request would be created.
// Mirrors section 8 — no real appointment/patient system to check against yet,
// so callers supply the boolean facts and this just applies the policy order.
export function checkEligibility(input: EligibilityInput): EligibilityResult {
  if (input.optedOut) return fail("opted-out");
  if (input.duplicateAppointment) return fail("duplicate-appointment");
  if (input.recentRequestWithinFrequencyWindow) return fail("recent-duplicate");
  if (input.campaign.status !== "active") return fail("campaign-inactive");
  if (input.location.status !== "active") return fail("location-inactive");
  if (input.destination && input.destination.status !== "connected") return fail("destination-disconnected");
  if (input.isQuietHours) return fail("quiet-hours");
  return { eligible: true };
}

function fail(reason: EligibilityReason): EligibilityResult {
  return { eligible: false, reason, label: REASON_LABEL[reason] };
}

export function eligibilityReasonLabel(reason: EligibilityReason): string {
  return REASON_LABEL[reason];
}

export const SUPPRESSION_REASONS: EligibilityReason[] = [
  "opted-out", "recent-duplicate", "duplicate-appointment", "campaign-inactive",
  "location-inactive", "destination-disconnected", "quiet-hours", "frequency-cap",
];
