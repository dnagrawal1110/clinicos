import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";

interface Blocker {
  id: string;
  title: string;
  description: string;
  severity: "critical" | "attention";
  evidence: string;
  recommendation: string;
  assignee: string;
  status: string;
}

export function GoogleBlockers({ blockers }: { blockers: Blocker[] }) {
  return (
    <Card>
      <CardHeader className="flex-col items-start gap-0.5">
        <CardTitle>Why this profile isn&rsquo;t performing better</CardTitle>
        <CardDescription>AI-generated blockers, ranked by impact</CardDescription>
      </CardHeader>
      <div className="divide-y divide-[var(--color-border)] px-5 py-2">
        {blockers.map((b, i) => (
          <div key={b.id} className="flex gap-4 py-4">
            <span className="mt-0.5 text-[13px] font-semibold tabular-nums text-[var(--color-ink-tertiary)]">{String(i + 1).padStart(2, "0")}</span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h4 className="text-[13.5px] font-semibold text-[var(--color-ink)]">{b.title}</h4>
                <Badge variant={b.severity === "critical" ? "critical" : "warning"}>{b.severity}</Badge>
              </div>
              <p className="mt-0.5 text-[13px] text-[var(--color-ink-secondary)]">{b.description}</p>
              <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                <div className="rounded-[var(--radius-sm)] bg-[var(--color-surface-sunken)] px-3 py-2">
                  <div className="text-[10.5px] font-semibold uppercase tracking-wide text-[var(--color-ink-tertiary)]">Evidence</div>
                  <div className="mt-0.5 text-[12.5px] text-[var(--color-ink-secondary)]">{b.evidence}</div>
                </div>
                <div className="rounded-[var(--radius-sm)] bg-[var(--color-ai-soft)] px-3 py-2">
                  <div className="text-[10.5px] font-semibold uppercase tracking-wide text-[var(--color-ai-strong)]">Recommended action</div>
                  <div className="mt-0.5 text-[12.5px] text-[var(--color-ink-secondary)]">{b.recommendation}</div>
                </div>
              </div>
              <div className="mt-2.5 flex items-center gap-2">
                <Avatar name={b.assignee} size={20} />
                <span className="text-[12px] text-[var(--color-ink-tertiary)]">{b.assignee}</span>
                <Badge variant="neutral" className="ml-auto capitalize">{b.status.replace("-", " ")}</Badge>
              </div>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
