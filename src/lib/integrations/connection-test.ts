"use client";

// The "[Test Connection]" button (section 16). In Demo Workspace this
// clearly labels itself as a simulated check — it never claims to have
// contacted a real API. In Live Agency Workspace, with nothing connected
// yet, it reports exactly why the test can't run (needs authorization)
// rather than fabricating a pass.
import { getWorkspaceMode } from "@/lib/runtime-store";
import { getClient } from "@/lib/mock/clients";
import type { Location } from "@/lib/types";
import type { ConnectionTestResult, IntegrationKind } from "./types";
import { getLocationIntegrationStatus } from "./connection-health";

export async function testConnection(location: Location, integration: IntegrationKind): Promise<ConnectionTestResult> {
  const mode = getWorkspaceMode();
  const status = getLocationIntegrationStatus(location).statuses[integration];
  const client = getClient(location.clientId);

  if (mode === "live" || status === "needs-authorization" || status === "disconnected") {
    return {
      integration,
      passed: false,
      checks: [{ label: "Authentication", passed: false, detail: "Not connected — complete OAuth for this client before testing." }],
    };
  }

  // Demo Workspace, mock status — return the specific checks section 16's
  // example calls for, built from real (if fictional) location data so the
  // numbers are at least internally consistent with the rest of the app.
  switch (integration) {
    case "google":
      return {
        integration, passed: true,
        checks: [
          { label: "Authentication valid", passed: true, detail: "Mock — no real Google account contacted" },
          { label: `${client?.locations.length ?? 1} location${(client?.locations.length ?? 1) !== 1 ? "s" : ""} accessible`, passed: true },
          { label: `${location.name} mapped`, passed: true },
          { label: `${location.reviewCount} reviews accessible`, passed: true },
          { label: "Profile data accessible", passed: true },
        ],
      };
    case "instagram":
    case "facebook":
      return {
        integration, passed: true,
        checks: [
          { label: "Authentication valid", passed: true, detail: "Mock — no real account contacted" },
          { label: "Profile discovered", passed: true },
          { label: "Recent posts accessible", passed: true },
        ],
      };
    case "whatsapp":
      return {
        integration, passed: true,
        checks: [
          { label: "Phone number verified", passed: true, detail: "Mock — sandbox only" },
          { label: "Message templates available", passed: true },
          { label: "Test message delivered (sandbox)", passed: true },
        ],
      };
    case "google-ads":
    case "meta-ads":
      return {
        integration, passed: true,
        checks: [
          { label: "Account accessible", passed: true, detail: "Mock — no real ad account contacted" },
          { label: "Campaigns visible", passed: location.hasAds },
          { label: "Spend data accessible", passed: location.hasAds },
        ],
      };
    case "website":
      return {
        integration, passed: true,
        checks: [
          { label: "URL reachable", passed: true, detail: "Mock — no real crawl performed" },
          { label: "Technical audit available", passed: true },
        ],
      };
  }
}
