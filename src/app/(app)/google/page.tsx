"use client";

import { CheckCircle2, XCircle, Star, ImageIcon } from "lucide-react";
import { PageHeader } from "@/components/shell/PageHeader";
import { StatCard } from "@/components/ui/stat-card";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { GoogleProfilesTable } from "@/components/domain/GoogleProfilesTable";
import { RankingsTable } from "@/components/domain/RankingsTable";
import { CompetitorComparison } from "@/components/domain/CompetitorComparison";
import { getClient, getLocation } from "@/lib/mock/clients";
import { getRankings, getCompetitors } from "@/lib/mock/location-detail";
import { useScope } from "@/lib/scope-context";
import { useRuntimeStore } from "@/lib/runtime-store";
import { getScopedKpi, getScopedLocations } from "@/lib/scope-selectors";
import { formatNumber } from "@/lib/utils";

export default function GooglePage() {
  useRuntimeStore();
  const { scope, scopeMeta } = useScope();
  const locations = getScopedLocations(scope);
  const kpi = getScopedKpi(scope);
  const rows = locations.map((location) => ({ client: getClient(location.clientId)!, location }));
  const avgRating = locations.length ? locations.reduce((a, l) => a + l.rating, 0) / locations.length : 0;

  const flagship = scopeMeta.location
    ? scopeMeta.location
    : scopeMeta.client
      ? [...scopeMeta.client.locations].sort((a, b) => a.healthOverall - b.healthOverall)[0]
      : getLocation("skinethics__kothrud")!;
  const flagshipClient = getClient(flagship.clientId)!;

  return (
    <div className="animate-fade-in">
      <PageHeader
        breadcrumb={scope.type !== "all" ? scopeMeta.crumbs.concat({ label: "Google" }) : undefined}
        title="Google"
        subtitle="Business Profiles, reviews, posts, rankings, and competitor visibility across every location."
      />

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Connected Profiles" value={`${kpi.connectedGoogle} / ${kpi.locationCount}`} icon={<CheckCircle2 className="h-4 w-4" />} />
        <StatCard label="Disconnected" value={kpi.locationCount - kpi.connectedGoogle} icon={<XCircle className="h-4 w-4" />} />
        <StatCard label="Avg. Rating" value={avgRating.toFixed(2)} icon={<Star className="h-4 w-4" />} />
        <StatCard label="Avg. Google Health" value={kpi.scores.google} icon={<ImageIcon className="h-4 w-4" />} />
      </div>

      <Card>
        <Tabs defaultValue="profiles">
          <div className="px-5 pt-2">
            <TabsList>
              <TabsTrigger value="profiles">Business Profiles</TabsTrigger>
              <TabsTrigger value="rankings">Rankings</TabsTrigger>
              <TabsTrigger value="competitors">Competitors</TabsTrigger>
              <TabsTrigger value="performance">Performance</TabsTrigger>
            </TabsList>
          </div>
          <TabsContent value="profiles">
            {rows.length === 0 ? (
              <p className="px-5 py-10 text-center text-[13px] text-[var(--color-ink-tertiary)]">No locations in this scope.</p>
            ) : (
              <GoogleProfilesTable rows={rows} />
            )}
          </TabsContent>
          <TabsContent value="rankings" className="p-5">
            <CardHeader className="px-0 pt-0">
              <div>
                <CardTitle>{scope.type === "all" ? "Flagship example — " : ""}{flagshipClient.name} — {flagship.name}</CardTitle>
                <CardDescription>{scope.type === "all" ? "Rankings shown for the location most in need of SEO attention this month" : "Rankings for the current scope"}</CardDescription>
              </div>
            </CardHeader>
            <RankingsTable rankings={getRankings(flagship)} />
          </TabsContent>
          <TabsContent value="competitors" className="p-5">
            <CompetitorComparison competitors={getCompetitors(flagship)} />
          </TabsContent>
          <TabsContent value="performance" className="p-5">
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <MiniStat label="Total Reviews" value={formatNumber(locations.reduce((a, l) => a + l.reviewCount, 0))} />
              <MiniStat label="Reviews This Month" value={formatNumber(kpi.reviewsThisMonth)} />
              <MiniStat label="Active Posting Locations" value={String(locations.filter((l) => l.postsActive).length)} />
              <MiniStat label="Avg. Services Listed" value={locations.length ? String(Math.round(locations.reduce((a, l) => a + l.services, 0) / locations.length)) : "0"} />
            </div>
          </TabsContent>
        </Tabs>
      </Card>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[var(--radius-md)] border border-[var(--color-border)] p-4">
      <div className="text-[11.5px] text-[var(--color-ink-tertiary)]">{label}</div>
      <div className="mt-1 text-[20px] font-semibold text-[var(--color-ink)]">{value}</div>
    </div>
  );
}
