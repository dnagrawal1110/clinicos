"use client";

import { useMemo, useState } from "react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { TrendTag } from "@/components/ui/health";
import { rngFor, randInt } from "@/lib/mock/rng";
import { cn } from "@/lib/utils";

const RANGES = [
  { key: "7d", label: "7 days", days: 7 },
  { key: "30d", label: "30 days", days: 30 },
  { key: "90d", label: "90 days", days: 90 },
  { key: "6m", label: "6 months", days: 182 },
  { key: "12m", label: "12 months", days: 365 },
] as const;

function buildSeries(seedKey: string, days: number, dailyBaseline: number) {
  const rng = rngFor(`velocity-${seedKey}-${days}`);
  const points: { label: string; current: number; previous: number; target: number }[] = [];
  const bucketCount = Math.min(24, days);
  const perBucketDays = days / bucketCount;
  for (let i = 0; i < bucketCount; i++) {
    const trendLift = 1 + (i / bucketCount) * 0.28; // gentle upward trend into "current"
    const noise = randInt(rng, -18, 18) / 100;
    const current = Math.max(0, Math.round(dailyBaseline * perBucketDays * (trendLift + noise)));
    const previous = Math.max(0, Math.round(dailyBaseline * perBucketDays * (1 + randInt(rng, -20, 12) / 100)));
    points.push({
      label: days <= 30 ? `Day ${Math.round(i * perBucketDays) + 1}` : `Wk ${i + 1}`,
      current,
      previous,
      target: Math.round(dailyBaseline * perBucketDays * 1.15),
    });
  }
  return points;
}

export function ReviewVelocityChart({ seedKey, dailyBaseline }: { seedKey: string; dailyBaseline: number }) {
  const [range, setRange] = useState<(typeof RANGES)[number]["key"]>("30d");
  const activeRange = RANGES.find((r) => r.key === range)!;
  const data = useMemo(() => buildSeries(seedKey, activeRange.days, dailyBaseline), [seedKey, activeRange.days, dailyBaseline]);

  const currentTotal = data.reduce((a, d) => a + d.current, 0);
  const previousTotal = data.reduce((a, d) => a + d.previous, 0);
  const changePct = previousTotal ? Math.round(((currentTotal - previousTotal) / previousTotal) * 1000) / 10 : 0;

  return (
    <Card>
      <CardHeader className="flex-col items-start gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle>Review Velocity</CardTitle>
          <CardDescription>Reviews per {activeRange.days <= 30 ? "day" : "week"}, current vs previous period</CardDescription>
        </div>
        <div className="flex flex-wrap items-center gap-1">
          {RANGES.map((r) => (
            <button
              key={r.key}
              onClick={() => setRange(r.key)}
              className={cn("rounded-full px-2.5 py-1 text-[11.5px] font-medium", range === r.key ? "bg-[var(--color-primary)] text-white" : "bg-[var(--color-surface-sunken)] text-[var(--color-ink-secondary)]")}
            >
              {r.label}
            </button>
          ))}
        </div>
      </CardHeader>
      <div className="flex items-center gap-2 px-5 pt-2">
        <TrendTag value={changePct} /> <span className="text-[12px] text-[var(--color-ink-tertiary)]">vs previous period</span>
      </div>
      <div className="h-64 px-2 pb-5 pt-2">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="velocityCurrent" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--color-primary)" stopOpacity={0.3} />
                <stop offset="95%" stopColor="var(--color-primary)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
            <XAxis dataKey="label" tick={{ fontSize: 10.5, fill: "var(--color-ink-tertiary)" }} axisLine={{ stroke: "var(--color-border)" }} tickLine={false} interval="preserveStartEnd" />
            <YAxis tick={{ fontSize: 11, fill: "var(--color-ink-tertiary)" }} axisLine={false} tickLine={false} width={32} />
            <Tooltip contentStyle={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: 10, fontSize: 12 }} />
            <Area type="monotone" dataKey="previous" stroke="var(--color-ink-tertiary)" strokeWidth={1.5} strokeDasharray="4 3" fill="none" isAnimationActive={false} name="Previous period" />
            <Area type="monotone" dataKey="target" stroke="var(--color-warning)" strokeWidth={1} fill="none" isAnimationActive={false} name="Target" />
            <Area type="monotone" dataKey="current" stroke="var(--color-primary)" strokeWidth={2} fill="url(#velocityCurrent)" isAnimationActive={false} name="Current period" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <div className="flex items-center gap-4 border-t border-[var(--color-border)] px-5 py-3 text-[11.5px] text-[var(--color-ink-tertiary)]">
        <Legend color="bg-[var(--color-primary)]" label="Current period" />
        <Legend color="bg-[var(--color-ink-tertiary)]" label="Previous period" dashed />
        <Legend color="bg-[var(--color-warning)]" label="Target" />
      </div>
    </Card>
  );
}

function Legend({ color, label, dashed }: { color: string; label: string; dashed?: boolean }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className={cn("inline-block h-1.5 w-3 rounded-full", color, dashed && "opacity-60")} />
      {label}
    </span>
  );
}
