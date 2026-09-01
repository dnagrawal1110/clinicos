"use client";

// RUN SYSTEM HEALTH CHECK (section 17) — walks every location and produces
// the portfolio-wide summary.
import { getLocationIntegrationStatus, overallStatusForLocation } from "./connection-health";
import type { SystemHealthCheckResult } from "./types";
import type { Location } from "@/lib/types";

export function runSystemHealthCheck(locations: Location[]): SystemHealthCheckResult {
  const perLocation = locations.map((loc) => {
    const status = getLocationIntegrationStatus(loc);
    const overall = overallStatusForLocation(status);
    const issues: string[] = [];
    if (status.statuses.google === "needs-authorization") issues.push("Google not authorized");
    if (status.statuses.google === "disconnected") issues.push("Google not mapped");
    if (overall === "error") issues.push("One or more integrations reporting an error");
    return { locationId: loc.id, status: overall, issues };
  });

  return {
    totalLocations: locations.length,
    connected: perLocation.filter((l) => l.status === "connected").length,
    partial: perLocation.filter((l) => l.status === "partially-connected").length,
    errors: perLocation.filter((l) => l.status === "error").length,
    unmapped: perLocation.filter((l) => l.status === "disconnected").length,
    needsAttention: perLocation.filter((l) => l.status === "needs-authorization" || l.status === "error").length,
    perLocation,
  };
}
