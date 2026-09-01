import type { Scope } from "../scope-context";
import { getScopedLocations, getScopedCampaigns, getScopedGoogleReviews, getScopedDestinations } from "../scope-selectors";
import { getClient } from "./clients";

export type WorkQueuePriority = "critical" | "high" | "medium" | "low";

export interface WorkQueueItem {
  id: string;
  priority: WorkQueuePriority;
  title: string;
  detail: string;
  count: number;
  href: string;
}

const SLA_HOURS = 48;

// The daily operating queue (section 49) — computed from real underlying
// data, not placeholder counts. Each item links to where the work happens.
export function getWorkQueue(scope: Scope): WorkQueueItem[] {
  const locations = getScopedLocations(scope);
  const campaigns = getScopedCampaigns(scope);
  const reviews = getScopedGoogleReviews(scope);
  const destinations = getScopedDestinations(scope);
  const items: WorkQueueItem[] = [];

  const overdue = reviews.filter((r) => r.responseStatus !== "responded" && (Date.now() - +new Date(r.date)) / 3600000 > SLA_HOURS);
  if (overdue.length) {
    items.push({ id: "overdue-responses", priority: "critical", title: `${overdue.length} review response${overdue.length !== 1 ? "s" : ""} overdue`, detail: `Past the ${SLA_HOURS}-hour response SLA`, count: overdue.length, href: "/reputation?tab=google" });
  }

  const disconnected = destinations.filter((d) => d.type === "google" && d.status !== "connected");
  if (disconnected.length) {
    items.push({ id: "disconnected-destinations", priority: "critical", title: `${disconnected.length} location${disconnected.length !== 1 ? "s" : ""} have disconnected destinations`, detail: "Google review link is broken for patients", count: disconnected.length, href: "/reputation?tab=settings" });
  }

  const decliningVelocity = locations.filter((l) => l.reviewDelta30d < -25);
  if (decliningVelocity.length) {
    items.push({ id: "declining-velocity", priority: "high", title: `${decliningVelocity.length} location${decliningVelocity.length !== 1 ? "s" : ""} have falling review velocity`, detail: "Review requests are going out but conversion has dropped", count: decliningVelocity.length, href: "/reputation?tab=overview" });
  }

  const stalledCampaigns = campaigns.filter((c) => c.status === "active" && c.requestsSent > 40 && c.feedbackReceived === 0);
  const pausedNeedingReview = campaigns.filter((c) => c.status === "paused");
  const attentionCampaigns = stalledCampaigns.length + pausedNeedingReview.length;
  if (attentionCampaigns) {
    items.push({ id: "campaigns-attention", priority: "medium", title: `${attentionCampaigns} campaign${attentionCampaigns !== 1 ? "s" : ""} need attention`, detail: `${stalledCampaigns.length} stalled · ${pausedNeedingReview.length} paused`, count: attentionCampaigns, href: "/reputation?tab=campaigns" });
  }

  const positiveAwaiting = reviews.filter((r) => r.responseStatus === "pending" && r.sentiment === "positive");
  if (positiveAwaiting.length) {
    items.push({ id: "positive-awaiting", priority: "low", title: `${positiveAwaiting.length} positive review${positiveAwaiting.length !== 1 ? "s" : ""} awaiting a response`, detail: "Quick wins — thank patients while it's top of mind", count: positiveAwaiting.length, href: "/reputation?tab=google" });
  }

  const priorityRank: Record<WorkQueuePriority, number> = { critical: 0, high: 1, medium: 2, low: 3 };
  return items.sort((a, b) => priorityRank[a.priority] - priorityRank[b.priority]);
}

export interface DailyBrief {
  greeting: string;
  totalActions: number;
  critical: number;
  opportunities: number;
  routine: number;
}

function greetingForHour(hour: number): string {
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export function getDailyBrief(scope: Scope, name: string): DailyBrief {
  const items = getWorkQueue(scope);
  const critical = items.filter((i) => i.priority === "critical" || i.priority === "high").reduce((a, i) => a + i.count, 0);
  const opportunities = items.filter((i) => i.priority === "low").reduce((a, i) => a + i.count, 0);
  const routine = items.filter((i) => i.priority === "medium").reduce((a, i) => a + i.count, 0);
  return {
    greeting: `${greetingForHour(new Date().getHours())}, ${name}.`,
    totalActions: critical + opportunities + routine,
    critical, opportunities, routine,
  };
}

// Account Manager working view (section 48).
export function getLocationsForManager(managerName: string) {
  return getScopedLocations({ type: "all" }).filter((l) => getClient(l.clientId)?.accountManager === managerName);
}
