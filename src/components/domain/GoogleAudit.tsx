import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { HealthRing, ModuleBar } from "@/components/ui/health";

export function GoogleAuditCard({ overall, breakdown }: { overall: number; breakdown: { label: string; score: number }[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Google Growth Score</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-6 sm:flex-row sm:items-center">
        <div className="flex shrink-0 flex-col items-center gap-1">
          <HealthRing score={overall} size={104} strokeWidth={9} />
          <span className="text-[12px] text-[var(--color-ink-tertiary)]">out of 100</span>
        </div>
        <div className="flex flex-1 flex-col gap-2.5">
          {breakdown.map((b) => (
            <ModuleBar key={b.label} label={b.label} score={b.score} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
