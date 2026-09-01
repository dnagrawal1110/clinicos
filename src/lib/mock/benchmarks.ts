import type { Doctor, Location } from "../types";
import { allLocations, getClient } from "./clients";
import { REVIEW_CAMPAIGNS, campaignConversionRate } from "./operations";
import { REVIEW_REQUESTS } from "./reviewflow-requests";
import { GOOGLE_REVIEWS } from "./google-reviews";

export type BenchmarkTier = "above" | "average" | "below";

export interface AgencyBenchmark {
  reviewConversionAvg: number;
  reviewConversionTop10: number;
  velocityAvg: number;
  ratingAvg: number;
}

// Agency-wide benchmark figures (section 18) computed once from the full
// portfolio of campaigns/locations.
export function getAgencyBenchmark(): AgencyBenchmark {
  const conversions = REVIEW_CAMPAIGNS.filter((c) => c.requestsSent > 0).map(campaignConversionRate).sort((a, b) => a - b);
  const avg = conversions.reduce((a, b) => a + b, 0) / Math.max(1, conversions.length);
  const top10 = conversions.slice(Math.floor(conversions.length * 0.9));
  const top10Avg = top10.reduce((a, b) => a + b, 0) / Math.max(1, top10.length);
  const locations = allLocations();
  const velocityAvg = locations.reduce((a, l) => a + Math.max(0, l.reviewDelta30d), 0) / Math.max(1, locations.length);
  const ratingAvg = locations.reduce((a, l) => a + l.rating, 0) / Math.max(1, locations.length);
  return {
    reviewConversionAvg: Math.round(avg * 10) / 10,
    reviewConversionTop10: Math.round(top10Avg * 10) / 10,
    velocityAvg: Math.round(velocityAvg * 10) / 10,
    ratingAvg: Math.round(ratingAvg * 10) / 10,
  };
}

function tierFor(value: number, avg: number): BenchmarkTier {
  if (value >= avg * 1.1) return "above";
  if (value <= avg * 0.9) return "below";
  return "average";
}

export interface LocationBenchmark {
  reviewConversion: number;
  tier: BenchmarkTier;
  agency: AgencyBenchmark;
}

export function getLocationBenchmark(location: Location): LocationBenchmark {
  const campaign = REVIEW_CAMPAIGNS.find((c) => c.locationId === location.id && c.requestsSent > 0);
  const reviewConversion = campaign ? campaignConversionRate(campaign) : 0;
  const agency = getAgencyBenchmark();
  return { reviewConversion, tier: tierFor(reviewConversion, agency.reviewConversionAvg), agency };
}

export interface DoctorBenchmark {
  doctor: Doctor;
  totalRequests: number;
  totalReviews: number;
  averageRating: number;
  velocity: number;
  positiveSentimentShare: number;
  locations: Location[];
  bestLocation?: Location;
  weakestLocation?: Location;
}

// Internal-only doctor performance rollup (section 20) — never surfaced to
// clients and never used to publicly rank doctors against each other.
export function getDoctorBenchmark(doctor: Doctor): DoctorBenchmark {
  const client = getClient(doctor.clientId);
  const locations = (client?.locations ?? []).filter((l) => doctor.locationIds.includes(l.id));
  const requests = REVIEW_REQUESTS.filter((r) => r.doctorId === doctor.id);
  const reviews = GOOGLE_REVIEWS.filter((r) => locations.some((l) => l.id === r.locationId));
  const withRating = requests.filter((r) => r.ratingGiven !== undefined);
  const averageRating = withRating.length
    ? Math.round((withRating.reduce((a, r) => a + (r.ratingGiven ?? 0), 0) / withRating.length) * 10) / 10
    : locations.reduce((a, l) => a + l.rating, 0) / Math.max(1, locations.length);
  const positiveSentimentShare = withRating.length
    ? Math.round((withRating.filter((r) => r.sentiment === "positive").length / withRating.length) * 100)
    : 0;
  const velocity = Math.round(locations.reduce((a, l) => a + l.reviewDelta30d, 0) / Math.max(1, locations.length));
  const sortedByHealth = [...locations].sort((a, b) => b.healthOverall - a.healthOverall);

  return {
    doctor,
    totalRequests: requests.length,
    totalReviews: requests.filter((r) => r.status === "completed").length + reviews.length,
    averageRating,
    velocity,
    positiveSentimentShare,
    locations,
    bestLocation: sortedByHealth[0],
    weakestLocation: sortedByHealth[sortedByHealth.length - 1],
  };
}
