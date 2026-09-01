import Link from "next/link";
import type { Location } from "@/lib/types";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ScoreText, ScoreDot } from "@/components/ui/health";
import { REVIEW_CAMPAIGNS, campaignConversionRate } from "@/lib/mock/operations";
import { getClient } from "@/lib/mock/clients";
import { getAdjustedReviewStats } from "@/lib/scope-selectors";

export function LocationComparisonTable({ locations }: { locations: Location[] }) {
  const rows = locations.map((loc) => {
    const campaign = REVIEW_CAMPAIGNS.find((c) => c.locationId === loc.id);
    const stats = getAdjustedReviewStats(loc);
    return {
      loc,
      client: getClient(loc.clientId)!,
      stats,
      velocity: Math.round((loc.reviewsThisMonth / 30) * 10) / 10,
      requests: campaign?.requestsSent ?? 0,
      conversion: campaign ? campaignConversionRate(campaign) : 0,
    };
  }).sort((a, b) => a.loc.healthOverall - b.loc.healthOverall);

  return (
    <Card>
      <CardHeader className="flex-col items-start gap-0.5">
        <CardTitle>Location Comparison</CardTitle>
        <CardDescription>Sorted by health — weakest locations surface first</CardDescription>
      </CardHeader>
      <div className="overflow-x-auto px-5 pb-5 pt-2">
        <table className="w-full min-w-[760px] border-collapse text-left">
          <thead>
            <tr className="border-b border-[var(--color-border)] text-[11px] font-semibold uppercase tracking-wide text-[var(--color-ink-tertiary)]">
              <th className="py-2.5 pr-3">Location</th>
              <th className="px-3 py-2.5 text-right">Rating</th>
              <th className="px-3 py-2.5 text-right">Total Reviews</th>
              <th className="px-3 py-2.5 text-right">This Month</th>
              <th className="px-3 py-2.5 text-right">Velocity</th>
              <th className="px-3 py-2.5 text-right">Requests</th>
              <th className="px-3 py-2.5 text-right">Conversion</th>
              <th className="px-3 py-2.5 text-right">Health</th>
              <th className="py-2.5 pl-3"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ loc, client, stats, velocity, requests, conversion }) => (
              <tr key={loc.id} className="border-b border-[var(--color-border)] last:border-0 hover:bg-[var(--color-surface-sunken)]">
                <td className="py-2.5 pr-3">
                  <div className="text-[13px] font-medium text-[var(--color-ink)]">{loc.name}</div>
                  <div className="text-[11.5px] text-[var(--color-ink-tertiary)]">{client.name}</div>
                </td>
                <td className="px-3 py-2.5 text-right text-[13px] tabular-nums">{stats.rating.toFixed(1)}</td>
                <td className="px-3 py-2.5 text-right text-[13px] tabular-nums">{stats.reviewCount.toLocaleString("en-IN")}</td>
                <td className="px-3 py-2.5 text-right text-[13px] tabular-nums">+{stats.reviewsThisMonth}</td>
                <td className="px-3 py-2.5 text-right text-[13px] tabular-nums">{velocity}/day</td>
                <td className="px-3 py-2.5 text-right text-[13px] tabular-nums">{requests}</td>
                <td className="px-3 py-2.5 text-right text-[13px] tabular-nums">{conversion}%</td>
                <td className="px-3 py-2.5 text-right">
                  <span className="inline-flex items-center gap-1.5"><ScoreDot score={loc.healthOverall} /><ScoreText score={loc.healthOverall} className="text-[13px]" /></span>
                </td>
                <td className="py-2.5 pl-3 text-right">
                  <Link href={`/clients/${client.id}/locations/${loc.id}`} className="text-[12px] font-medium text-[var(--color-primary-strong)] hover:underline">Open</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
