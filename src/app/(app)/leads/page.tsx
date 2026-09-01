"use client";

import { useState } from "react";
import { AlertTriangle } from "lucide-react";
import { PageHeader } from "@/components/shell/PageHeader";
import { StatCard } from "@/components/ui/stat-card";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getClient } from "@/lib/mock/clients";
import { useScope } from "@/lib/scope-context";
import { getScopedLeads } from "@/lib/scope-selectors";
import { formatINR, cn } from "@/lib/utils";
import type { Lead } from "@/lib/types";

const STAGES: { key: Lead["status"]; label: string }[] = [
  { key: "new", label: "New" }, { key: "contacted", label: "Contacted" }, { key: "qualified", label: "Qualified" },
  { key: "appointment", label: "Appointment" }, { key: "completed", label: "Completed" }, { key: "lost", label: "Lost" }, { key: "reactivation", label: "Reactivation" },
];

const STATUS_VARIANT: Record<string, "success" | "warning" | "critical" | "neutral" | "info"> = {
  new: "info", contacted: "neutral", qualified: "warning", appointment: "success", completed: "success", lost: "critical", reactivation: "neutral",
};

const QUALITY_VARIANT: Record<Lead["quality"], "success" | "warning" | "neutral"> = { hot: "success", warm: "warning", cold: "neutral" };

export default function LeadsPage() {
  const { scope, scopeMeta } = useScope();
  const [stage, setStage] = useState<Lead["status"] | "all">("all");
  const leads = getScopedLeads(scope);
  const clientName = (id: string) => getClient(id)?.name ?? id;
  const locationName = (clientId: string, locationId: string) => getClient(clientId)?.locations.find((l) => l.id === locationId)?.name ?? "";
  const filtered = stage === "all" ? leads : leads.filter((l) => l.status === stage);

  const slowResponses = leads.filter((l) => l.responseTimeMinutes > 30 && l.status === "new").length;
  const avgResponse = leads.length ? Math.round(leads.reduce((a, l) => a + l.responseTimeMinutes, 0) / leads.length) : 0;
  const worstDoctorLocation = [...leads].sort((a, b) => b.responseTimeMinutes - a.responseTimeMinutes)[0];

  const insights = [
    slowResponses > 0 ? `${slowResponses} lead${slowResponses !== 1 ? "s" : ""} in this scope have not received a response within 15 minutes.` : null,
    `Average response time in this scope is ${avgResponse} minutes.`,
    worstDoctorLocation ? `Slowest response: ${clientName(worstDoctorLocation.clientId)} — ${locationName(worstDoctorLocation.clientId, worstDoctorLocation.locationId)} at ${worstDoctorLocation.responseTimeMinutes} min.` : null,
  ].filter(Boolean) as string[];

  return (
    <div className="animate-fade-in">
      <PageHeader
        breadcrumb={scope.type !== "all" ? scopeMeta.crumbs.concat({ label: "Leads" }) : undefined}
        title="Leads"
        subtitle={scope.type === "all" ? "Pipeline across Google, Meta, WhatsApp, and referral sources." : `Lead pipeline for ${scopeMeta.title}.`}
      />

      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
        {STAGES.map((s) => (
          <StatCard key={s.key} label={s.label} value={leads.filter((l) => l.status === s.key).length} />
        ))}
      </div>

      <Card className="mb-5 overflow-hidden">
        <div className="flex items-center gap-2 border-b border-[var(--color-border)] bg-[linear-gradient(120deg,var(--color-ai-soft)_0%,transparent_65%)] px-5 py-3.5">
          <h3 className="text-[13.5px] font-semibold text-[var(--color-ink)]">AI Lead Insights</h3>
        </div>
        <div className="flex flex-col gap-2 px-5 py-3.5">
          {insights.map((line, i) => (
            <div key={i} className="flex items-start gap-2 text-[13px] text-[var(--color-ink-secondary)]">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--color-warning)]" />
              {line}
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>All leads</CardTitle>
          <div className="flex flex-wrap items-center gap-1">
            <button onClick={() => setStage("all")} className={cn("rounded-full px-3 py-1 text-[12px] font-medium", stage === "all" ? "bg-[var(--color-primary)] text-white" : "bg-[var(--color-surface-sunken)] text-[var(--color-ink-secondary)]")}>All</button>
            {STAGES.map((s) => (
              <button key={s.key} onClick={() => setStage(s.key)} className={cn("rounded-full px-3 py-1 text-[12px] font-medium", stage === s.key ? "bg-[var(--color-primary)] text-white" : "bg-[var(--color-surface-sunken)] text-[var(--color-ink-secondary)]")}>{s.label}</button>
            ))}
          </div>
        </CardHeader>
        <div className="overflow-x-auto px-5 pb-5 pt-2">
          {filtered.length === 0 ? (
            <p className="py-10 text-center text-[13px] text-[var(--color-ink-tertiary)]">No leads in this scope.</p>
          ) : (
          <table className="w-full min-w-[860px] border-collapse text-left">
            <thead>
              <tr className="border-b border-[var(--color-border)] text-[11px] font-semibold uppercase tracking-wide text-[var(--color-ink-tertiary)]">
                <th className="py-2.5 pr-3">Name</th>
                <th className="px-3 py-2.5">Client — Location</th>
                <th className="px-3 py-2.5">Source</th>
                <th className="px-3 py-2.5 text-right">Response</th>
                <th className="px-3 py-2.5 text-right">Quality</th>
                <th className="px-3 py-2.5 text-right">Value</th>
                <th className="py-2.5 pl-3 text-right">Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.slice(0, 40).map((l) => (
                <tr key={l.id} className="border-b border-[var(--color-border)] last:border-0 hover:bg-[var(--color-surface-sunken)]">
                  <td className="py-2.5 pr-3 text-[13px] font-medium text-[var(--color-ink)]">{l.name}</td>
                  <td className="px-3 py-2.5 text-[12.5px] text-[var(--color-ink-secondary)]">{clientName(l.clientId)} — {locationName(l.clientId, l.locationId)}</td>
                  <td className="px-3 py-2.5 text-[12.5px] text-[var(--color-ink-secondary)]">{l.source}</td>
                  <td className={cn("px-3 py-2.5 text-right text-[12.5px] tabular-nums", l.responseTimeMinutes > 30 ? "text-[var(--color-critical)]" : "text-[var(--color-ink-secondary)]")}>{l.responseTimeMinutes}m</td>
                  <td className="px-3 py-2.5 text-right"><Badge variant={QUALITY_VARIANT[l.quality]} className="capitalize">{l.quality}</Badge></td>
                  <td className="px-3 py-2.5 text-right text-[12.5px] tabular-nums text-[var(--color-ink-secondary)]">{formatINR(l.value)}</td>
                  <td className="py-2.5 pl-3 text-right"><Badge variant={STATUS_VARIANT[l.status]} className="capitalize">{l.status}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
          )}
        </div>
      </Card>
    </div>
  );
}
