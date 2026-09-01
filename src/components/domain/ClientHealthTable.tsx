import Link from "next/link";
import { ChevronRight } from "lucide-react";
import type { Client } from "@/lib/types";
import { ScoreText, ScoreDot } from "@/components/ui/health";
import { Badge } from "@/components/ui/badge";

const STATUS_VARIANT: Record<Client["status"], "success" | "warning" | "critical" | "neutral"> = {
  active: "success",
  onboarding: "neutral",
  "at-risk": "critical",
  paused: "warning",
};

function ScoreCell({ score }: { score: number }) {
  return (
    <div className="flex items-center gap-1.5 tabular-nums">
      <ScoreDot score={score} />
      <ScoreText score={score} className="text-[13px]" />
    </div>
  );
}

export function ClientHealthTable({ clients }: { clients: Client[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[880px] border-collapse text-left">
        <thead>
          <tr className="border-b border-[var(--color-border)] text-[11.5px] font-semibold uppercase tracking-wide text-[var(--color-ink-tertiary)]">
            <th className="py-2.5 pl-1 pr-3 font-semibold">Client</th>
            <th className="px-3 py-2.5 font-semibold">Status</th>
            <th className="px-3 py-2.5 text-right font-semibold">Locations</th>
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
          {clients.map((client) => (
            <tr key={client.id} className="group border-b border-[var(--color-border)] last:border-0 hover:bg-[var(--color-surface-sunken)]">
              <td className="py-3 pl-1 pr-3">
                <Link href={`/clients/${client.id}`} className="block">
                  <div className="text-[13.5px] font-medium text-[var(--color-ink)] group-hover:text-[var(--color-primary-strong)]">{client.name}</div>
                  <div className="text-[12px] text-[var(--color-ink-tertiary)]">{client.specialty} · {client.city}</div>
                </Link>
              </td>
              <td className="px-3 py-3">
                <Badge variant={STATUS_VARIANT[client.status]}>{client.status.replace("-", " ")}</Badge>
              </td>
              <td className="px-3 py-3 text-right text-[13px] tabular-nums text-[var(--color-ink-secondary)]">{client.locations.length}</td>
              <td className="px-3 py-3 text-right"><ScoreCell score={client.scores.google} /></td>
              <td className="px-3 py-3 text-right"><ScoreCell score={client.scores.reputation} /></td>
              <td className="px-3 py-3 text-right"><ScoreCell score={client.scores.website} /></td>
              <td className="px-3 py-3 text-right"><ScoreCell score={client.scores.social} /></td>
              <td className="px-3 py-3 text-right">
                {client.scores.ads > 0 ? <ScoreCell score={client.scores.ads} /> : <span className="text-[13px] text-[var(--color-ink-tertiary)]">—</span>}
              </td>
              <td className="px-3 py-3 text-right"><ScoreCell score={client.scores.leads} /></td>
              <td className="px-3 py-3 text-right">
                <ScoreText score={client.healthOverall} className="text-[14px]" />
              </td>
              <td className="py-3 pl-3 pr-1 text-right">
                <Link href={`/clients/${client.id}`}>
                  <ChevronRight className="h-4 w-4 text-[var(--color-ink-tertiary)] group-hover:text-[var(--color-ink)]" />
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
