import Link from "next/link";
import { Star, CheckCircle2, XCircle, AlertTriangle } from "lucide-react";
import type { Location } from "@/lib/types";
import { healthStatus } from "@/lib/types";
import { ScoreText, TrendTag } from "@/components/ui/health";
import { Card } from "@/components/ui/card";

export function LocationCard({ clientId, location }: { clientId: string; location: Location }) {
  const status = healthStatus(location.healthOverall);
  const needsAttention = status === "poor" || status === "critical";

  return (
    <Link href={`/clients/${clientId}/locations/${location.id}`}>
      <Card className="h-full p-4 transition-shadow hover:shadow-[var(--shadow-sm)]">
        <div className="flex items-start justify-between">
          <div>
            <h4 className="text-[14px] font-semibold text-[var(--color-ink)]">{location.name}</h4>
            <p className="text-[12px] text-[var(--color-ink-tertiary)]">{location.city}</p>
          </div>
          {location.googleConnected ? (
            <span className="flex items-center gap-1 rounded-full bg-[var(--color-success-soft)] px-2 py-0.5 text-[11px] font-medium text-[var(--color-success-strong)]">
              <CheckCircle2 className="h-3 w-3" /> Connected
            </span>
          ) : (
            <span className="flex items-center gap-1 rounded-full bg-[var(--color-critical-soft)] px-2 py-0.5 text-[11px] font-medium text-[var(--color-critical-strong)]">
              <XCircle className="h-3 w-3" /> Disconnected
            </span>
          )}
        </div>

        <div className="mt-3 flex items-center gap-4">
          <div className="flex items-center gap-1 text-[13px] font-medium text-[var(--color-ink)]">
            <Star className="h-3.5 w-3.5 fill-[var(--color-warning)] text-[var(--color-warning)]" />
            {location.rating.toFixed(1)}
          </div>
          <div className="text-[13px] text-[var(--color-ink-secondary)]">
            {location.reviewCount.toLocaleString("en-IN")} reviews
          </div>
          <div className="ml-auto">
            <TrendTag value={location.reviewDelta30d} />
          </div>
        </div>

        <div className="mt-3 flex items-center justify-between border-t border-[var(--color-border)] pt-3">
          <span className="text-[11.5px] text-[var(--color-ink-tertiary)]">This month: +{location.reviewsThisMonth}</span>
          <div className="flex items-center gap-1.5">
            <span className="text-[11.5px] text-[var(--color-ink-tertiary)]">Health</span>
            <ScoreText score={location.healthOverall} className="text-[13px]" />
          </div>
        </div>

        {needsAttention && (
          <div className="mt-2.5 flex items-center gap-1.5 rounded-[var(--radius-sm)] bg-[var(--color-critical-soft)] px-2.5 py-1.5 text-[11.5px] font-medium text-[var(--color-critical-strong)]">
            <AlertTriangle className="h-3 w-3" /> Needs attention
          </div>
        )}
      </Card>
    </Link>
  );
}
