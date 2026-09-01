"use client";

import { PageHeader } from "@/components/shell/PageHeader";
import { StatCard } from "@/components/ui/stat-card";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getRankings } from "@/lib/mock/location-detail";
import { getLocation, getClient } from "@/lib/mock/clients";
import { useScope } from "@/lib/scope-context";
import { useRuntimeStore } from "@/lib/runtime-store";
import { getScopedKpi, getScopedLocations } from "@/lib/scope-selectors";

export default function SeoPage() {
  useRuntimeStore();
  const { scope, scopeMeta } = useScope();
  const kpi = getScopedKpi(scope);
  const locations = getScopedLocations(scope);

  const flagship = scopeMeta.location
    ? scopeMeta.location
    : scopeMeta.client
      ? [...scopeMeta.client.locations].sort((a, b) => a.scores.website - b.scores.website)[0]
      : getLocation("skinethics__kothrud")!;
  const flagshipClient = getClient(flagship.clientId)!;
  const rankings = getRankings(flagship);

  const opportunities = [...locations]
    .filter((l) => l.scores.website < 75)
    .sort((a, b) => a.scores.website - b.scores.website)
    .slice(0, 6)
    .map((l) => {
      const r = getRankings(l)[0];
      return {
        location: l,
        keyword: r?.keyword ?? `${flagshipClient.specialty} in ${l.name}`,
        rank: r && r.position > 15 ? "Not ranking" : `#${r?.position ?? "—"}`,
        recommendation: l.scores.website < 55 ? "Create dedicated location/service page" : "Strengthen internal linking + add FAQ schema",
        priority: l.scores.website < 45 ? "High" : l.scores.website < 65 ? "Medium" : "Low",
      };
    });

  return (
    <div className="animate-fade-in">
      <PageHeader
        breadcrumb={scope.type !== "all" ? scopeMeta.crumbs.concat({ label: "Website & SEO" }) : undefined}
        title="Website & SEO"
        subtitle={scope.type === "all" ? "Technical health, local SEO, and content opportunity across the portfolio." : `Website & SEO for ${scopeMeta.title}.`}
      />

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-5">
        <StatCard label="Technical SEO" value={Math.min(99, kpi.scores.website + 15)} />
        <StatCard label="Local SEO" value={Math.max(20, kpi.scores.website - 9)} />
        <StatCard label="Content" value={kpi.scores.content} />
        <StatCard label="Conversion" value={Math.max(20, kpi.scores.website - 5)} />
        <StatCard label="Overall" value={kpi.scores.website} />
      </div>

      <Card className="mb-6">
        <CardHeader className="flex-col items-start gap-0.5">
          <CardTitle>SEO Opportunity Engine</CardTitle>
          <CardDescription>Highest-impact keyword gaps in this scope</CardDescription>
        </CardHeader>
        <div className="divide-y divide-[var(--color-border)] px-5 pb-3">
          {opportunities.length === 0 ? (
            <p className="py-8 text-center text-[13px] text-[var(--color-ink-tertiary)]">No significant SEO gaps in this scope.</p>
          ) : opportunities.map((o) => (
            <div key={o.location.id} className="flex items-center justify-between gap-3 py-3">
              <div>
                <div className="text-[13px] font-medium text-[var(--color-ink)]">&ldquo;{o.keyword}&rdquo;</div>
                <div className="text-[11.5px] text-[var(--color-ink-tertiary)]">{getClient(o.location.clientId)?.name} — {o.location.name} · Current: {o.rank} · {o.recommendation}</div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={o.priority === "High" ? "critical" : o.priority === "Medium" ? "warning" : "neutral"}>{o.priority}</Badge>
                <Button variant="outline" size="sm">Create Task</Button>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <CardHeader className="flex-col items-start gap-0.5">
          <CardTitle>{scope.type === "all" ? "Flagship example — " : ""}{flagshipClient.name} — {flagship.name}</CardTitle>
          <CardDescription>Full ranking detail available in the location workspace</CardDescription>
        </CardHeader>
        <div className="divide-y divide-[var(--color-border)] px-5 pb-3">
          {rankings.map((r) => (
            <div key={r.keyword} className="flex items-center justify-between py-2.5 text-[13px]">
              <span className="text-[var(--color-ink)]">&ldquo;{r.keyword}&rdquo;</span>
              <span className="tabular-nums text-[var(--color-ink-secondary)]">#{r.position}</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
