import type { RankingKeyword } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { rngFor, randInt } from "@/lib/mock/rng";

function rankColor(pos: number) {
  if (pos <= 3) return "var(--color-success)";
  if (pos <= 10) return "var(--color-warning)";
  return "var(--color-critical)";
}

function GeoGrid({ keyword, position }: { keyword: string; position: number }) {
  const rng = rngFor(keyword);
  const cells = Array.from({ length: 25 }, (_, i) => {
    const center = Math.abs(i % 5 - 2) + Math.abs(Math.floor(i / 5) - 2);
    const drift = randInt(rng, -2, 3);
    return Math.max(1, Math.min(20, position + center * 2 + drift));
  });
  return (
    <div className="grid grid-cols-5 gap-1">
      {cells.map((p, i) => (
        <div
          key={i}
          className="flex h-6 w-6 items-center justify-center rounded-[4px] text-[9px] font-semibold text-white"
          style={{ background: rankColor(p) }}
          title={`Rank ${p}`}
        >
          {p}
        </div>
      ))}
    </div>
  );
}

export function RankingsTable({ rankings }: { rankings: RankingKeyword[] }) {
  const top = rankings[0];
  return (
    <Card>
      <CardHeader className="flex-col items-start gap-0.5">
        <CardTitle>Local Search Rankings</CardTitle>
        <CardDescription>Tracked keyword positions in the local map pack</CardDescription>
      </CardHeader>
      <CardContent className="grid grid-cols-1 gap-6 lg:grid-cols-[1.3fr_1fr]">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="border-b border-[var(--color-border)] text-[11px] font-semibold uppercase tracking-wide text-[var(--color-ink-tertiary)]">
              <th className="py-2 pr-3">Keyword</th>
              <th className="px-3 py-2 text-right">Current</th>
              <th className="px-3 py-2 text-right">Previous</th>
              <th className="py-2 pl-3 text-right">Change</th>
            </tr>
          </thead>
          <tbody>
            {rankings.map((r) => {
              const change = r.previous - r.position;
              return (
                <tr key={r.keyword} className="border-b border-[var(--color-border)] last:border-0">
                  <td className="py-2.5 pr-3 text-[13px] text-[var(--color-ink)]">&ldquo;{r.keyword}&rdquo;</td>
                  <td className="px-3 py-2.5 text-right">
                    <span className="inline-flex h-6 w-6 items-center justify-center rounded-full text-[12px] font-semibold text-white" style={{ background: rankColor(r.position) }}>
                      {r.position}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-right text-[13px] text-[var(--color-ink-tertiary)]">#{r.previous}</td>
                  <td className="py-2.5 pl-3 text-right text-[13px] font-medium tabular-nums" style={{ color: change > 0 ? "var(--color-success)" : change < 0 ? "var(--color-critical)" : "var(--color-ink-tertiary)" }}>
                    {change > 0 ? `↑ ${change}` : change < 0 ? `↓ ${Math.abs(change)}` : "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {top && (
          <div className="flex flex-col items-center gap-2 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-sunken)] p-4">
            <span className="text-[11.5px] font-medium text-[var(--color-ink-tertiary)]">Local pack visualization</span>
            <GeoGrid keyword={top.keyword} position={top.position} />
            <span className="text-center text-[11.5px] text-[var(--color-ink-tertiary)]">Simulated rank grid for &ldquo;{top.keyword}&rdquo;</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
