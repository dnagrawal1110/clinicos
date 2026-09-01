import { getReviewFlowConfig } from "@/lib/reviewflow-config";
import { ReviewFlowExperience } from "@/components/reviewflow/ReviewFlowExperience";
import { PatientErrorState } from "@/components/reviewflow/PatientErrorState";
import { track } from "@/lib/analytics";

export default async function ReviewPage({
  params, searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ simulate?: string }>;
}) {
  const { slug } = await params;
  const { simulate } = await searchParams;
  const config = getReviewFlowConfig(slug);

  if (!config) {
    track("campaign_failed", { properties: { reason: "invalid-link", slug } });
    return <PatientErrorState kind="invalid-link" />;
  }
  if (simulate === "expired") return <PatientErrorState kind="expired" />;
  if (simulate === "location-unavailable") return <PatientErrorState kind="location-unavailable" />;
  if (config.campaignStatus === "paused") {
    track("campaign_failed", { locationId: config.locationId, campaignId: config.campaignId, properties: { reason: "paused" } });
    return <PatientErrorState kind="paused" />;
  }

  return <ReviewFlowExperience config={config} simulate={simulate} />;
}
