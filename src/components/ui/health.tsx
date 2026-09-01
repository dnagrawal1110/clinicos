import { cn } from "@/lib/utils";
import { healthStatus } from "@/lib/types";

const scoreColor = (score: number) => {
  const s = healthStatus(score);
  if (s === "excellent" || s === "good") return "var(--color-success)";
  if (s === "fair") return "var(--color-warning)";
  return "var(--color-critical)";
};

export function HealthRing({ score, size = 64, strokeWidth = 6, label }: { score: number; size?: number; strokeWidth?: number; label?: string }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const color = scoreColor(score);
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="var(--color-border)" strokeWidth={strokeWidth} />
        <circle
          cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={color} strokeWidth={strokeWidth}
          strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 0.6s ease-out" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-[15px] font-semibold tabular-nums text-[var(--color-ink)]">{score}</span>
        {label && <span className="text-[9px] uppercase tracking-wide text-[var(--color-ink-tertiary)]">{label}</span>}
      </div>
    </div>
  );
}

export function ScoreText({ score, className }: { score: number; className?: string }) {
  return (
    <span className={cn("font-semibold tabular-nums", className)} style={{ color: scoreColor(score) }}>
      {score}
    </span>
  );
}

export function ModuleBar({ label, score, sublabel }: { label: string; score: number; sublabel?: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="w-32 shrink-0 text-[13px] text-[var(--color-ink-secondary)]">{label}</span>
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[var(--color-surface-sunken)]">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${score}%`, background: scoreColor(score) }}
        />
      </div>
      <span className="w-9 shrink-0 text-right text-[13px] font-medium tabular-nums text-[var(--color-ink)]">{score}</span>
      {sublabel && <span className="w-16 shrink-0 text-right text-[11px] text-[var(--color-ink-tertiary)]">{sublabel}</span>}
    </div>
  );
}

export function TrendTag({ value, suffix = "%" }: { value: number; suffix?: string }) {
  const positive = value >= 0;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 text-xs font-medium tabular-nums",
        positive ? "text-[var(--color-success)]" : "text-[var(--color-critical)]"
      )}
    >
      {positive ? "↑" : "↓"} {Math.abs(value)}
      {suffix}
    </span>
  );
}

export function ScoreDot({ score }: { score: number }) {
  return <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ background: scoreColor(score) }} />;
}
