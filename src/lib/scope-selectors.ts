import type { Scope } from "./scope-context";
import type { Client, Location, ModuleScores, Task, ApprovalItem, ContentItem, Lead, AdCampaign, ReviewCampaign, Alert, Insight, ReviewRequest, GoogleReviewItem, ReviewProgram, ReviewDestination, MessageTemplate, AuditLogEntry } from "./types";
import { ALL_CLIENTS, getClient, getLocation, allLocations } from "./mock/clients";
import { TASKS, APPROVALS, CONTENT_ITEMS, LEADS, AD_CAMPAIGNS, REVIEW_CAMPAIGNS, ALERTS, PRIORITY_INSIGHTS } from "./mock/operations";
import { REPUTATION_ALERTS } from "./mock/reputation-alerts";
import { REVIEW_REQUESTS } from "./mock/reviewflow-requests";
import { GOOGLE_REVIEWS } from "./mock/google-reviews";
import { REVIEW_PROGRAMS, REVIEW_DESTINATIONS, DESTINATION_TASKS } from "./mock/review-programs";
import { MESSAGE_TEMPLATES } from "./mock/message-library";
import { getReviewCompletion, getCustomCampaigns, getCustomTasks, getAuditLog, getCampaignStatusOverrides, getCustomMessageTemplates, getArchivedTemplateIds, getPublishedReviewResponses } from "./runtime-store";

export const ALL_ALERTS: Alert[] = [...ALERTS, ...REPUTATION_ALERTS].sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
export const ALL_TASKS_BASE: Task[] = [...TASKS, ...DESTINATION_TASKS];

// Applies any live ReviewFlow completions on top of a location's base stats —
// this is how the standalone patient app "updates" the agency dashboard.
export function getAdjustedReviewStats(location: Location) {
  const delta = getReviewCompletion(location.id);
  if (!delta.count) return { reviewCount: location.reviewCount, reviewsThisMonth: location.reviewsThisMonth, rating: location.rating };
  const reviewCount = location.reviewCount + delta.count;
  const rating = Math.round(((location.rating * location.reviewCount + delta.ratingSum) / reviewCount) * 10) / 10;
  return { reviewCount, reviewsThisMonth: location.reviewsThisMonth + delta.count, rating };
}

// ---------------------------------------------------------------------------
// Core scope resolution
// ---------------------------------------------------------------------------

export function getScopedClients(scope: Scope): Client[] {
  if (scope.type === "all") return ALL_CLIENTS;
  const client = getClient(scope.clientId);
  return client ? [client] : [];
}

export function getScopedLocations(scope: Scope): Location[] {
  if (scope.type === "all") return allLocations();
  if (scope.type === "client") return getClient(scope.clientId)?.locations ?? [];
  const loc = getLocation(scope.locationId);
  return loc ? [loc] : [];
}

export function getPrimaryClient(scope: Scope): Client | undefined {
  if (scope.type === "all") return undefined;
  return getClient(scope.clientId);
}

export function getPrimaryLocation(scope: Scope): Location | undefined {
  if (scope.type !== "location") return undefined;
  return getLocation(scope.locationId);
}

// True when `clientId`/`locationId` falls within `scope`. Client-level records
// (no locationId) still match a location scope if they belong to that location's client.
export function matchesScope(scope: Scope, clientId: string, locationId?: string): boolean {
  if (scope.type === "all") return true;
  if (scope.type === "client") return clientId === scope.clientId;
  if (locationId) return locationId === scope.locationId;
  return clientId === scope.clientId;
}

export interface ScopeMeta {
  title: string;
  depth: "all" | "client" | "location";
  crumbs: { label: string; href?: string }[];
  client?: Client;
  location?: Location;
}

export function getScopeMeta(scope: Scope): ScopeMeta {
  if (scope.type === "all") {
    return { title: "All Clients", depth: "all", crumbs: [{ label: "All Clients" }] };
  }
  const client = getClient(scope.clientId);
  if (!client) return { title: "All Clients", depth: "all", crumbs: [{ label: "All Clients" }] };
  if (scope.type === "client") {
    return {
      title: client.name,
      depth: "client",
      client,
      crumbs: [{ label: "All Clients", href: "/clients" }, { label: client.name, href: `/clients/${client.id}` }],
    };
  }
  const location = client.locations.find((l) => l.id === scope.locationId);
  if (!location) {
    return { title: client.name, depth: "client", client, crumbs: [{ label: "All Clients", href: "/clients" }, { label: client.name }] };
  }
  return {
    title: `${client.name} / ${location.name}`,
    depth: "location",
    client,
    location,
    crumbs: [
      { label: "All Clients", href: "/clients" },
      { label: client.name, href: `/clients/${client.id}` },
      { label: location.name, href: `/clients/${client.id}/locations/${location.id}` },
    ],
  };
}

// ---------------------------------------------------------------------------
// Aggregation
// ---------------------------------------------------------------------------

export interface AggregateHealth {
  scores: ModuleScores;
  healthOverall: number;
  ratingAvg: number;
  reviewsTotal: number;
  reviewsThisMonth: number;
  connectedGoogle: number;
  locationCount: number;
  leadsTotal: number;
  adSpendTotal: number;
}

const EMPTY_SCORES: ModuleScores = { google: 0, reputation: 0, website: 0, content: 0, social: 0, ads: 0, leads: 0 };

export function aggregateLocations(locations: Location[]): AggregateHealth {
  if (!locations.length) {
    return { scores: EMPTY_SCORES, healthOverall: 0, ratingAvg: 0, reviewsTotal: 0, reviewsThisMonth: 0, connectedGoogle: 0, locationCount: 0, leadsTotal: 0, adSpendTotal: 0 };
  }
  const n = locations.length;
  const avg = (key: keyof ModuleScores) => Math.round(locations.reduce((a, l) => a + l.scores[key], 0) / n);
  const scores: ModuleScores = { google: avg("google"), reputation: avg("reputation"), website: avg("website"), content: avg("content"), social: avg("social"), ads: avg("ads"), leads: avg("leads") };
  const adjusted = locations.map((l) => getAdjustedReviewStats(l));
  return {
    scores,
    healthOverall: Math.round(locations.reduce((a, l) => a + l.healthOverall, 0) / n),
    ratingAvg: Math.round((adjusted.reduce((a, s) => a + s.rating, 0) / n) * 10) / 10,
    reviewsTotal: adjusted.reduce((a, s) => a + s.reviewCount, 0),
    reviewsThisMonth: adjusted.reduce((a, s) => a + s.reviewsThisMonth, 0),
    connectedGoogle: locations.filter((l) => l.googleConnected).length,
    locationCount: n,
    leadsTotal: locations.reduce((a, l) => a + l.leadsThisMonth, 0),
    adSpendTotal: locations.reduce((a, l) => a + l.adSpendThisMonth, 0),
  };
}

// ---------------------------------------------------------------------------
// Scoped KPI (Command Center + module headers)
// ---------------------------------------------------------------------------

export function getScopedKpi(scope: Scope) {
  const locations = getScopedLocations(scope);
  const clients = getScopedClients(scope);
  const agg = aggregateLocations(locations);
  const tasks = getScopedTasks(scope);
  const campaigns = getScopedCampaigns(scope);
  return {
    clientCount: clients.length,
    locationCount: locations.length,
    connectedGoogle: agg.connectedGoogle,
    reviewsThisMonth: agg.reviewsThisMonth,
    activeCampaigns: campaigns.filter((c) => c.status === "active").length + getScopedAds(scope).filter((a) => a.status === "active").length,
    openTasks: tasks.filter((t) => t.status === "open" || t.status === "in-progress").length,
    healthOverall: agg.healthOverall,
    scores: agg.scores,
    ratingAvg: agg.ratingAvg,
    leadsTotal: agg.leadsTotal,
    adSpendTotal: agg.adSpendTotal,
  };
}

// ---------------------------------------------------------------------------
// Per-module scoped selectors
// ---------------------------------------------------------------------------

export function getScopedTasks(scope: Scope): Task[] {
  const all = [...getCustomTasks(), ...ALL_TASKS_BASE];
  return all.filter((t) => matchesScope(scope, t.clientId, t.locationId));
}

export function getScopedApprovals(scope: Scope): ApprovalItem[] {
  return APPROVALS.filter((a) => matchesScope(scope, a.clientId, a.locationId));
}

export function getScopedContent(scope: Scope): ContentItem[] {
  return CONTENT_ITEMS.filter((c) => matchesScope(scope, c.clientId, c.locationId));
}

export function getScopedLeads(scope: Scope): Lead[] {
  return LEADS.filter((l) => matchesScope(scope, l.clientId, l.locationId));
}

export function getScopedAds(scope: Scope): AdCampaign[] {
  return AD_CAMPAIGNS.filter((a) => matchesScope(scope, a.clientId, a.locationId));
}

export function getScopedCampaigns(scope: Scope): ReviewCampaign[] {
  const overrides = getCampaignStatusOverrides();
  const all = [...getCustomCampaigns(), ...REVIEW_CAMPAIGNS].map((c) =>
    overrides[c.id] ? { ...c, status: overrides[c.id] } : c
  );
  return all.filter((c) => matchesScope(scope, c.clientId, c.locationId));
}

export function getScopedPrograms(scope: Scope): ReviewProgram[] {
  return REVIEW_PROGRAMS.filter((p) => matchesScope(scope, p.clientId, p.locationId));
}

export function getScopedDestinations(scope: Scope): ReviewDestination[] {
  return REVIEW_DESTINATIONS.filter((d) => matchesScope(scope, d.clientId, d.locationId));
}

export function getScopedMessageTemplates(): MessageTemplate[] {
  const archived = getArchivedTemplateIds();
  const all = [...getCustomMessageTemplates(), ...MESSAGE_TEMPLATES];
  return all.map((t) => (archived.has(t.id) ? { ...t, status: "archived" as const } : t));
}

export function getScopedAuditLog(scope: Scope): AuditLogEntry[] {
  return getAuditLog().filter((a) => matchesScope(scope, a.clientId ?? "", a.locationId));
}

export function getScopedRequests(scope: Scope): ReviewRequest[] {
  return REVIEW_REQUESTS.filter((r) => matchesScope(scope, r.clientId, r.locationId));
}

export function getScopedGoogleReviews(scope: Scope): GoogleReviewItem[] {
  const published = getPublishedReviewResponses();
  return GOOGLE_REVIEWS
    .filter((r) => matchesScope(scope, r.clientId, r.locationId))
    .map((r) => (published[r.id] ? { ...r, responseStatus: "responded" as const, publishedResponse: published[r.id] } : r));
}

export function getScopedAlerts(scope: Scope): Alert[] {
  return ALL_ALERTS.filter((a) => matchesScope(scope, a.clientId ?? "", a.locationId));
}

export function getScopedInsights(scope: Scope): Insight[] {
  if (scope.type === "all") return PRIORITY_INSIGHTS;
  if (scope.type === "client") {
    return PRIORITY_INSIGHTS
      .filter((i) => i.clientId === scope.clientId || (i.affectedLocationIds ?? []).some((id) => id.startsWith(scope.clientId + "__")))
      .map((i) => {
        const ids = (i.affectedLocationIds ?? []).filter((id) => id.startsWith(scope.clientId + "__"));
        return { ...i, affectedLocationIds: ids, affected: ids.map((id) => getLocation(id)).filter((l): l is Location => !!l).map((l) => `${getClient(l.clientId)?.name} — ${l.name}`) };
      });
  }
  return PRIORITY_INSIGHTS
    .filter((i) => (i.affectedLocationIds ?? []).includes(scope.locationId))
    .map((i) => ({ ...i, affectedLocationIds: [scope.locationId], affected: [scope.locationId].map((id) => getLocation(id)).filter((l): l is Location => !!l).map((l) => `${getClient(l.clientId)?.name} — ${l.name}`) }));
}
