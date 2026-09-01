"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Search, CheckCircle2, XCircle } from "lucide-react";
import { PageHeader } from "@/components/shell/PageHeader";
import { Card } from "@/components/ui/card";
import { ScoreDot, ScoreText, TrendTag } from "@/components/ui/health";
import { ALL_CLIENTS } from "@/lib/mock/clients";
import { useScope } from "@/lib/scope-context";
import { getScopedLocations } from "@/lib/scope-selectors";

export default function LocationsPage() {
  const { scope, scopeMeta } = useScope();
  const [query, setQuery] = useState("");
  const scopedLocations = getScopedLocations(scope);
  const rows = useMemo(
    () => scopedLocations.map((location) => ({ client: ALL_CLIENTS.find((c) => c.id === location.clientId)!, location })),
    [scopedLocations]
  );
  const filtered = rows.filter(({ client, location }) => `${client.name} ${location.name} ${location.city}`.toLowerCase().includes(query.toLowerCase()));

  return (
    <div className="animate-fade-in">
      <PageHeader
        breadcrumb={scope.type !== "all" ? scopeMeta.crumbs.concat({ label: "Locations" }) : undefined}
        title="Locations"
        subtitle={scope.type === "all" ? `${rows.length} locations across ${ALL_CLIENTS.length} clients` : `${rows.length} location${rows.length !== 1 ? "s" : ""} for ${scopeMeta.title}`}
      />

      <Card>
        <div className="flex items-center gap-2 border-b border-[var(--color-border)] px-5 py-3.5">
          <div className="flex h-8 w-72 items-center gap-2 rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-surface-sunken)] px-2.5">
            <Search className="h-3.5 w-3.5 text-[var(--color-ink-tertiary)]" />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search locations, clients, cities..." className="w-full bg-transparent text-[13px] outline-none" />
          </div>
          <span className="ml-auto text-[12px] text-[var(--color-ink-tertiary)]">{filtered.length} results</span>
        </div>
        <div className="overflow-x-auto px-5 pb-5 pt-3">
          <table className="w-full min-w-[820px] border-collapse text-left">
            <thead>
              <tr className="border-b border-[var(--color-border)] text-[11px] font-semibold uppercase tracking-wide text-[var(--color-ink-tertiary)]">
                <th className="py-2.5 pr-3">Location</th>
                <th className="px-3 py-2.5">Client</th>
                <th className="px-3 py-2.5">Google</th>
                <th className="px-3 py-2.5 text-right">Rating</th>
                <th className="px-3 py-2.5 text-right">Reviews (mo)</th>
                <th className="px-3 py-2.5 text-right">Health</th>
                <th className="py-2.5 pl-3"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.slice(0, 60).map(({ client, location }) => (
                <tr key={location.id} className="border-b border-[var(--color-border)] last:border-0 hover:bg-[var(--color-surface-sunken)]">
                  <td className="py-2.5 pr-3 text-[13px] font-medium text-[var(--color-ink)]">{location.name}, {location.city}</td>
                  <td className="px-3 py-2.5 text-[12.5px] text-[var(--color-ink-secondary)]">{client.name}</td>
                  <td className="px-3 py-2.5">
                    {location.googleConnected ? <CheckCircle2 className="h-4 w-4 text-[var(--color-success)]" /> : <XCircle className="h-4 w-4 text-[var(--color-critical)]" />}
                  </td>
                  <td className="px-3 py-2.5 text-right text-[13px] tabular-nums">{location.rating.toFixed(1)}</td>
                  <td className="px-3 py-2.5 text-right">
                    <span className="inline-flex items-center gap-1 text-[13px] tabular-nums">+{location.reviewsThisMonth} <TrendTag value={location.reviewDelta30d} /></span>
                  </td>
                  <td className="px-3 py-2.5 text-right"><span className="inline-flex items-center gap-1.5"><ScoreDot score={location.healthOverall} /><ScoreText score={location.healthOverall} className="text-[13px]" /></span></td>
                  <td className="py-2.5 pl-3 text-right">
                    <Link href={`/clients/${client.id}/locations/${location.id}`} className="text-[12.5px] font-medium text-[var(--color-primary-strong)] hover:underline">Open</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
