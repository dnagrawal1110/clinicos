import { ArrowDown } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { formatNumber } from "@/lib/utils";

export interface FunnelStage {
  label: string;
  value: number;
}

export function ReviewFunnel({ stages }: { stages: FunnelStage[] }) {
  const max = stages[0]?.value || 1;
  return (
    <Card>
      <CardHeader className="flex-col items-start gap-0.5">
        <CardTitle>Review Funnel</CardTitle>
        <CardDescription>Requests sent through to completed public reviews</CardDescription>
      </CardHeader>
      <div className="flex flex-col items-center px-5 pb-6 pt-3">
        {stages.map((stage, i) => {
          const widthPct = Math.max(18, Math.round((stage.value / max) * 100));
          const prev = i > 0 ? stages[i - 1].value : null;
          const conversion = prev ? Math.round((stage.value / prev) * 1000) / 10 : null;
          return (
            <div key={stage.label} className="flex w-full flex-col items-center">
              {i > 0 && (
                <div className="flex flex-col items-center py-1.5 text-[11px] text-[var(--color-ink-tertiary)]">
                  <ArrowDown className="h-3.5 w-3.5" />
                  {conversion !== null && <span className="font-medium text-[var(--color-ink-secondary)]">{conversion}%</span>}
                </div>
              )}
              <div
                className="flex items-center justify-between rounded-[var(--radius-md)] px-5 py-3 text-white transition-all duration-500"
                style={{ width: `${widthPct}%`, minWidth: "160px", background: `color-mix(in srgb, var(--color-primary) ${85 - i * 8}%, var(--color-ai) ${i * 8}%)` }}
              >
                <span className="text-[12.5px] font-medium opacity-90">{stage.label}</span>
                <span className="text-[16px] font-semibold tabular-nums">{formatNumber(stage.value)}</span>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
