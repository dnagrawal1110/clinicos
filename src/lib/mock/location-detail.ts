import type { Location, RankingKeyword, Competitor } from "../types";
import { rngFor, pick, randInt } from "./rng";
import { KEYWORD_INTENTS } from "./pools";
import {
  LOCATION_DIAGNOSES, GOOGLE_AUDIT, GOOGLE_BLOCKERS, RANKINGS, COMPETITORS,
} from "./operations";
import { getClient } from "./clients";

const GENERIC_DIAGNOSIS_TEMPLATES: Array<(l: Location) => string | null> = [
  (l) => (l.reviewDelta30d < -10 ? `Review velocity is down ${Math.abs(l.reviewDelta30d)}% over the last 30 days.` : l.reviewDelta30d > 15 ? `Review velocity is up ${l.reviewDelta30d}% — momentum is strong this month.` : null),
  (l) => (l.scores.google < 65 ? "Google profile completeness and posting cadence are below the portfolio average." : null),
  (l) => (!l.postsActive ? "No Google content has published recently — the posting queue appears stalled." : null),
  (l) => (l.scores.social < 60 ? "Social engagement is trailing behind comparable locations in the same city." : null),
  (l) => (!l.hasAds && l.scores.google > 75 && l.scores.reputation > 70 ? "Strong organic presence with no paid acquisition — a Google Ads opportunity." : null),
  (l) => (l.scores.leads < 55 ? "Lead response and conversion tracking show gaps versus the client's other locations." : null),
  (l) => (!l.googleConnected ? "Google Business Profile is disconnected — no data is syncing for this location." : null),
];

const GENERIC_ACTION_POOL = [
  "Activate review campaign",
  "Schedule 5 Google posts",
  "Add missing services to Google profile",
  "Refresh location page copy",
  "Review competitor positioning",
  "Reconnect Google Business Profile",
  "Audit response time on leads",
  "Publish 3 social posts this week",
];

export function getDiagnosis(location: Location): { diagnosis: string[]; actions: { id: string; label: string }[] } {
  const hand = LOCATION_DIAGNOSES[location.id];
  if (hand) return hand;
  const rng = rngFor(location.id + "-diagnosis");
  const diagnosis = GENERIC_DIAGNOSIS_TEMPLATES.map((t) => t(location)).filter(Boolean) as string[];
  if (diagnosis.length === 0) diagnosis.push(`${location.name} is performing in line with expectations across tracked modules.`);
  const actionCount = randInt(rng, 3, 4);
  const actions = Array.from({ length: actionCount }, (_, i) => ({ id: `gen-${i}`, label: pick(rng, GENERIC_ACTION_POOL) }));
  return { diagnosis: diagnosis.slice(0, 4), actions };
}

export function getGoogleAudit(location: Location) {
  const hand = GOOGLE_AUDIT[location.id];
  if (hand) return hand;
  const rng = rngFor(location.id + "-audit");
  const base = location.scores.google;
  const jitter = () => Math.max(10, Math.min(99, base + randInt(rng, -22, 14)));
  return {
    overall: base,
    breakdown: [
      { label: "Profile completeness", score: jitter() },
      { label: "Category relevance", score: jitter() },
      { label: "Services", score: jitter() },
      { label: "Reviews", score: location.scores.reputation },
      { label: "Review velocity", score: Math.max(10, Math.min(99, 60 + location.reviewDelta30d)) },
      { label: "Content activity", score: location.postsActive ? jitter() : randInt(rng, 20, 45) },
      { label: "Photos", score: jitter() },
      { label: "Local relevance", score: jitter() },
      { label: "Website alignment", score: location.scores.website },
    ],
  };
}

export function getBlockers(location: Location) {
  const hand = GOOGLE_BLOCKERS[location.id];
  if (hand) return hand;
  const rng = rngFor(location.id + "-blockers");
  const audit = getGoogleAudit(location);
  const weakest = [...audit.breakdown].sort((a, b) => a.score - b.score).slice(0, 3);
  return weakest.map((w, i) => ({
    id: `blk-gen-${i}`,
    title: `Low ${w.label.toLowerCase()}`,
    description: `${w.label} scores ${w.score}/100, below the portfolio benchmark for this specialty.`,
    severity: (w.score < 45 ? "critical" : "attention") as "critical" | "attention",
    evidence: `Tracked score: ${w.score}/100 vs. portfolio average.`,
    recommendation: `Prioritize improving ${w.label.toLowerCase()} over the next 2 weeks.`,
    assignee: pick(rng, ["Aman Kulkarni", "Neha Joshi", "Vikas Rao", "Isha Bhatt"]),
    status: "open" as const,
  }));
}

export function getRankings(location: Location): RankingKeyword[] {
  const hand = RANKINGS[location.id];
  if (hand) return hand;
  const client = getClient(location.clientId);
  const rng = rngFor(location.id + "-rankings");
  const intents = [...KEYWORD_INTENTS].sort(() => rng() - 0.5).slice(0, 5);
  const strength = location.scores.google;
  return intents.map((intent) => {
    const base = strength > 80 ? randInt(rng, 1, 6) : strength > 60 ? randInt(rng, 4, 12) : randInt(rng, 8, 24);
    const prevDelta = randInt(rng, -4, 4);
    return {
      keyword: `${intent} ${location.name}`.replace("best dentist in", `best ${client?.specialty.toLowerCase() ?? "clinic"} in`),
      position: base,
      previous: Math.max(1, base + prevDelta),
      locationId: location.id,
    };
  });
}

export function getCompetitors(location: Location): Competitor[] {
  const hand = COMPETITORS[location.id];
  if (hand) return hand;
  const rng = rngFor(location.id + "-competitors");
  const names = ["Regional Chain Clinic", "Neighbourhood Specialist", "City Multi-Speciality"];
  const you: Competitor = {
    name: `${location.name} (You)`,
    reviews: location.reviewCount,
    rating: location.rating,
    reviewVelocity: location.reviewsThisMonth,
    services: location.services,
    photos: location.photos,
    googleActivity: location.postsActive ? randInt(rng, 4, 10) : randInt(rng, 0, 2),
    websiteStrength: location.scores.website,
    localVisibility: location.scores.google,
  };
  const competitors = names.map((n) => ({
    name: n,
    reviews: Math.round(location.reviewCount * randInt(rng, 90, 220) / 100),
    rating: Math.min(5, Math.round((location.rating + randInt(rng, -3, 4) / 10) * 10) / 10),
    reviewVelocity: Math.round(location.reviewsThisMonth * randInt(rng, 80, 260) / 100),
    services: location.services + randInt(rng, -4, 8),
    photos: location.photos + randInt(rng, -20, 60),
    googleActivity: randInt(rng, 2, 12),
    websiteStrength: Math.min(99, Math.max(20, location.scores.website + randInt(rng, -15, 20))),
    localVisibility: Math.min(99, Math.max(20, location.scores.google + randInt(rng, -10, 20))),
  }));
  return [you, ...competitors];
}
