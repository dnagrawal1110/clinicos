import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import type { Severity, HealthStatus } from "@/lib/types";

const severityStyles: Record<Severity, string> = {
  critical: "bg-[var(--color-critical-soft)] text-[var(--color-critical-strong)]",
  attention: "bg-[var(--color-warning-soft)] text-[var(--color-warning-strong)]",
  opportunity: "bg-[var(--color-ai-soft)] text-[var(--color-ai-strong)]",
  info: "bg-[var(--color-info-soft)] text-[var(--color-info)]",
};

const healthStyles: Record<HealthStatus, string> = {
  excellent: "bg-[var(--color-success-soft)] text-[var(--color-success-strong)]",
  good: "bg-[var(--color-success-soft)] text-[var(--color-success-strong)]",
  fair: "bg-[var(--color-warning-soft)] text-[var(--color-warning-strong)]",
  poor: "bg-[var(--color-critical-soft)] text-[var(--color-critical-strong)]",
  critical: "bg-[var(--color-critical-soft)] text-[var(--color-critical-strong)]",
};

export function SeverityBadge({ severity, children, className }: { severity: Severity; children: ReactNode; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium", severityStyles[severity], className)}>
      {children}
    </span>
  );
}

export function HealthBadge({ status, children, className }: { status: HealthStatus; children: ReactNode; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium", healthStyles[status], className)}>
      {children}
    </span>
  );
}

export function Badge({ variant = "neutral", children, className }: { variant?: "neutral" | "success" | "warning" | "critical" | "info" | "ai"; children: ReactNode; className?: string }) {
  const styles: Record<string, string> = {
    neutral: "bg-[var(--color-surface-sunken)] text-[var(--color-ink-secondary)] border border-[var(--color-border)]",
    success: "bg-[var(--color-success-soft)] text-[var(--color-success-strong)]",
    warning: "bg-[var(--color-warning-soft)] text-[var(--color-warning-strong)]",
    critical: "bg-[var(--color-critical-soft)] text-[var(--color-critical-strong)]",
    info: "bg-[var(--color-info-soft)] text-[var(--color-info)]",
    ai: "bg-[var(--color-ai-soft)] text-[var(--color-ai-strong)]",
  };
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium whitespace-nowrap", styles[variant], className)}>
      {children}
    </span>
  );
}
