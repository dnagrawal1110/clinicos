import type { Location } from "../types";
import { getCompetitors } from "./location-detail";
import { REVIEW_CAMPAIGNS, campaignConversionRate } from "./operations";
import { getReviewsForLocation } from "./google-reviews";
import { REVIEW_REQUESTS } from "./reviewflow-requests";
import { getClient } from "./clients";

export interface ReputationHealth {
  overall: number;
  breakdown: { label: string; score: number }[];
}

function clamp(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)));
}

export function computeReputationHealth(location: Location): ReputationHealth {
  const ratingScore = clamp(((location.rating - 3) / 2) * 100);
  const volumeScore = clamp((location.reviewCount / 12));
  const velocityScore = clamp(60 + location.reviewDelta30d);
  const recentActivityScore = location.postsActive ? clamp(75 + location.reviewDelta30d / 4) : clamp(35);

  const reviews = getReviewsForLocation(location.id);
  const responded = reviews.filter((r) => r.responseStatus === "responded").length;
  const responseRateScore = reviews.length ? clamp((responded / reviews.length) * 100) : 50;

  const feedbackHealthScore = location.scores.reputation;

  const client = getClient(location.clientId);
  const siblingAvg = client && client.locations.length > 1
    ? client.locations.filter((l) => l.id !== location.id).reduce((a, l) => a + l.healthOverall, 0) / (client.locations.length - 1)
    : location.healthOverall;
  const consistencyScore = clamp(100 - Math.abs(location.healthOverall - siblingAvg) * 2);

  const competitors = getCompetitors(location);
  const you = competitors[0];
  const rivalAvg = competitors.slice(1).reduce((a, c) => a + c.localVisibility, 0) / Math.max(1, competitors.length - 1);
  const competitorGapScore = clamp(100 - Math.max(0, rivalAvg - you.localVisibility) * 1.5);

  const breakdown = [
    { label: "Rating", score: ratingScore },
    { label: "Review volume", score: volumeScore },
    { label: "Review velocity", score: velocityScore },
    { label: "Recent activity", score: recentActivityScore },
    { label: "Response rate", score: responseRateScore },
    { label: "Feedback health", score: feedbackHealthScore },
    { label: "Location consistency", score: consistencyScore },
    { label: "Competitor gap", score: competitorGapScore },
  ];
  const overall = Math.round(breakdown.reduce((a, b) => a + b.score, 0) / breakdown.length);
  return { overall, breakdown };
}

export interface DiagnosisLine {
  text: string;
}

export function getReputationDiagnosis(location: Location): { diagnosis: string[]; actions: string[] } {
  const client = getClient(location.clientId);
  const siblingLocations = client ? client.locations.filter((l) => l.id !== location.id) : [];
  const siblingVelocityAvg = siblingLocations.length
    ? siblingLocations.reduce((a, l) => a + Math.max(0, l.reviewDelta30d), 0) / siblingLocations.length
    : 0;
  const velocityGapPct = siblingVelocityAvg > 0 ? Math.round(((siblingVelocityAvg - Math.max(0, location.reviewDelta30d)) / siblingVelocityAvg) * 100) : 0;

  const campaign = REVIEW_CAMPAIGNS.find((c) => c.locationId === location.id);
  const conversion = campaign ? campaignConversionRate(campaign) : 0;

  const requests = REVIEW_REQUESTS.filter((r) => r.locationId === location.id);
  const waitingComplaints = requests.filter((r) => r.feedbackText?.toLowerCase().includes("wait")).length;
  const totalNegative = requests.filter((r) => r.sentiment === "negative" || r.sentiment === "needs-attention").length;
  const waitingPct = totalNegative > 0 ? Math.round((waitingComplaints / Math.max(1, requests.filter((r) => r.feedbackText).length)) * 100) : 0;

  const competitors = getCompetitors(location);
  const you = competitors[0];
  const rivalAvgVelocity = competitors.slice(1).reduce((a, c) => a + c.reviewVelocity, 0) / Math.max(1, competitors.length - 1);
  const competitorRatio = you.reviewVelocity > 0 ? Math.round((rivalAvgVelocity / you.reviewVelocity) * 10) / 10 : 0;

  const diagnosis: string[] = [];
  if (velocityGapPct > 10) diagnosis.push(`Review velocity is ${velocityGapPct}% below this client's other locations.`);
  if (conversion < 45 && campaign) diagnosis.push(`Conversion from request → public review is low at ${conversion}%.`);
  if (waitingPct > 15) diagnosis.push(`Waiting-time complaints appear in ${waitingPct}% of recent negative feedback.`);
  if (competitorRatio > 1.3) diagnosis.push(`Competitors generated ${competitorRatio}× more recent reviews.`);
  if (diagnosis.length === 0) diagnosis.push(`${location.name} is performing in line with expectations across tracked reputation signals.`);

  const actions: string[] = [];
  if (!campaign || campaign.status !== "active") actions.push("Launch review campaign");
  if (conversion < 45) actions.push("Improve follow-up workflow");
  if (waitingPct > 15) actions.push("Create waiting-time task");
  if (velocityGapPct > 10) actions.push("Increase request coverage");
  if (actions.length === 0) actions.push("Maintain current review campaign cadence");

  return { diagnosis: diagnosis.slice(0, 4), actions: actions.slice(0, 4) };
}
