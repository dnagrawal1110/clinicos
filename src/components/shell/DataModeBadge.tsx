"use client";

import { Database, Radio } from "lucide-react";
import { useRuntimeStore, getWorkspaceMode } from "@/lib/runtime-store";

// Section 20/28/69: never let demo and real data mix silently. This is the
// single agency-level Demo/Live indicator — the same workspaceMode value
// the Integrations page's toggle sets, so this badge and that toggle can
// never disagree.
export function DataModeBadge() {
  useRuntimeStore();
  const mode = getWorkspaceMode();
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
