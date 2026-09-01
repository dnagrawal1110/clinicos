"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getClient } from "@/lib/mock/clients";
import { computeProgramHealth } from "@/lib/mock/review-programs";
import type { Location } from "@/lib/types";

type SortMode = "potential" | "decline" | "velocity" | "conversion" | "rating-improvement";

const SORT_OPTIONS: { value: SortMode; label: string }[] = [
  { value: "potential", label: "Highest potential" },
  { value: "decline", label: "Largest decline" },
  { value: "velocity", label: "Lowest velocity" },
  { value: "conversion", label: "Lowest conversion" },
  { value: "rating-improvement", label: "Largest rating improvement" },
];

interface OpportunityRow {
  location: Location;
  score: number;
  metricLabel: string;
  metricValue: string;
}

function rowsFor(locations: Location[], mode: SortMode): OpportunityRow[] {
  return locations
    .map((location) => {
      const health = computeProgramHealth(location);
      switch (mode) {
        case "potential":
          return { location, score: 100 - location.healthOverall, metricLabel: "Health headroom", metricValue: `${100 - location.healthOverall} pts` };
        case "decline":
          return { location, score: -location.reviewDelta30d, metricLabel: "30-day velocity change", metricValue: `${location.reviewDelta30d > 0 ? "+" : ""}${location.reviewDelta30d}%` };
        case "velocity":
          return { location, score: -location.reviewsThisMonth, metricLabel: "Reviews this month", metricValue: String(location.reviewsThisMonth) };
        case "conversion":
          return { location, score: -health.breakdown.reviewConversion, metricLabel: "Review conversion", metricValue: `${health.breakdown.reviewConversion}%` };
        case "rating-improvement":
          return { location, score: (5 - location.rating) * Math.log10(location.reviewCount + 10), metricLabel: "Rating uplift opportunity", metricValue: `${location.rating.toFixed(1)}★ · ${location.reviewCount} reviews` };
      }
    })
    .sort((a, b) => b.score - a.score);
}

export function ReputationOpportunities({ locations }: { locations: Location[] }) {
  const [mode, setMode] = useState<SortMode>("potential");
  const rows = useMemo(() => rowsFor(locations, mode).slice(0, 10), [locations, mode]);

  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>Reputation Opportunities</CardTitle>
          <CardDescription>Ranked locations worth prioritizing this week</CardDescription>
        </div>
        <select
          value={mode}
          onChange={(e) => setMode(e.target.value as SortMode)}
          className="h-8 rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-surface-sunken)] px-2.5 text-[12.5px] outline-none"
        >
          {SORT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </CardHeader>
      <div className="flex flex-col divide-y divide-[var(--color-border)] px-5 pb-3">
        {rows.length === 0 ? (
          <p className="py-8 text-center text-[13px] text-[var(--color-ink-tertiary)]">No locations in this scope.</p>
        ) : rows.map((row, i) => {
          const client = getClient(row.location.clientId);
          return (
            <Link
              key={row.location.id}
              href={`/clients/${row.location.clientId}/locations/${row.location.id}`}
              className="flex items-center gap-3 py-3 hover:bg-[var(--color-surface-sunken)]"
            >
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--color-surface-sunken)] text-[11px] font-semibold text-[var(--color-ink-tertiary)]">{i + 1}</span>
              <div className="min-w-0 flex-1">
                <div className="truncate text-[13px] font-medium text-[var(--color-ink)]">{client?.name} — {row.location.name}</div>
                <div className="text-[11.5px] text-[var(--color-ink-tertiary)]">{row.metricLabel}: {row.metricValue}</div>
              </div>
              {row.location.healthOverall < 55 && <Badge variant="warning">Needs attention</Badge>}
              <ArrowUpRight className="h-3.5 w-3.5 shrink-0 text-[var(--color-ink-tertiary)]" />
            </Link>
          );
        })}
      </div>
    </Card>
  );
}
