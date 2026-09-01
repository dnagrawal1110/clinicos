import Link from "next/link";
import { ChevronRight, CheckCircle2, XCircle } from "lucide-react";
import type { Location } from "@/lib/types";
import { ScoreText, ScoreDot } from "@/components/ui/health";
import { getAdjustedReviewStats } from "@/lib/scope-selectors";

function ScoreCell({ score }: { score: number }) {
  return (
    <div className="flex items-center gap-1.5 tabular-nums">
      <ScoreDot score={score} />
      <ScoreText score={score} className="text-[13px]" />
    </div>
  );
}

export function LocationHealthTable({ clientId, locations }: { clientId: string; locations: Location[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[880px] border-collapse text-left">
        <thead>
          <tr className="border-b border-[var(--color-border)] text-[11.5px] font-semibold uppercase tracking-wide text-[var(--color-ink-tertiary)]">
            <th className="py-2.5 pl-1 pr-3 font-semibold">Location</th>
            <th className="px-3 py-2.5 font-semibold">Google</th>
            <th className="px-3 py-2.5 text-right font-semibold">Google</th>
            <th className="px-3 py-2.5 text-right font-semibold">Reviews</th>
            <th className="px-3 py-2.5 text-right font-semibold">Website</th>
            <th className="px-3 py-2.5 text-right font-semibold">Social</th>
            <th className="px-3 py-2.5 text-right font-semibold">Ads</th>
            <th className="px-3 py-2.5 text-right font-semibold">Leads</th>
            <th className="px-3 py-2.5 text-right font-semibold">Health</th>
            <th className="py-2.5 pl-3 pr-1"></th>
          </tr>
        </thead>
        <tbody>
          {locations.map((loc) => {
            const stats = getAdjustedReviewStats(loc);
            return (
              <tr key={loc.id} className="group border-b border-[var(--color-border)] last:border-0 hover:bg-[var(--color-surface-sunken)]">
                <td className="py-3 pl-1 pr-3">
                  <Link href={`/clients/${clientId}/locations/${loc.id}`} className="block">
                    <div className="text-[13.5px] font-medium text-[var(--color-ink)] group-hover:text-[var(--color-primary-strong)]">{loc.name}</div>
                    <div className="text-[12px] text-[var(--color-ink-tertiary)]">{loc.city}</div>
                  </Link>
                </td>
                <td className="px-3 py-3">
                  {loc.googleConnected ? (
                    <span className="flex items-center gap-1 text-[12px] font-medium text-[var(--color-success-strong)]"><CheckCircle2 className="h-3.5 w-3.5" /> Connected</span>
                  ) : (
                    <span className="flex items-center gap-1 text-[12px] font-medium text-[var(--color-critical-strong)]"><XCircle className="h-3.5 w-3.5" /> Disconnected</span>
                  )}
                </td>
                <td className="px-3 py-3 text-right"><ScoreCell score={loc.scores.google} /></td>
                <td className="px-3 py-3 text-right text-[13px] tabular-nums text-[var(--color-ink-secondary)]">{stats.reviewCount.toLocaleString("en-IN")}</td>
                <td className="px-3 py-3 text-right"><ScoreCell score={loc.scores.website} /></td>
                <td className="px-3 py-3 text-right"><ScoreCell score={loc.scores.social} /></td>
                <td className="px-3 py-3 text-right">
                  {loc.hasAds ? <ScoreCell score={loc.scores.ads} /> : <span className="text-[13px] text-[var(--color-ink-tertiary)]">—</span>}
                </td>
                <td className="px-3 py-3 text-right"><ScoreCell score={loc.scores.leads} /></td>
                <td className="px-3 py-3 text-right"><ScoreText score={loc.healthOverall} className="text-[14px]" /></td>
                <td className="py-3 pl-3 pr-1 text-right">
                  <Link href={`/clients/${clientId}/locations/${loc.id}`}>
                    <ChevronRight className="h-4 w-4 text-[var(--color-ink-tertiary)] group-hover:text-[var(--color-ink)]" />
                  </Link>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
