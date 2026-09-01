import { redirect, notFound } from "next/navigation";
import { getLocation } from "@/lib/mock/clients";

// Legacy URL kept for backward compatibility — redirects to the canonical
// slug-based /review/:slug route.
export default async function LegacyReviewFlowPage({ params }: { params: Promise<{ locationId: string }> }) {
  const { locationId } = await params;
  const location = getLocation(locationId);
  if (!location) notFound();
  redirect(`/review/${location.slug}`);
}
