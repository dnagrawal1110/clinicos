import { Database, Radio } from "lucide-react";
import { getIntegrationMode } from "@/lib/integration-mode";

// Section 69: never let demo and real data mix silently. This renders
// server-side from the env var directly (no client state to drift).
export function DataModeBadge() {
  const mode = getIntegrationMode();
  if (mode === "live") {
    return (
      <span className="flex items-center gap-1.5 rounded-full border border-[var(--color-success)]/40 bg-[var(--color-success-soft)] px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-[var(--color-success-strong)]">
        <Radio className="h-3 w-3" /> Live Data
      </span>
    );
  }
  return (
    <span className="flex items-center gap-1.5 rounded-full border border-[var(--color-border)] bg-[var(--color-surface-sunken)] px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-[var(--color-ink-tertiary)]">
      <Database className="h-3 w-3" /> Demo Data
    </span>
  );
}
