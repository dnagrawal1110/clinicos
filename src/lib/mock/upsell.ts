import type { Client, Opportunity } from "../types";
import { REVIEW_CAMPAIGNS } from "./operations";

export function getGrowthOpportunities(client: Client): Opportunity[] {
  const opportunities: Opportunity[] = [];

  const adsReady = client.locations.filter((l) => l.scores.google > 75 && l.scores.reputation > 70 && !l.hasAds);
  if (adsReady.length > 0) {
    opportunities.push({
      id: `${client.id}-opp-ads`,
      clientId: client.id,
      locationId: adsReady[0].id,
      module: "Ads",
      title: "Google Ads",
      description: `${client.name} has strong organic visibility at ${adsReady.map((l) => l.name).join(", ")} but no active Google Ads campaign.`,
      priority: "high",
    });
  }

  const weakWebsite = [...client.locations].sort((a, b) => a.scores.website - b.scores.website)[0];
  if (weakWebsite && weakWebsite.scores.website < 60) {
    opportunities.push({
      id: `${client.id}-opp-website`,
      clientId: client.id,
      locationId: weakWebsite.id,
      module: "Website",
      title: "Website",
      description: `${weakWebsite.name} location page has poor conversion — website score is ${weakWebsite.scores.website}/100.`,
      priority: weakWebsite.scores.website < 45 ? "high" : "medium",
    });
  }

  const covered = new Set(REVIEW_CAMPAIGNS.filter((c) => c.clientId === client.id && c.status === "active").map((c) => c.locationId));
  const underutilized = client.locations.filter((l) => !covered.has(l.id));
  if (underutilized.length > 0) {
    opportunities.push({
      id: `${client.id}-opp-reputation`,
      clientId: client.id,
      module: "Reputation",
      title: "Reputation",
      description: `Review acquisition is underutilized at ${underutilized.map((l) => l.name).join(", ")} — no active campaign running.`,
      priority: underutilized.length > client.locations.length / 2 ? "high" : "medium",
    });
  }

  const socialGap = client.locations.filter((l) => l.scores.social < 55);
  if (socialGap.length > 0) {
    opportunities.push({
      id: `${client.id}-opp-social`,
      clientId: client.id,
      locationId: socialGap[0].id,
      module: "Social",
      title: "Social",
      description: `Social engagement is trailing at ${socialGap.map((l) => l.name).join(", ")} — consider a content refresh.`,
      priority: "medium",
    });
  }

  return opportunities;
}
