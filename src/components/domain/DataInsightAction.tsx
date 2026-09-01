import type { ReactNode } from "react";
import { Activity, Lightbulb, ArrowRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export function DataInsightAction({
  data, insight, actionLabel, onAction, actionHref,
}: {
  data: ReactNode;
  insight: ReactNode;
  actionLabel: string;
  onAction?: () => void;
  actionHref?: string;
}) {
  return (
    <Card className="overflow-hidden">
      <div className="grid grid-cols-1 divide-y divide-[var(--color-border)] sm:grid-cols-3 sm:divide-x sm:divide-y-0">
        <div className="px-4 py-3.5">
          <div className="flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-wide text-[var(--color-ink-tertiary)]">
            <Activity className="h-3 w-3" /> Data
          </div>
          <div className="mt-1.5 text-[13.5px] font-medium text-[var(--color-ink)]">{data}</div>
        </div>
        <div className="px-4 py-3.5">
          <div className="flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-wide text-[var(--color-ai-strong)]">
            <Lightbulb className="h-3 w-3" /> Insight
          </div>
          <div className="mt-1.5 text-[13px] text-[var(--color-ink-secondary)]">{insight}</div>
        </div>
        <div className="flex items-center px-4 py-3.5">
          {actionHref ? (
            <a href={actionHref} className="inline-flex items-center gap-1.5 rounded-[var(--radius-sm)] bg-[var(--color-primary)] px-3.5 py-2 text-[12.5px] font-medium text-white hover:bg-[var(--color-primary-strong)]">
              {actionLabel} <ArrowRight className="h-3.5 w-3.5" />
            </a>
          ) : (
            <Button variant="primary" size="sm" onClick={onAction}>{actionLabel} <ArrowRight className="h-3.5 w-3.5" /></Button>
          )}
        </div>
      </div>
    </Card>
  );
}
