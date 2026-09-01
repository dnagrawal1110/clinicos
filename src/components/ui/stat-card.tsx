import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function StatCard({
  label, value, sub, trend, icon,
}: {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  trend?: { value: number; positive?: boolean };
  icon?: ReactNode;
}) {
  return (
    <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3.5">
      <div className="flex items-center justify-between">
        <span className="text-[12px] font-medium text-[var(--color-ink-tertiary)]">{label}</span>
        {icon && <span className="text-[var(--color-ink-tertiary)]">{icon}</span>}
      </div>
      <div className="mt-1.5 flex items-baseline gap-2">
        <span className="text-[22px] font-semibold tabular-nums tracking-tight text-[var(--color-ink)]">{value}</span>
        {trend && (
          <span className={cn("text-[12px] font-medium tabular-nums", (trend.positive ?? trend.value >= 0) ? "text-[var(--color-success)]" : "text-[var(--color-critical)]")}>
            {(trend.positive ?? trend.value >= 0) ? "↑" : "↓"} {Math.abs(trend.value)}%
          </span>
        )}
      </div>
      {sub && <div className="mt-0.5 text-[12px] text-[var(--color-ink-tertiary)]">{sub}</div>}
    </div>
  );
}
