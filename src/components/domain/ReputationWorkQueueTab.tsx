"use client";

import Link from "next/link";
import { Sparkles, AlertOctagon, ArrowUpRight } from "lucide-react";
import type { Scope } from "@/lib/scope-context";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getWorkQueue, getDailyBrief, type WorkQueuePriority } from "@/lib/mock/work-queue";

const PRIORITY_VARIANT: Record<WorkQueuePriority, "critical" | "warning" | "info" | "neutral"> = {
  critical: "critical", high: "warning", medium: "info", low: "neutral",
};

const PRIORITY_LABEL: Record<WorkQueuePriority, string> = {
  critical: "Critical", high: "High", medium: "Medium", low: "Low",
};

export function ReputationWorkQueueTab({ scope }: { scope: Scope }) {
  const items = getWorkQueue(scope);
  const brief = getDailyBrief(scope, "Deepak");

  return (
    <div className="flex flex-col gap-5">
      <Card className="overflow-hidden">
        <div className="flex items-center gap-3 border-b border-[var(--color-border)] bg-[linear-gradient(120deg,var(--color-ai-soft)_0%,transparent_70%)] px-5 py-4">
          <Sparkles className="h-4 w-4 text-[var(--color-ai)]" />
          <div>
            <CardTitle>{brief.greeting}</CardTitle>
            <CardDescription>{brief.totalActions} reputation action{brief.totalActions !== 1 ? "s" : ""} need attention today.</CardDescription>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-4 px-5 py-4 text-center">
          <div>
            <div className="text-[20px] font-semibold tabular-nums text-[var(--color-critical-strong)]">{brief.critical}</div>
            <div className="text-[11.5px] text-[var(--color-ink-tertiary)]">Critical</div>
          </div>
          <div>
            <div className="text-[20px] font-semibold tabular-nums text-[var(--color-info)]">{brief.routine}</div>
            <div className="text-[11.5px] text-[var(--color-ink-tertiary)]">Routine</div>
          </div>
          <div>
            <div className="text-[20px] font-semibold tabular-nums text-[var(--color-success-strong)]">{brief.opportunities}</div>
            <div className="text-[11.5px] text-[var(--color-ink-tertiary)]">Opportunities</div>
          </div>
        </div>
      </Card>

      <Card>
        <CardHeader>
          <div>
            <CardTitle>Reputation Work Queue</CardTitle>
            <CardDescription>Prioritized, not a dashboard — this is the daily operating list</CardDescription>
          </div>
        </CardHeader>
        <div className="flex flex-col divide-y divide-[var(--color-border)] px-5 pb-3">
          {items.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-10 text-center">
              <AlertOctagon className="h-6 w-6 text-[var(--color-success)]" />
              <p className="text-[13px] text-[var(--color-ink-tertiary)]">Nothing needs attention in this scope right now.</p>
            </div>
          ) : items.map((item) => (
            <Link key={item.id} href={item.href} className="flex items-center gap-3 py-3.5 hover:bg-[var(--color-surface-sunken)]">
              <Badge variant={PRIORITY_VARIANT[item.priority]}>{PRIORITY_LABEL[item.priority]}</Badge>
              <div className="min-w-0 flex-1">
                <div className="text-[13.5px] font-medium text-[var(--color-ink)]">{item.title}</div>
                <div className="text-[12px] text-[var(--color-ink-tertiary)]">{item.detail}</div>
              </div>
              <ArrowUpRight className="h-3.5 w-3.5 shrink-0 text-[var(--color-ink-tertiary)]" />
            </Link>
          ))}
        </div>
      </Card>
    </div>
  );
}
