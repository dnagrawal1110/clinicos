"use client";

import Link from "next/link";
import { Users, MapPin, CheckCircle2, Star, Megaphone, CheckSquare, ArrowUpRight, Stethoscope } from "lucide-react";
import { StatCard } from "@/components/ui/stat-card";
import { InsightPanel } from "@/components/domain/InsightPanel";
import { PortfolioHealth } from "@/components/domain/PortfolioHealth";
import { ClientHealthTable } from "@/components/domain/ClientHealthTable";
import { LocationHealthTable } from "@/components/domain/LocationHealthTable";
import { LocationCard } from "@/components/domain/LocationCard";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ALL_CLIENTS } from "@/lib/mock/clients";
import { useScope } from "@/lib/scope-context";
import { useRuntimeStore } from "@/lib/runtime-store";
import { getScopedKpi, getScopedInsights, getScopedLocations, getScopedClients } from "@/lib/scope-selectors";
import { getDiagnosis } from "@/lib/mock/location-detail";
import { formatNumber } from "@/lib/utils";
import type { Insight } from "@/lib/types";

export default function CommandCenterPage() {
  useRuntimeStore(); // subscribe so ReviewFlow completions/campaigns re-render this page
  const { scope, scopeMeta } = useScope();
  const kpi = getScopedKpi(scope);
  const clients = getScopedClients(scope);
  const locations = getScopedLocations(scope);

  let insights = getScopedInsights(scope);
  if (scope.type === "location" && scopeMeta.location) {
    const diag = getDiagnosis(scopeMeta.location);
    insights = diag.diagnosis.map((line, i) => ({
      id: `diag-${i}`,
      severity: i === 0 ? "attention" : "info",
      title: line,
      description: `Recommended: ${diag.actions[i]?.label ?? diag.actions[0]?.label ?? "review this location"}.`,
      actionLabel: "Open location workspace",
      module: "location",
    } satisfies Insight));
  } else if (scope.type === "client" && insights.length === 0 && scopeMeta.client) {
    const worst = [...scopeMeta.client.locations].sort((a, b) => a.healthOverall - b.healthOverall)[0];
    if (worst) {
      const diag = getDiagnosis(worst);
      insights = diag.diagnosis.slice(0, 3).map((line, i) => ({
        id: `diag-${i}`, severity: i === 0 ? "attention" : "info", title: line,
        description: `${worst.name} needs the most attention across ${scopeMeta.client!.name}'s locations.`,
        actionLabel: "Open location", module: "location",
      } satisfies Insight));
    }
  }

  const subtitle =
    scope.type === "all" ? "Here's what needs attention across your clinic portfolio."
      : scope.type === "client" ? `Here's what needs attention across ${scopeMeta.client?.name}'s ${locations.length} location${locations.length !== 1 ? "s" : ""}.`
        : `Here's what needs attention at ${scopeMeta.title}.`;

  const topClients = [...ALL_CLIENTS].sort((a, b) => a.healthOverall - b.healthOverall).slice(0, 8);

  return (
    <div className="animate-fade-in">
      <div className="mb-6">
        <h1 className="text-[22px] font-semibold tracking-tight text-[var(--color-ink)]">Good afternoon, Deepak</h1>
        <p className="mt-1 text-[13.5px] text-[var(--color-ink-tertiary)]">{subtitle}</p>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {scope.type === "all" ? (
          <StatCard label="Active Clients" value={kpi.clientCount} icon={<Users className="h-4 w-4" />} />
        ) : (
          <StatCard
            label="Doctors"
            value={scope.type === "location" ? (scopeMeta.location?.doctorIds.length ?? 0) : clients.reduce((a, c) => a + c.doctors.length, 0)}
            icon={<Stethoscope className="h-4 w-4" />}
          />
        )}
        <StatCard label="Locations" value={kpi.locationCount} icon={<MapPin className="h-4 w-4" />} />
        <StatCard
          label="Connected Google Profiles"
          value={`${kpi.connectedGoogle} / ${kpi.locationCount}`}
          icon={<CheckCircle2 className="h-4 w-4" />}
        />
        <StatCard label="Reviews This Month" value={formatNumber(kpi.reviewsThisMonth)} icon={<Star className="h-4 w-4" />} trend={{ value: 12 }} />
        <StatCard label="Active Campaigns" value={kpi.activeCampaigns} icon={<Megaphone className="h-4 w-4" />} />
        <StatCard label="Open Tasks" value={kpi.openTasks} icon={<CheckSquare className="h-4 w-4" />} />
      </div>

      <div className="mb-6 grid grid-cols-1 gap-5 lg:grid-cols-[1.15fr_1fr]">
        <InsightPanel insights={insights} />
        <PortfolioHealth scores={kpi.scores} overall={kpi.healthOverall} trend={scope.type === "client" ? (scopeMeta.client?.healthTrend ?? 0) : 8} />
      </div>

      {scope.type === "all" && (
        <Card>
          <CardHeader>
            <CardTitle>Clients needing attention</CardTitle>
            <Link href="/clients">
              <Button variant="ghost" size="sm">View all clients <ArrowUpRight className="h-3.5 w-3.5" /></Button>
            </Link>
          </CardHeader>
          <div className="px-5 pb-5 pt-3">
            <ClientHealthTable clients={topClients} />
          </div>
        </Card>
      )}

      {scope.type === "client" && scopeMeta.client && (
        <Card>
          <CardHeader>
            <CardTitle>{scopeMeta.client.name}&rsquo;s locations</CardTitle>
            <Link href={`/clients/${scopeMeta.client.id}`}>
              <Button variant="ghost" size="sm">Open client workspace <ArrowUpRight className="h-3.5 w-3.5" /></Button>
            </Link>
          </CardHeader>
          <div className="px-5 pb-5 pt-3">
            <LocationHealthTable clientId={scopeMeta.client.id} locations={scopeMeta.client.locations} />
          </div>
        </Card>
      )}

      {scope.type === "location" && scopeMeta.client && scopeMeta.location && (
        <Card>
          <CardHeader>
            <CardTitle>Location snapshot</CardTitle>
            <Link href={`/clients/${scopeMeta.client.id}/locations/${scopeMeta.location.id}`}>
              <Button variant="primary" size="sm">Open location workspace <ArrowUpRight className="h-3.5 w-3.5" /></Button>
            </Link>
          </CardHeader>
          <div className="max-w-sm px-5 pb-5 pt-3">
            <LocationCard clientId={scopeMeta.client.id} location={scopeMeta.location} />
          </div>
        </Card>
      )}
    </div>
  );
}
