"use client";

import { useState } from "react";
import Link from "next/link";
import { FileBarChart, Plus } from "lucide-react";
import { PageHeader } from "@/components/shell/PageHeader";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ALL_CLIENTS, getClient } from "@/lib/mock/clients";
import { useScope } from "@/lib/scope-context";
import { cn } from "@/lib/utils";

const REPORT_TYPES = ["Weekly", "Monthly", "Quarterly", "Custom"] as const;

const RECENT_REPORTS = ALL_CLIENTS.slice(0, 10).map((c, i) => ({
  id: `rep-${i}`,
  clientId: c.id,
  client: c.name,
  type: i % 4 === 0 ? "Quarterly" : "Monthly",
  period: "September 2026",
  status: i < 3 ? "Sent" : i < 6 ? "Ready" : "Draft",
}));

export default function ReportsPage() {
  const { scope, setScope } = useScope();
  const [type, setType] = useState<(typeof REPORT_TYPES)[number]>("Monthly");
  const [clientId, setClientId] = useState(scope.type !== "all" ? scope.clientId : "all");
  const [locationId, setLocationId] = useState(scope.type === "location" ? scope.locationId : "all");
  const builderClient = clientId !== "all" ? getClient(clientId) : undefined;

  function applyAndPreview() {
    if (clientId === "all") setScope({ type: "all" });
    else if (locationId === "all") setScope({ type: "client", clientId });
    else setScope({ type: "location", clientId, locationId });
  }

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Reports"
        subtitle="Build client-ready growth reports in minutes."
        actions={<Link href="/reports/preview" onClick={applyAndPreview}><Button variant="primary" size="md"><Plus className="h-3.5 w-3.5" /> New Report</Button></Link>}
      />

      <Card className="mb-6">
        <CardHeader><CardTitle>Report builder</CardTitle></CardHeader>
        <div className="px-5 pb-5 pt-2">
          <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <label className="flex flex-col gap-1.5">
              <span className="text-[11.5px] font-medium text-[var(--color-ink-secondary)]">Client</span>
              <select value={clientId} onChange={(e) => { setClientId(e.target.value); setLocationId("all"); }} className="h-9 rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-surface-sunken)] px-2 text-[13px] outline-none">
                <option value="all">All Clients (agency-level)</option>
                {ALL_CLIENTS.slice(0, 60).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-[11.5px] font-medium text-[var(--color-ink-secondary)]">Location</span>
              <select value={locationId} onChange={(e) => setLocationId(e.target.value)} disabled={!builderClient} className="h-9 rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-surface-sunken)] px-2 text-[13px] outline-none disabled:opacity-50">
                <option value="all">All locations</option>
                {builderClient?.locations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
              </select>
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-[11.5px] font-medium text-[var(--color-ink-secondary)]">Date range</span>
              <select defaultValue="sep" className="h-9 rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-surface-sunken)] px-2 text-[13px] outline-none">
                <option value="sep">September 2026</option>
                <option value="q3">Q3 2026</option>
                <option value="aug">August 2026</option>
              </select>
            </label>
          </div>
          <div className="mb-4 flex items-center gap-1.5">
            {REPORT_TYPES.map((t) => (
              <button key={t} onClick={() => setType(t)} className={cn("rounded-full px-3.5 py-1.5 text-[12.5px] font-medium", type === t ? "bg-[var(--color-primary)] text-white" : "bg-[var(--color-surface-sunken)] text-[var(--color-ink-secondary)]")}>
                {t}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-8">
            {["Executive Summary", "Google", "Reviews", "Website", "SEO", "Social", "Ads", "Leads"].map((s) => (
              <label key={s} className="flex items-center gap-2 rounded-[var(--radius-sm)] border border-[var(--color-border)] px-3 py-2 text-[12.5px] text-[var(--color-ink-secondary)]">
                <input type="checkbox" defaultChecked className="accent-[var(--color-primary)]" />
                {s}
              </label>
            ))}
          </div>
          <Link href="/reports/preview" onClick={applyAndPreview}>
            <Button variant="primary" size="md" className="mt-4">Preview Report</Button>
          </Link>
        </div>
      </Card>

      <Card>
        <CardHeader><CardTitle>Recent reports</CardTitle></CardHeader>
        <div className="divide-y divide-[var(--color-border)] px-5 pb-3">
          {RECENT_REPORTS.map((r) => (
            <div key={r.id} className="flex items-center gap-3 py-3">
              <FileBarChart className="h-4 w-4 text-[var(--color-ink-tertiary)]" />
              <div className="min-w-0 flex-1">
                <div className="text-[13.5px] font-medium text-[var(--color-ink)]">{r.client} — {r.type} Report</div>
                <div className="text-[11.5px] text-[var(--color-ink-tertiary)]">{r.period}</div>
              </div>
              <Badge variant={r.status === "Sent" ? "success" : r.status === "Ready" ? "info" : "neutral"}>{r.status}</Badge>
              <Link href="/reports/preview" onClick={() => setScope({ type: "client", clientId: r.clientId })}><Button variant="ghost" size="sm">Preview</Button></Link>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
