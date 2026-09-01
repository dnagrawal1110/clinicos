"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, TrendingUp, Info, CheckCircle2 } from "lucide-react";
import { PageHeader } from "@/components/shell/PageHeader";
import { Card } from "@/components/ui/card";
import { useScope } from "@/lib/scope-context";
import { getScopedAlerts } from "@/lib/scope-selectors";
import { cn } from "@/lib/utils";
import type { Alert } from "@/lib/types";

const TONE_META: Record<Alert["tone"], { label: string; icon: typeof AlertTriangle; color: string; bg: string }> = {
  critical: { label: "Critical", icon: AlertTriangle, color: "var(--color-critical-strong)", bg: "var(--color-critical-soft)" },
  attention: { label: "Attention", icon: AlertTriangle, color: "var(--color-warning-strong)", bg: "var(--color-warning-soft)" },
  opportunity: { label: "Opportunity", icon: TrendingUp, color: "var(--color-ai-strong)", bg: "var(--color-ai-soft)" },
  info: { label: "Information", icon: Info, color: "var(--color-info)", bg: "var(--color-info-soft)" },
  success: { label: "Resolved", icon: CheckCircle2, color: "var(--color-success-strong)", bg: "var(--color-success-soft)" },
};

const FILTERS: (Alert["tone"] | "all")[] = ["all", "critical", "attention", "opportunity", "info", "success"];

function timeAgo(iso: string): string {
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.round(hrs / 24)}d ago`;
}

export default function AlertsPage() {
  const { scope, scopeMeta, setScope } = useScope();
  const router = useRouter();
  const [filter, setFilter] = useState<Alert["tone"] | "all">("all");
  const alerts = getScopedAlerts(scope);
  const filtered = filter === "all" ? alerts : alerts.filter((a) => a.tone === filter);

  function openAlert(a: Alert) {
    if (a.locationId && a.clientId) {
      setScope({ type: "location", clientId: a.clientId, locationId: a.locationId });
      router.push(`/clients/${a.clientId}/locations/${a.locationId}`);
    } else if (a.clientId) {
      setScope({ type: "client", clientId: a.clientId });
      router.push(`/clients/${a.clientId}`);
    }
  }

  return (
    <div className="animate-fade-in">
      <PageHeader
        breadcrumb={scope.type !== "all" ? scopeMeta.crumbs.concat({ label: "Alerts" }) : undefined}
        title="Alerts"
        subtitle={scope.type === "all" ? "Real-time signals across every client, ranked by urgency." : `Alerts for ${scopeMeta.title}.`}
      />

      <div className="mb-4 flex flex-wrap items-center gap-1.5">
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cn("rounded-full px-3 py-1 text-[12.5px] font-medium capitalize", filter === f ? "bg-[var(--color-primary)] text-white" : "bg-[var(--color-surface-sunken)] text-[var(--color-ink-secondary)]")}
          >
            {f} {f !== "all" && <span className="ml-1 opacity-70">{alerts.filter((a) => a.tone === f).length}</span>}
          </button>
        ))}
      </div>

      <Card>
        <div className="divide-y divide-[var(--color-border)] px-2">
          {filtered.length === 0 ? (
            <p className="py-10 text-center text-[13px] text-[var(--color-ink-tertiary)]">No alerts in this scope.</p>
          ) : filtered.slice(0, 60).map((alert) => {
            const meta = TONE_META[alert.tone];
            const Icon = meta.icon;
            const clickable = Boolean(alert.clientId);
            return (
              <button
                key={alert.id}
                onClick={() => clickable && openAlert(alert)}
                disabled={!clickable}
                className={cn("flex w-full items-start gap-3.5 px-3 py-3.5 text-left", clickable && "hover:bg-[var(--color-surface-sunken)]")}
              >
                <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full" style={{ background: meta.bg }}>
                  <Icon className="h-3.5 w-3.5" style={{ color: meta.color }} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: meta.color }}>{meta.label}</span>
                    <span className="ml-auto text-[11.5px] text-[var(--color-ink-tertiary)]">{timeAgo(alert.createdAt)}</span>
                  </div>
                  <p className="mt-0.5 text-[13.5px] font-medium text-[var(--color-ink)]">{alert.title}</p>
                  <p className="text-[13px] text-[var(--color-ink-tertiary)]">{alert.detail}</p>
                </div>
              </button>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
