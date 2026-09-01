"use client";

import { useState } from "react";
import { CheckCircle2, XCircle, AlertTriangle, Loader2, PlayCircle } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useRuntimeStore, logIntegrationActivity, getWorkspaceMode } from "@/lib/runtime-store";
import { getLocationIntegrationStatus } from "@/lib/integrations/connection-health";
import { testConnection } from "@/lib/integrations/connection-test";
import { generateWebsiteAudit } from "@/lib/ai-service";
import { INTEGRATION_KINDS, INTEGRATION_LABEL, CONNECTION_STATUS_LABEL, type ConnectionStatus, type IntegrationKind, type ConnectionTestResult } from "@/lib/integrations/types";
import type { Client, Location } from "@/lib/types";

const STATUS_VARIANT: Record<ConnectionStatus, "success" | "warning" | "critical" | "neutral" | "info"> = {
  connected: "success", mock: "success", "partially-connected": "warning", syncing: "info",
  "needs-authorization": "warning", error: "critical", disconnected: "neutral",
};

const STATUS_ICON: Record<ConnectionStatus, typeof CheckCircle2> = {
  connected: CheckCircle2, mock: CheckCircle2, "partially-connected": AlertTriangle, syncing: Loader2,
  "needs-authorization": AlertTriangle, error: XCircle, disconnected: XCircle,
};

const STATUS_ICON_COLOR: Record<ConnectionStatus, string> = {
  connected: "var(--color-success-strong)", mock: "var(--color-success-strong)",
  "partially-connected": "var(--color-warning-strong)", syncing: "var(--color-info)",
  "needs-authorization": "var(--color-warning-strong)", error: "var(--color-critical-strong)",
  disconnected: "var(--color-ink-tertiary)",
};

// Section 15/16/18 — the per-location integration checklist, test buttons,
// and a lightweight Live Data Audit built from the same underlying scores
// the rest of the app already computes (no separate crawler needed to show
// this meaningfully).
export function LocationIntegrationsTab({ location, client }: { location: Location; client: Client }) {
  useRuntimeStore();
  const [testResults, setTestResults] = useState<Record<string, ConnectionTestResult>>({});
  const [testing, setTesting] = useState<string | null>(null);
  const status = getLocationIntegrationStatus(location);
  const websiteAudit = generateWebsiteAudit(location);

  async function runTest(kind: IntegrationKind) {
    setTesting(kind);
    const result = await testConnection(location, kind);
    setTestResults((r) => ({ ...r, [kind]: result }));
    logIntegrationActivity({
      actorLabel: getWorkspaceMode() === "demo" ? "Demo Workspace" : "Live Agency Workspace",
      clientId: client.id, locationId: location.id, integration: kind,
      action: "Test connection", result: result.passed ? "success" : "failure",
      error: result.passed ? undefined : result.checks.find((c) => !c.passed)?.detail,
    });
    setTesting(null);
  }

  return (
    <div className="flex flex-col gap-5">
      <Card>
        <CardHeader>
          <div>
            <CardTitle>{client.name} — {location.name}</CardTitle>
            <CardDescription>Integration status for this location</CardDescription>
          </div>
        </CardHeader>
        <div className="flex flex-col divide-y divide-[var(--color-border)] px-5 pb-3">
          {INTEGRATION_KINDS.map((kind) => {
            const kindStatus = status.statuses[kind];
            const Icon = STATUS_ICON[kindStatus];
            const result = testResults[kind];
            return (
              <div key={kind} className="py-3.5">
                <div className="flex items-center gap-3">
                  <Icon className={`h-4 w-4 shrink-0 ${kindStatus === "syncing" ? "animate-spin" : ""}`} style={{ color: STATUS_ICON_COLOR[kindStatus] }} />
                  <span className="flex-1 text-[13.5px] font-medium text-[var(--color-ink)]">{INTEGRATION_LABEL[kind]}</span>
                  <Badge variant={STATUS_VARIANT[kindStatus]}>{CONNECTION_STATUS_LABEL[kindStatus]}</Badge>
                  <Button variant="outline" size="sm" disabled={testing === kind} onClick={() => runTest(kind)}>
                    <PlayCircle className="h-3.5 w-3.5" /> {testing === kind ? "Testing..." : "Test Connection"}
                  </Button>
                </div>
                {result && (
                  <div className="ml-7 mt-2 flex flex-col gap-1 rounded-[var(--radius-sm)] bg-[var(--color-surface-sunken)] px-3 py-2">
                    {result.checks.map((c) => (
                      <div key={c.label} className="flex items-start gap-1.5 text-[12px]">
                        <span className={c.passed ? "text-[var(--color-success-strong)]" : "text-[var(--color-critical-strong)]"}>{c.passed ? "✓" : "✗"}</span>
                        <span className="text-[var(--color-ink-secondary)]">{c.label}{c.detail ? ` — ${c.detail}` : ""}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </Card>

      <Card>
        <CardHeader>
          <div>
            <CardTitle>Live Data Audit</CardTitle>
            <CardDescription>Section 18 — derived from current scores; a real crawler slots in behind generateWebsiteAudit()</CardDescription>
          </div>
        </CardHeader>
        <div className="grid grid-cols-2 gap-3 px-5 pb-5 sm:grid-cols-4">
          <AuditStat label="SEO" value={websiteAudit.seoScore} />
          <AuditStat label="Technical" value={websiteAudit.technicalScore} />
          <AuditStat label="Content" value={websiteAudit.contentScore} />
          <AuditStat label="Local SEO" value={websiteAudit.localSeoScore} />
          <AuditStat label="Mobile" value={websiteAudit.mobileScore} />
          <AuditStat label="Performance" value={websiteAudit.performanceScore} />
          <AuditStat label="Schema" value={websiteAudit.schemaScore} />
          <AuditStat label="Conversion" value={websiteAudit.conversionScore} />
        </div>
        <div className="flex flex-col gap-1.5 px-5 pb-5">
          {websiteAudit.breakdown.map((b) => (
            <div key={b.check} className="flex items-center gap-2 text-[12.5px]">
              {b.passed ? <CheckCircle2 className="h-3.5 w-3.5 text-[var(--color-success)]" /> : <XCircle className="h-3.5 w-3.5 text-[var(--color-critical)]" />}
              <span className={b.passed ? "text-[var(--color-ink-secondary)]" : "text-[var(--color-ink)]"}>{b.check}</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

function AuditStat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="text-[18px] font-semibold tabular-nums text-[var(--color-ink)]">{value}</div>
      <div className="text-[11px] text-[var(--color-ink-tertiary)]">{label}</div>
    </div>
  );
}
