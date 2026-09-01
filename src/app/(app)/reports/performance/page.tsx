"use client";

import { PageHeader } from "@/components/shell/PageHeader";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { StatCard } from "@/components/ui/stat-card";
import { PerformanceTrendChart } from "@/components/domain/PerformanceTrendChart";
import { useScope } from "@/lib/scope-context";
import { useRuntimeStore } from "@/lib/runtime-store";
import { getScopedKpi } from "@/lib/scope-selectors";
import { ModuleBar } from "@/components/ui/health";
import { formatNumber } from "@/lib/utils";

export default function PerformancePage() {
  useRuntimeStore();
  const { scope, scopeMeta } = useScope();
  const kpi = getScopedKpi(scope);

  return (
    <div className="animate-fade-in">
      <PageHeader
        breadcrumb={scope.type !== "all" ? scopeMeta.crumbs.concat({ label: "Performance" }) : undefined}
        title="Performance"
        subtitle={scope.type === "all" ? "Six-month trend across the entire agency portfolio." : `Six-month trend for ${scopeMeta.title}.`}
      />

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Portfolio Health" value={kpi.healthOverall} trend={{ value: 8 }} />
        <StatCard label="Reviews This Month" value={formatNumber(kpi.reviewsThisMonth)} trend={{ value: 12 }} />
        <StatCard label="Active Campaigns" value={kpi.activeCampaigns} trend={{ value: 6 }} />
        <StatCard label="Open Tasks" value={kpi.openTasks} trend={{ value: -9 }} />
      </div>

      <Card className="mb-6">
        <CardHeader className="flex-col items-start gap-0.5">
          <CardTitle>Portfolio health trend</CardTitle>
          <CardDescription>Last 6 months, blended across all modules</CardDescription>
        </CardHeader>
        <div className="px-5 pb-5 pt-2">
          <PerformanceTrendChart />
        </div>
      </Card>

      <Card>
        <CardHeader><CardTitle>Current module breakdown</CardTitle></CardHeader>
        <div className="flex flex-col gap-3 px-5 pb-5 pt-2">
          <ModuleBar label="Google Presence" score={kpi.scores.google} />
          <ModuleBar label="Reputation" score={kpi.scores.reputation} />
          <ModuleBar label="Website & SEO" score={kpi.scores.website} />
          <ModuleBar label="Content" score={kpi.scores.content} />
          <ModuleBar label="Social" score={kpi.scores.social} />
          <ModuleBar label="Ads" score={kpi.scores.ads} />
          <ModuleBar label="Lead Management" score={kpi.scores.leads} />
        </div>
      </Card>
    </div>
  );
}
