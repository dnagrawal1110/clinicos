"use client";

import Link from "next/link";
import { IndianRupee, Target, Percent, CalendarCheck2 } from "lucide-react";
import { PageHeader } from "@/components/shell/PageHeader";
import { StatCard } from "@/components/ui/stat-card";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getClient } from "@/lib/mock/clients";
import { useScope } from "@/lib/scope-context";
import { getScopedAds } from "@/lib/scope-selectors";
import { formatINR, formatNumber } from "@/lib/utils";

export default function AdsPage() {
  const { scope, scopeMeta } = useScope();
  const campaigns = getScopedAds(scope);
  const totalSpend = campaigns.reduce((a, c) => a + c.spend, 0);
  const totalLeads = campaigns.reduce((a, c) => a + c.leads, 0);
  const avgCPL = totalLeads ? Math.round(totalSpend / totalLeads) : 0;
  const totalAppointments = campaigns.reduce((a, c) => a + c.appointments, 0);
  const avgCPA = totalAppointments ? Math.round(totalSpend / totalAppointments) : 0;
  const avgConversion = campaigns.length ? (campaigns.reduce((a, c) => a + c.conversionRate, 0) / campaigns.length).toFixed(1) : "0.0";

  const clientName = (id: string) => getClient(id)?.name ?? id;
  const locationName = (clientId: string, locationId: string) => getClient(clientId)?.locations.find((l) => l.id === locationId)?.name ?? locationId;

  return (
    <div className="animate-fade-in">
      <PageHeader
        breadcrumb={scope.type !== "all" ? scopeMeta.crumbs.concat({ label: "Ads" }) : undefined}
        title="Ads"
        subtitle={scope.type === "all" ? "Google and Meta campaign performance across every client and location." : `Ad performance for ${scopeMeta.title}.`}
      />

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <StatCard label="Spend (This Month)" value={formatINR(totalSpend)} icon={<IndianRupee className="h-4 w-4" />} />
        <StatCard label="Leads" value={formatNumber(totalLeads)} icon={<Target className="h-4 w-4" />} />
        <StatCard label="Avg. CPL" value={formatINR(avgCPL)} />
        <StatCard label="Appointments" value={formatNumber(totalAppointments)} icon={<CalendarCheck2 className="h-4 w-4" />} />
        <StatCard label="Avg. CPA" value={formatINR(avgCPA)} />
        <StatCard label="Conversion Rate" value={`${avgConversion}%`} icon={<Percent className="h-4 w-4" />} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Campaigns</CardTitle>
          <span className="text-[12px] text-[var(--color-ink-tertiary)]">{campaigns.length} in scope</span>
        </CardHeader>
        <div className="overflow-x-auto px-5 pb-5 pt-2">
          {campaigns.length === 0 ? (
            <p className="py-10 text-center text-[13px] text-[var(--color-ink-tertiary)]">No ad campaigns in this scope.</p>
          ) : (
          <table className="w-full min-w-[820px] border-collapse text-left">
            <thead>
              <tr className="border-b border-[var(--color-border)] text-[11px] font-semibold uppercase tracking-wide text-[var(--color-ink-tertiary)]">
                <th className="py-2.5 pr-3">Campaign</th>
                <th className="px-3 py-2.5">Client — Location</th>
                <th className="px-3 py-2.5">Platform</th>
                <th className="px-3 py-2.5 text-right">Spend</th>
                <th className="px-3 py-2.5 text-right">Leads</th>
                <th className="px-3 py-2.5 text-right">CPL</th>
                <th className="px-3 py-2.5 text-right">Appointments</th>
                <th className="px-3 py-2.5 text-right">CPA</th>
                <th className="py-2.5 pl-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {campaigns.slice(0, 60).map((c) => (
                <tr key={c.id} className="border-b border-[var(--color-border)] last:border-0 hover:bg-[var(--color-surface-sunken)]">
                  <td className="py-3 pr-3">
                    <Link href={`/ads/${c.id}`} className="text-[13px] font-medium text-[var(--color-ink)] hover:text-[var(--color-primary-strong)]">{c.name}</Link>
                    <div className="text-[11.5px] text-[var(--color-ink-tertiary)]">{c.service} · {c.landingPage}</div>
                  </td>
                  <td className="px-3 py-3 text-[12.5px] text-[var(--color-ink-secondary)]">{clientName(c.clientId)} — {locationName(c.clientId, c.locationId)}</td>
                  <td className="px-3 py-3"><Badge variant="neutral" className="capitalize">{c.platform}</Badge></td>
                  <td className="px-3 py-3 text-right text-[13px] tabular-nums">{formatINR(c.spend)}</td>
                  <td className="px-3 py-3 text-right text-[13px] tabular-nums">{c.leads}</td>
                  <td className="px-3 py-3 text-right text-[13px] tabular-nums">{formatINR(c.cpl)}</td>
                  <td className="px-3 py-3 text-right text-[13px] tabular-nums">{c.appointments}</td>
                  <td className="px-3 py-3 text-right text-[13px] tabular-nums">{formatINR(c.cpa)}</td>
                  <td className="py-3 pl-3"><Badge variant={c.status === "active" ? "success" : "warning"} className="capitalize">{c.status}</Badge></td>
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
