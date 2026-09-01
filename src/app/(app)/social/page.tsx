"use client";

import { CheckCircle2, XCircle } from "lucide-react";
import { PageHeader } from "@/components/shell/PageHeader";
import { StatCard } from "@/components/ui/stat-card";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getClient } from "@/lib/mock/clients";
import { useScope } from "@/lib/scope-context";
import { useRuntimeStore } from "@/lib/runtime-store";
import { getScopedContent, getScopedKpi } from "@/lib/scope-selectors";
import { formatNumber } from "@/lib/utils";

const PLATFORMS = [
  { name: "Instagram", connected: 79, followers: 184200, engagement: 4.2 },
  { name: "Facebook", connected: 71, followers: 231400, engagement: 2.1 },
  { name: "YouTube", connected: 22, followers: 41800, engagement: 6.7 },
  { name: "LinkedIn", connected: 9, followers: 8600, engagement: 1.8 },
];

const STATUS_VARIANT: Record<string, "success" | "warning" | "critical" | "neutral" | "info"> = {
  published: "success", scheduled: "info", approved: "neutral", pending: "warning", failed: "critical", idea: "neutral", draft: "neutral",
};

export default function SocialPage() {
  useRuntimeStore();
  const { scope, scopeMeta } = useScope();
  const kpi = getScopedKpi(scope);
  const socialItems = getScopedContent(scope).filter((c) => c.channel !== "google");
  const clientName = (id: string) => getClient(id)?.name ?? id;
  const scaleFactor = scope.type === "all" ? 1 : Math.max(0.02, kpi.locationCount / 284);

  return (
    <div className="animate-fade-in">
      <PageHeader
        breadcrumb={scope.type !== "all" ? scopeMeta.crumbs.concat({ label: "Social" }) : undefined}
        title="Social"
        subtitle={scope.type === "all" ? "Instagram, Facebook, YouTube, and LinkedIn across every client." : `Social performance for ${scopeMeta.title}.`}
      />

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {PLATFORMS.map((p) => (
          <StatCard key={p.name} label={p.name} value={formatNumber(Math.round(p.followers * scaleFactor))} sub={scope.type === "all" ? `${p.connected} accounts connected` : undefined} trend={{ value: p.engagement }} />
        ))}
      </div>

      {scope.type === "all" && (
        <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-4">
          {PLATFORMS.map((p, i) => (
            <Card key={p.name} className="p-4">
              <div className="flex items-center justify-between">
                <span className="text-[13.5px] font-semibold text-[var(--color-ink)]">{p.name}</span>
                {i < 3 ? <CheckCircle2 className="h-4 w-4 text-[var(--color-success)]" /> : <XCircle className="h-4 w-4 text-[var(--color-warning)]" />}
              </div>
              <div className="mt-2 text-[11.5px] text-[var(--color-ink-tertiary)]">{p.connected} of 97 clients connected</div>
            </Card>
          ))}
        </div>
      )}

      <Card>
        <CardHeader><CardTitle>Content queue</CardTitle></CardHeader>
        <div className="divide-y divide-[var(--color-border)] px-5 pb-3">
          {socialItems.length === 0 ? (
            <p className="py-8 text-center text-[13px] text-[var(--color-ink-tertiary)]">No social content in this scope.</p>
          ) : socialItems.slice(0, 20).map((item) => (
            <div key={item.id} className="flex items-center gap-3 py-2.5">
              <span className="flex-1 text-[13px] text-[var(--color-ink)]">{item.title} <span className="text-[var(--color-ink-tertiary)]">· {clientName(item.clientId)} · {item.channel}</span></span>
              <Badge variant={STATUS_VARIANT[item.status]} className="capitalize">{item.status}</Badge>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
