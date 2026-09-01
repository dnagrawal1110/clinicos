import type { ReviewFlowConfig } from "./types";
import { getLocationBySlug, getClient } from "./mock/clients";
import { REVIEW_CAMPAIGNS } from "./mock/operations";

// Resolves a public ReviewFlow URL slug into a fully white-labeled config.
// This is the seam a real backend would replace with a signed-token lookup —
// see section 49 of the ReviewFlow spec (server-side validation, expiry, etc).
export function getReviewFlowConfig(slug: string): ReviewFlowConfig | null {
  const location = getLocationBySlug(slug);
  if (!location) return null;
  const client = getClient(location.clientId);
  if (!client) return null;

  const doctor = client.doctors.find((d) => d.locationIds.includes(location.id));
  const campaign = REVIEW_CAMPAIGNS.find((c) => c.locationId === location.id);
  const clinicDisplayName = client.brand ?? client.name;

  const campaignStatus: ReviewFlowConfig["campaignStatus"] =
    location.status === "paused" ? "paused" : (campaign?.status ?? "draft");

  return {
    locationId: location.id,
    clientId: client.id,
    slug: location.slug,
    clinicDisplayName,
    doctorDisplayName: doctor?.name,
    locationDisplayName: location.name,
    logoInitial: clinicDisplayName.replace(/^Dr\.\s*/i, "").slice(0, 1).toUpperCase(),
    accentColor: "var(--color-primary)",
    welcomeText: "How was your experience?",
    thankYouText: "Thank you for sharing your experience.",
    supportContact: location.phone,
    googleReviewUrl: `https://search.google.com/local/writereview?placeid=mock-${location.id}`,
    language: "en",
    campaignId: campaign?.id ?? "",
    campaignStatus,
  };
}
