import { Lock, TrendingUp } from "lucide-react";
import type { Opportunity } from "@/lib/types";
import { Card, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export function GrowthOpportunities({ opportunities }: { opportunities: Opportunity[] }) {
  return (
    <Card className="overflow-hidden">
      <div className="flex items-center justify-between gap-2 border-b border-[var(--color-border)] bg-[linear-gradient(120deg,var(--color-ai-soft)_0%,transparent_65%)] px-5 py-4">
        <div>
          <CardTitle className="flex items-center gap-1.5"><TrendingUp className="h-4 w-4 text-[var(--color-ai)]" /> Growth Opportunities</CardTitle>
          <CardDescription>Internal only — never shown in the client-facing report</CardDescription>
        </div>
        <Lock className="h-3.5 w-3.5 text-[var(--color-ink-tertiary)]" />
      </div>
      <div className="divide-y divide-[var(--color-border)]">
        {opportunities.length === 0 ? (
          <p className="px-5 py-8 text-center text-[13px] text-[var(--color-ink-tertiary)]">No obvious upsell gaps detected right now.</p>
        ) : opportunities.map((o) => (
          <div key={o.id} className="flex items-center justify-between gap-3 px-5 py-3.5">
            <div>
              <h4 className="text-[13.5px] font-semibold text-[var(--color-ink)]">{o.title}</h4>
              <p className="text-[12.5px] text-[var(--color-ink-secondary)]">{o.description}</p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <Badge variant={o.priority === "high" ? "critical" : o.priority === "medium" ? "warning" : "neutral"} className="uppercase">{o.priority}</Badge>
              <Button variant="outline" size="sm">Create Opportunity</Button>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
