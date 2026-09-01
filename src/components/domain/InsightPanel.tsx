import { Sparkles, AlertTriangle, TrendingUp, Info, ArrowUpRight } from "lucide-react";
import type { Insight, Severity } from "@/lib/types";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const SEVERITY_META: Record<Severity, { label: string; icon: typeof AlertTriangle; dot: string; text: string; bg: string }> = {
  critical: { label: "Critical", icon: AlertTriangle, dot: "bg-[var(--color-critical)]", text: "text-[var(--color-critical-strong)]", bg: "bg-[var(--color-critical-soft)]" },
  attention: { label: "Attention", icon: AlertTriangle, dot: "bg-[var(--color-warning)]", text: "text-[var(--color-warning-strong)]", bg: "bg-[var(--color-warning-soft)]" },
  opportunity: { label: "Opportunity", icon: TrendingUp, dot: "bg-[var(--color-ai)]", text: "text-[var(--color-ai-strong)]", bg: "bg-[var(--color-ai-soft)]" },
  info: { label: "Information", icon: Info, dot: "bg-[var(--color-info)]", text: "text-[var(--color-info)]", bg: "bg-[var(--color-info-soft)]" },
};

export function InsightPanel({ insights }: { insights: Insight[] }) {
  return (
    <Card className="overflow-hidden">
      <div className="flex items-center gap-2 border-b border-[var(--color-border)] bg-[linear-gradient(120deg,var(--color-ai-soft)_0%,transparent_60%)] px-5 py-4">
        <div className="flex h-7 w-7 items-center justify-center rounded-[8px] bg-[var(--color-ai)] text-white">
          <Sparkles className="h-3.5 w-3.5" />
        </div>
        <div>
          <h2 className="text-[14.5px] font-semibold text-[var(--color-ink)]">ClinicOS Intelligence</h2>
          <p className="text-[12px] text-[var(--color-ink-tertiary)]">What needs attention right now</p>
        </div>
      </div>
      <div className="divide-y divide-[var(--color-border)]">
        {insights.map((insight) => {
          const meta = SEVERITY_META[insight.severity];
          const Icon = meta.icon;
          return (
            <div key={insight.id} className="flex items-start gap-3.5 px-5 py-4">
              <div className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${meta.bg}`}>
                <Icon className={`h-3.5 w-3.5 ${meta.text}`} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className={`text-[11px] font-semibold uppercase tracking-wide ${meta.text}`}>{meta.label}</span>
                </div>
                <p className="mt-0.5 text-[13.5px] font-medium text-[var(--color-ink)]">{insight.title}</p>
                <p className="mt-0.5 text-[13px] text-[var(--color-ink-tertiary)]">{insight.description}</p>
                {insight.affected && (
                  <ul className="mt-2 flex flex-col gap-1">
                    {insight.affected.slice(0, 3).map((a) => (
                      <li key={a} className="text-[12.5px] text-[var(--color-ink-secondary)]">• {a}</li>
                    ))}
                  </ul>
                )}
                <Button variant="ghost" size="sm" className="mt-2 -ml-2.5 px-2.5 text-[var(--color-ink)]">
                  {insight.actionLabel} <ArrowUpRight className="h-3 w-3" />
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
