import type { Location, ProgramHealthBreakdown, ProgramStatus, ReviewDestination, ReviewProgram, Task } from "../types";
import { rngFor, randInt } from "./rng";
import { allLocations, getClient } from "./clients";
import { REVIEW_CAMPAIGNS } from "./operations";
import { getReviewsForLocation } from "./google-reviews";
import { teamForModule } from "./pools";

function clamp(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)));
}

// ---------------------------------------------------------------------------
// Destinations — one primary Google destination per location, occasionally a
// secondary Facebook destination for larger multi-channel locations.
// ---------------------------------------------------------------------------

function destinationStatusFor(location: Location, rng: () => number): ReviewDestination["status"] {
  if (!location.googleConnected) return rng() > 0.5 ? "disconnected" : "invalid";
  if (rng() > 0.97) return "unavailable";
  return "connected";
}

function buildDestinations(): ReviewDestination[] {
  const destinations: ReviewDestination[] = [];
  let n = 0;
  for (const location of allLocations()) {
    const rng = rngFor(`dest-${location.id}`);
    n += 1;
    destinations.push({
      id: `dest-${n}`,
      clientId: location.clientId,
      locationId: location.id,
      type: "google",
      name: "Google Business Profile",
      url: `https://search.google.com/local/writereview?placeid=mock-${location.id}`,
      status: destinationStatusFor(location, rng),
      priority: 1,
      enabled: true,
    });
    if (location.reviewCount > 500 && rng() > 0.55) {
      n += 1;
      destinations.push({
        id: `dest-${n}`,
        clientId: location.clientId,
        locationId: location.id,
        type: "facebook",
        name: "Facebook Page",
        url: `https://facebook.com/mock-${location.id}/reviews`,
        status: rng() > 0.15 ? "connected" : "not-configured",
        priority: 2,
        enabled: rng() > 0.3,
      });
    }
  }
  return destinations;
}

export const REVIEW_DESTINATIONS: ReviewDestination[] = buildDestinations();

export function getDestinationsForLocation(locationId: string): ReviewDestination[] {
  return REVIEW_DESTINATIONS.filter((d) => d.locationId === locationId);
}

export function getPrimaryDestination(locationId: string): ReviewDestination | undefined {
  return getDestinationsForLocation(locationId).sort((a, b) => a.priority - b.priority)[0];
}

// ---------------------------------------------------------------------------
// Review Programs — one per location, tying together destination + campaigns
// + automation state, with a section-3 status the agency can scan at a glance.
// ---------------------------------------------------------------------------

function programStatusFor(location: Location, campaigns: typeof REVIEW_CAMPAIGNS, destination: ReviewDestination | undefined, rng: () => number): ProgramStatus {
  const client = getClient(location.clientId);
  if (client?.status === "paused" && rng() > 0.4) return "archived";
  if (!destination || destination.status !== "connected") return "disconnected";
  if (campaigns.length === 0) return "setup-required";
  if (location.status === "paused" || campaigns.every((c) => c.status !== "active")) return "paused";
  if (location.healthOverall < 55 || location.reviewDelta30d < -25) return "needs-attention";
  return "active";
}

function buildPrograms(): ReviewProgram[] {
  const programs: ReviewProgram[] = [];
  let n = 0;
  for (const location of allLocations()) {
    const campaigns = REVIEW_CAMPAIGNS.filter((c) => c.locationId === location.id);
    const destination = getPrimaryDestination(location.id);
    const rng = rngFor(`program-${location.id}`);
    n += 1;
    programs.push({
      id: `prog-${n}`,
      clientId: location.clientId,
      locationId: location.id,
      name: `${location.name} Reputation Program`,
      status: programStatusFor(location, campaigns, destination, rng),
      destinationId: destination?.id ?? "",
      campaignIds: campaigns.map((c) => c.id),
      automationEnabled: campaigns.some((c) => c.status === "active") && rng() > 0.15,
      createdAt: location.lastActivity,
    });
  }
  return programs;
}

export const REVIEW_PROGRAMS: ReviewProgram[] = buildPrograms();

export function getProgramForLocation(locationId: string): ReviewProgram | undefined {
  return REVIEW_PROGRAMS.find((p) => p.locationId === locationId);
}

export const PROGRAM_STATUS_LABEL: Record<ProgramStatus, string> = {
  "setup-required": "Setup Required",
  active: "Active",
  paused: "Paused",
  "needs-attention": "Needs Attention",
  disconnected: "Disconnected",
  archived: "Archived",
};

// ---------------------------------------------------------------------------
// Program Health (section 4) — 7 named components, computed from real
// underlying campaign/request/review data for that location.
// ---------------------------------------------------------------------------

export function computeProgramHealth(location: Location): { overall: number; breakdown: ProgramHealthBreakdown } {
  const destination = getPrimaryDestination(location.id);
  const campaigns = REVIEW_CAMPAIGNS.filter((c) => c.locationId === location.id);
  const totalSent = campaigns.reduce((a, c) => a + c.requestsSent, 0);
  const totalOpened = campaigns.reduce((a, c) => a + c.opened, 0);
  const totalFeedback = campaigns.reduce((a, c) => a + c.feedbackReceived, 0);
  const totalReviews = campaigns.reduce((a, c) => a + c.reviewsGenerated, 0);

  const destinationScore = !destination
    ? 0
    : destination.status === "connected" ? 100
    : destination.status === "unavailable" ? 55
    : destination.status === "not-configured" ? 35
    : 15;

  const campaignActivity = campaigns.length
    ? clamp((campaigns.filter((c) => c.status === "active").length / campaigns.length) * 100)
    : 30;

  const requestDelivery = totalSent ? clamp((totalOpened / totalSent) * 100) : 50;
  const feedbackConversion = totalOpened ? clamp((totalFeedback / totalOpened) * 100) : 50;
  const reviewConversion = totalFeedback ? clamp((totalReviews / totalFeedback) * 100) : 50;
  const reviewVelocity = clamp(60 + location.reviewDelta30d);

  const reviews = getReviewsForLocation(location.id);
  const responded = reviews.filter((r) => r.responseStatus === "responded").length;
  const responseRate = reviews.length ? clamp((responded / reviews.length) * 100) : 60;

  const breakdown: ProgramHealthBreakdown = {
    destination: destinationScore,
    campaignActivity,
    requestDelivery,
    feedbackConversion,
    reviewConversion,
    reviewVelocity,
    responseRate,
  };
  const overall = clamp(Object.values(breakdown).reduce((a, b) => a + b, 0) / Object.values(breakdown).length);
  return { overall, breakdown };
}

export const PROGRAM_HEALTH_LABELS: Record<keyof ProgramHealthBreakdown, string> = {
  destination: "Destination",
  campaignActivity: "Campaign Activity",
  requestDelivery: "Request Delivery",
  feedbackConversion: "Feedback Conversion",
  reviewConversion: "Review Conversion",
  reviewVelocity: "Review Velocity",
  responseRate: "Response Rate",
};

// ---------------------------------------------------------------------------
// Destination-health auto-tasks (section 36) — "Reconnect Google review
// destination" gets created automatically the same way other auto-tasks do.
// ---------------------------------------------------------------------------

export function generateDestinationTasks(): Task[] {
  const tasks: Task[] = [];
  let n = 0;
  for (const destination of REVIEW_DESTINATIONS) {
    if (destination.status === "connected") continue;
    const location = allLocations().find((l) => l.id === destination.locationId);
    const client = location ? getClient(location.clientId) : undefined;
    if (!location || !client) continue;
    const rng = rngFor(`dest-task-${destination.id}`);
    const owner = teamForModule("Google", destination.id);
    n += 1;
    tasks.push({
      id: `dtask-${n}`,
      title: `Reconnect ${destination.name} — ${destination.status} destination`,
      clientId: client.id,
      locationId: location.id,
      doctorId: location.doctorIds[0],
      module: "Reputation",
      priority: destination.type === "google" ? "high" : "medium",
      owner: owner.name,
      ownerTeam: owner.team,
      dueDate: new Date(2026, 8, 1 + randInt(rng, 0, 6)).toISOString(),
      status: "open",
      aiRecommended: true,
      source: "ai-audit",
    });
  }
  return tasks;
}

export const DESTINATION_TASKS: Task[] = generateDestinationTasks();
