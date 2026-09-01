"use client";

import { useState } from "react";
import Link from "next/link";
import { Activity, CheckCircle2, XCircle, AlertTriangle, ShieldCheck, ShieldAlert, RefreshCw } from "lucide-react";
import type { Scope } from "@/lib/scope-context";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  useRuntimeStore, getWorkspaceMode, setWorkspaceMode, getReadOnlySync, setReadOnlySync,
  getMappingDecisions, setMappingDecision, getIntegrationActivity, logIntegrationActivity,
} from "@/lib/runtime-store";
import { getScopedLocations } from "@/lib/scope-selectors";
import { getClient } from "@/lib/mock/clients";
import { getLocationIntegrationStatus, overallStatusForLocation, countByStatus } from "@/lib/integrations/connection-health";
import { runSystemHealthCheck } from "@/lib/integrations/system-health-check";
import { getMockDiscoveredLocations } from "@/lib/integrations/mock-discovery";
import { suggestMapping, confidenceTier } from "@/lib/integrations/mapping-confidence";
import { INTEGRATION_KINDS, INTEGRATION_LABEL, CONNECTION_STATUS_LABEL, type ConnectionStatus } from "@/lib/integrations/types";
import type { Location } from "@/lib/types";

const STATUS_VARIANT: Record<ConnectionStatus, "success" | "warning" | "critical" | "neutral" | "info"> = {
  connected: "success", mock: "success", "partially-connected": "warning", syncing: "info",
  "needs-authorization": "warning", error: "critical", disconnected: "neutral",
};

// ---------------------------------------------------------------------------
// Workspace / mode banner — shown at the top of every tab (section 20/28).
// ---------------------------------------------------------------------------
export function WorkspaceModeBanner() {
  useRuntimeStore();
  const mode = getWorkspaceMode();
  const readOnly = getReadOnlySync();
  return (
    <Card className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
      <div className="flex items-center gap-2">
        <span className="text-[12px] font-semibold uppercase tracking-wide text-[var(--color-ink-tertiary)]">Workspace</span>
        <div className="flex rounded-full border border-[var(--color-border)] p-0.5">
          <button onClick={() => setWorkspaceMode("demo")} className={`rounded-full px-3 py-1 text-[12px] font-medium ${mode === "demo" ? "bg-[var(--color-ink)] text-white" : "text-[var(--color-ink-secondary)]"}`}>Demo Workspace</button>
          <button onClick={() => setWorkspaceMode("live")} className={`rounded-full px-3 py-1 text-[12px] font-medium ${mode === "live" ? "bg-[var(--color-success-strong)] text-white" : "text-[var(--color-ink-secondary)]"}`}>Live Agency Workspace</button>
        </div>
      </div>
      <Badge variant={mode === "live" ? "success" : "neutral"}>{mode === "live" ? "LIVE DATA" : "DEMO DATA"}</Badge>
      <div className="ml-0 flex items-center gap-2 sm:ml-auto">
        <span className="text-[12px] font-semibold uppercase tracking-wide text-[var(--color-ink-tertiary)]">Sync</span>
        <button
          onClick={() => setReadOnlySync(!readOnly)}
          className="flex items-center gap-1.5 rounded-full border border-[var(--color-border)] px-3 py-1 text-[12px] font-medium text-[var(--color-ink-secondary)] hover:bg-[var(--color-surface-sunken)]"
        >
          {readOnly ? <ShieldCheck className="h-3.5 w-3.5 text-[var(--color-success)]" /> : <ShieldAlert className="h-3.5 w-3.5 text-[var(--color-warning)]" />}
          {readOnly ? "READ ONLY" : "WRITE ENABLED"}
        </button>
      </div>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Overview — Connection Health Center + Run System Health Check
// ---------------------------------------------------------------------------
export function IntegrationsOverviewTab({ scope }: { scope: Scope }) {
  useRuntimeStore();
  const locations = getScopedLocations(scope);
  const counts = countByStatus(locations);
  const [healthCheck, setHealthCheck] = useState<ReturnType<typeof runSystemHealthCheck> | null>(null);
  const [running, setRunning] = useState(false);

  async function runCheck() {
    setRunning(true);
    await new Promise((r) => setTimeout(r, 500));
    const result = runSystemHealthCheck(locations);
    setHealthCheck(result);
    logIntegrationActivity({ actorLabel: "System Health Check", integration: "google", action: "Run system health check", result: "success" });
    setRunning(false);
  }

  return (
    <div className="flex flex-col gap-5">
      <WorkspaceModeBanner />

      <Card>
        <CardHeader>
          <div>
            <CardTitle>Connection Health Center</CardTitle>
            <CardDescription>{locations.length} locations in scope</CardDescription>
          </div>
          <Button variant="primary" size="md" disabled={running} onClick={runCheck}>
            <RefreshCw className={`h-3.5 w-3.5 ${running ? "animate-spin" : ""}`} /> {running ? "Running..." : "Run System Health Check"}
          </Button>
        </CardHeader>
        <div className="grid grid-cols-3 gap-4 px-5 pb-5 sm:grid-cols-7">
          {(Object.keys(counts) as ConnectionStatus[]).map((status) => (
            <div key={status}>
              <div className="text-[19px] font-semibold tabular-nums text-[var(--color-ink)]">{counts[status]}</div>
              <div className="text-[11px] text-[var(--color-ink-tertiary)]">{CONNECTION_STATUS_LABEL[status]}</div>
            </div>
          ))}
        </div>
      </Card>

      {healthCheck && (
        <Card className="overflow-hidden">
          <div className="flex items-center gap-2 border-b border-[var(--color-border)] bg-[linear-gradient(120deg,var(--color-primary-soft)_0%,transparent_70%)] px-5 py-4">
            <Activity className="h-4 w-4 text-[var(--color-primary)]" />
            <CardTitle>System Health Check Result</CardTitle>
          </div>
          <div className="grid grid-cols-3 gap-4 px-5 py-4 sm:grid-cols-6">
            <MiniStat label="Total Locations" value={healthCheck.totalLocations} />
            <MiniStat label="Connected" value={healthCheck.connected} tone="success" />
            <MiniStat label="Partial" value={healthCheck.partial} tone="warning" />
            <MiniStat label="Errors" value={healthCheck.errors} tone="critical" />
            <MiniStat label="Unmapped" value={healthCheck.unmapped} />
            <MiniStat label="Needs Attention" value={healthCheck.needsAttention} tone="warning" />
          </div>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle>Locations</CardTitle></CardHeader>
        <div className="overflow-x-auto px-5 pb-5 pt-2">
          <table className="w-full min-w-[820px] border-collapse text-left">
            <thead>
              <tr className="border-b border-[var(--color-border)] text-[11px] font-semibold uppercase tracking-wide text-[var(--color-ink-tertiary)]">
                <th className="py-2.5 pr-3">Location</th>
                {INTEGRATION_KINDS.map((k) => <th key={k} className="px-2 py-2.5 text-center">{INTEGRATION_LABEL[k].split(" ")[0]}</th>)}
                <th className="py-2.5 pl-3 text-right">Overall</th>
              </tr>
            </thead>
            <tbody>
              {locations.slice(0, 80).map((loc) => {
                const client = getClient(loc.clientId);
                const status = getLocationIntegrationStatus(loc);
                const overall = overallStatusForLocation(status);
                return (
                  <tr key={loc.id} className="border-b border-[var(--color-border)] last:border-0 hover:bg-[var(--color-surface-sunken)]">
                    <td className="py-2.5 pr-3 text-[12.5px] font-medium text-[var(--color-ink)]">
                      <Link href={`/clients/${loc.clientId}/locations/${loc.id}`} className="hover:underline">{client?.name} — {loc.name}</Link>
                    </td>
                    {INTEGRATION_KINDS.map((k) => (
                      <td key={k} className="px-2 py-2.5 text-center">
                        <StatusDot status={status.statuses[k]} />
                      </td>
                    ))}
                    <td className="py-2.5 pl-3 text-right"><Badge variant={STATUS_VARIANT[overall]}>{CONNECTION_STATUS_LABEL[overall]}</Badge></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

function MiniStat({ label, value, tone }: { label: string; value: number; tone?: "success" | "critical" | "warning" }) {
  const color = tone === "success" ? "var(--color-success-strong)" : tone === "critical" ? "var(--color-critical-strong)" : tone === "warning" ? "var(--color-warning-strong)" : "var(--color-ink)";
  return (
    <div>
      <div className="text-[19px] font-semibold tabular-nums" style={{ color }}>{value}</div>
      <div className="text-[11px] text-[var(--color-ink-tertiary)]">{label}</div>
    </div>
  );
}

function StatusDot({ status }: { status: ConnectionStatus }) {
  const color: Record<ConnectionStatus, string> = {
    connected: "bg-[var(--color-success)]", mock: "bg-[var(--color-success)]", "partially-connected": "bg-[var(--color-warning)]",
    syncing: "bg-[var(--color-info)]", "needs-authorization": "bg-[var(--color-warning)]", error: "bg-[var(--color-critical)]", disconnected: "bg-[var(--color-border-strong)]",
  };
  return <span className={`inline-block h-2 w-2 rounded-full ${color[status]}`} title={CONNECTION_STATUS_LABEL[status]} />;
}

// ---------------------------------------------------------------------------
// Sync Center (section 14)
// ---------------------------------------------------------------------------
export function SyncCenterTab({ scope }: { scope: Scope }) {
  useRuntimeStore();
  const locations = getScopedLocations(scope);
  const mode = getWorkspaceMode();

  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>Sync Center</CardTitle>
          <CardDescription>{mode === "demo" ? "No real syncs have run — Demo Workspace data is not backed by a live sync job." : "No integrations connected yet — nothing to sync."}</CardDescription>
        </div>
      </CardHeader>
      <div className="overflow-x-auto px-5 pb-5 pt-2">
        <table className="w-full min-w-[900px] border-collapse text-left">
          <thead>
            <tr className="border-b border-[var(--color-border)] text-[11px] font-semibold uppercase tracking-wide text-[var(--color-ink-tertiary)]">
              <th className="py-2.5 pr-3">Location</th>
              <th className="px-3 py-2.5">Integration</th>
              <th className="px-3 py-2.5">Last Sync</th>
              <th className="px-3 py-2.5">Next Sync</th>
              <th className="px-3 py-2.5 text-right">Imported</th>
              <th className="px-3 py-2.5 text-right">Updated</th>
              <th className="px-3 py-2.5 text-right">Failed</th>
              <th className="py-2.5 pl-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {locations.slice(0, 40).flatMap((loc) => {
              const client = getClient(loc.clientId);
              const status = getLocationIntegrationStatus(loc);
              return (["google", "instagram", "facebook", "whatsapp"] as const).map((kind) => (
                <tr key={`${loc.id}-${kind}`} className="border-b border-[var(--color-border)] last:border-0 hover:bg-[var(--color-surface-sunken)]">
                  <td className="py-2.5 pr-3 text-[12.5px] font-medium text-[var(--color-ink)]">{client?.name} — {loc.name}</td>
                  <td className="px-3 py-2.5 text-[12.5px] text-[var(--color-ink-secondary)]">{INTEGRATION_LABEL[kind]}</td>
                  <td className="px-3 py-2.5 text-[12px] text-[var(--color-ink-tertiary)]">Never synced</td>
                  <td className="px-3 py-2.5 text-[12px] text-[var(--color-ink-tertiary)]">—</td>
                  <td className="px-3 py-2.5 text-right text-[12.5px] tabular-nums">0</td>
                  <td className="px-3 py-2.5 text-right text-[12.5px] tabular-nums">0</td>
                  <td className="px-3 py-2.5 text-right text-[12.5px] tabular-nums">0</td>
                  <td className="py-2.5 pl-3"><Badge variant={STATUS_VARIANT[status.statuses[kind]]}>{CONNECTION_STATUS_LABEL[status.statuses[kind]]}</Badge></td>
                </tr>
              ));
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Data Mapping Review (sections 12/13)
// ---------------------------------------------------------------------------
export function MappingReviewTab() {
  useRuntimeStore();
  const discovered = getMockDiscoveredLocations();
  const allLocs = [...(getClient("skinethics")?.locations ?? []), ...(getClient("dr-ananya-sharma")?.locations ?? [])];
  const decisions = getMappingDecisions();

  function confirm(externalId: string, locationId: string) {
    setMappingDecision(externalId, { status: "confirmed", locationId });
    logIntegrationActivity({ actorLabel: "Data Mapping Review", integration: "google", action: `Confirmed mapping for ${externalId}`, result: "success" });
  }
  function reject(externalId: string) {
    setMappingDecision(externalId, { status: "rejected" });
    logIntegrationActivity({ actorLabel: "Data Mapping Review", integration: "google", action: `Rejected mapping for ${externalId}`, result: "skipped" });
  }

  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>Data Mapping Review</CardTitle>
          <CardDescription>Discovered Google Business Profile locations (mock discovery) — matched by name, address, phone, and website, never by name alone</CardDescription>
        </div>
      </CardHeader>
      <div className="flex flex-col divide-y divide-[var(--color-border)] px-5 pb-3">
        {discovered.map((d) => {
          const { best, ranked } = suggestMapping(d, allLocs as Location[]);
          const decision = decisions[d.externalLocationId];
          const suggestedLocation = best ? allLocs.find((l) => l.id === best.locationId) : null;
          const suggestedClient = suggestedLocation ? getClient(suggestedLocation.clientId) : null;
          return (
            <div key={d.externalLocationId} className="py-4">
              <div className="flex flex-wrap items-center gap-3">
                <div className="min-w-0 flex-1">
                  <div className="text-[13.5px] font-semibold text-[var(--color-ink)]">{d.name}</div>
                  <div className="text-[11.5px] text-[var(--color-ink-tertiary)]">{d.address ?? "No address"} {d.phone ? `· ${d.phone}` : ""}</div>
                </div>
                <span className="text-[var(--color-ink-tertiary)]">↓</span>
                {suggestedLocation ? (
                  <div className="min-w-0 flex-1">
                    <div className="text-[13px] font-medium text-[var(--color-ink)]">{suggestedClient?.name} — {suggestedLocation.name}</div>
                    <div className="flex flex-wrap gap-1 text-[11px] text-[var(--color-ink-tertiary)]">{best!.reasons.join(" · ") || "Weak match"}</div>
                  </div>
                ) : (
                  <div className="flex-1 text-[13px] text-[var(--color-warning-strong)]">No confident match found</div>
                )}
                <Badge variant={best ? (confidenceTier(best.confidence) === "high" ? "success" : confidenceTier(best.confidence) === "medium" ? "warning" : "critical") : "critical"}>
                  {best ? `${Math.round(best.confidence)}% confidence` : "0% confidence"}
                </Badge>
                {decision ? (
                  <Badge variant={decision.status === "confirmed" ? "success" : "neutral"} className="capitalize">{decision.status}</Badge>
                ) : (
                  <div className="flex gap-1.5">
                    <Button variant="outline" size="sm" onClick={() => reject(d.externalLocationId)}>Reject</Button>
                    <Button variant="primary" size="sm" disabled={!suggestedLocation} onClick={() => suggestedLocation && confirm(d.externalLocationId, suggestedLocation.id)}>Confirm</Button>
                  </div>
                )}
              </div>
              {ranked.length > 1 && ranked[1].confidence > 15 && !decision && (
                <p className="mt-1.5 text-[11px] text-[var(--color-ink-tertiary)]">Next best: {getClient(allLocs.find((l) => l.id === ranked[1].locationId)?.clientId ?? "")?.name} — {allLocs.find((l) => l.id === ranked[1].locationId)?.name} ({Math.round(ranked[1].confidence)}%)</p>
              )}
            </div>
          );
        })}
      </div>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Integration Activity Log (section 21)
// ---------------------------------------------------------------------------
export function IntegrationActivityLogTab() {
  useRuntimeStore();
  const activity = getIntegrationActivity();
  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>Integration Activity Log</CardTitle>
          <CardDescription>{activity.length} events this session</CardDescription>
        </div>
      </CardHeader>
      <div className="flex flex-col divide-y divide-[var(--color-border)] px-5 pb-3">
        {activity.length === 0 ? (
          <p className="py-8 text-center text-[13px] text-[var(--color-ink-tertiary)]">No integration activity yet. Run a connection test or review a mapping to see entries here.</p>
        ) : activity.map((a) => (
          <div key={a.id} className="flex items-center gap-3 py-2.5">
            {a.result === "success" ? <CheckCircle2 className="h-4 w-4 shrink-0 text-[var(--color-success)]" /> : a.result === "failure" ? <XCircle className="h-4 w-4 shrink-0 text-[var(--color-critical)]" /> : <AlertTriangle className="h-4 w-4 shrink-0 text-[var(--color-warning)]" />}
            <div className="min-w-0 flex-1">
              <div className="text-[12.5px] text-[var(--color-ink)]"><span className="font-medium">{a.actorLabel}</span> — {a.action}</div>
              {a.error && <div className="text-[11.5px] text-[var(--color-critical-strong)]">{a.error}</div>}
            </div>
            <Badge variant="neutral" className="capitalize">{INTEGRATION_LABEL[a.integration]}</Badge>
            <span className="text-[11px] text-[var(--color-ink-tertiary)]">{new Date(a.createdAt).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" })}</span>
          </div>
        ))}
      </div>
    </Card>
  );
}
