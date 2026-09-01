import type { Alert } from "../types";
import { allLocations, getClient } from "./clients";
import { REVIEW_REQUESTS } from "./reviewflow-requests";
import { rngFor, randInt } from "./rng";

function generate(): Alert[] {
  const alerts: Alert[] = [];
  let n = 0;
  for (const loc of allLocations()) {
    const client = getClient(loc.clientId);
    if (!client) continue;
    const locationRequests = REVIEW_REQUESTS.filter((r) => r.locationId === loc.id);
    const waitingComplaints = locationRequests.filter((r) => r.feedbackText?.toLowerCase().includes("wait")).length;
    const rng = rngFor(`repalert-${loc.id}`);
    const createdAt = new Date(Date.now() - randInt(rng, 30, 4000) * 60000).toISOString();

    if (waitingComplaints >= 2) {
      const prevRating = Math.min(5, Math.round((loc.rating + 0.2) * 10) / 10);
      n += 1;
      alerts.push({
        id: `repalert-${n}`,
        tone: "critical",
        title: `Rating dropped at ${loc.name}`,
        detail: `${client.name} — ${loc.name}: ${prevRating.toFixed(1)} → ${loc.rating.toFixed(1)}. ${waitingComplaints} negative feedback entries mention waiting time this month.`,
        clientId: client.id,
        locationId: loc.id,
        module: "reputation",
        createdAt,
      });
    }

    const sameClientAvgVelocity = client.locations.length > 1
      ? client.locations.filter((l) => l.id !== loc.id).reduce((a, l) => a + Math.max(0, l.reviewDelta30d), 0) / (client.locations.length - 1)
      : 0;
    if (sameClientAvgVelocity > 0 && loc.reviewDelta30d < sameClientAvgVelocity * 0.5 - 10) {
      n += 1;
      alerts.push({
        id: `repalert-${n}`,
        tone: "attention",
        title: "Review velocity drop",
        detail: `${client.name} — ${loc.name} is generating reviews well below this client's other locations.`,
        clientId: client.id,
        locationId: loc.id,
        module: "reputation",
        createdAt,
      });
    }
  }
  return alerts;
}

export const REPUTATION_ALERTS: Alert[] = generate();
