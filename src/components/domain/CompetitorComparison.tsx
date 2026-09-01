import type { Competitor } from "@/lib/types";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const METRICS: { key: keyof Competitor; label: string; suffix?: string }[] = [
  { key: "reviews", label: "Reviews" },
  { key: "rating", label: "Rating" },
  { key: "reviewVelocity", label: "Review velocity", suffix: "/mo" },
  { key: "services", label: "Services" },
  { key: "photos", label: "Photos" },
  { key: "googleActivity", label: "Google activity", suffix: "/mo" },
  { key: "websiteStrength", label: "Website strength" },
  { key: "localVisibility", label: "Local visibility" },
];

export function CompetitorComparison({ competitors }: { competitors: Competitor[] }) {
  const [you, ...rivals] = competitors;
  return (
    <Card>
      <CardHeader className="flex-col items-start gap-0.5">
        <CardTitle>Why competitors are winning</CardTitle>
        <CardDescription>Head-to-head comparison across key growth signals</CardDescription>
      </CardHeader>
      <div className="overflow-x-auto px-5 pb-5 pt-2">
        <table className="w-full min-w-[560px] border-collapse text-left">
          <thead>
            <tr className="border-b border-[var(--color-border)] text-[11.5px] font-semibold uppercase tracking-wide text-[var(--color-ink-tertiary)]">
              <th className="py-2.5 pr-3">Metric</th>
              <th className="px-3 py-2.5 text-right text-[var(--color-primary-strong)]">{you.name}</th>
              {rivals.map((r) => (
                <th key={r.name} className="px-3 py-2.5 text-right">{r.name}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {METRICS.map((m) => {
              const youVal = you[m.key] as number;
              return (
                <tr key={m.label} className="border-b border-[var(--color-border)] last:border-0">
                  <td className="py-2.5 pr-3 text-[13px] text-[var(--color-ink-secondary)]">{m.label}</td>
                  <td className="px-3 py-2.5 text-right text-[13px] font-semibold text-[var(--color-primary-strong)] tabular-nums">
                    {youVal}{m.suffix ?? ""}
                  </td>
                  {rivals.map((r) => {
                    const val = r[m.key] as number;
                    const winning = val > youVal;
                    return (
                      <td key={r.name} className={cn("px-3 py-2.5 text-right text-[13px] tabular-nums", winning ? "font-medium text-[var(--color-critical)]" : "text-[var(--color-ink-tertiary)]")}>
                        {val}{m.suffix ?? ""}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
