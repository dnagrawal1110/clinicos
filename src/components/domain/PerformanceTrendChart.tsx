"use client";

import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

const DATA = [
  { month: "Apr", health: 61, reviews: 4200, leads: 3100 },
  { month: "May", health: 64, reviews: 4550, leads: 3300 },
  { month: "Jun", health: 66, reviews: 4890, leads: 3600 },
  { month: "Jul", health: 69, reviews: 5240, leads: 3850 },
  { month: "Aug", health: 71, reviews: 5610, leads: 4100 },
  { month: "Sep", health: 74, reviews: 5972, leads: 4380 },
];

export function PerformanceTrendChart() {
  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={DATA} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="healthGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="var(--color-primary)" stopOpacity={0.25} />
              <stop offset="95%" stopColor="var(--color-primary)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
          <XAxis dataKey="month" tick={{ fontSize: 12, fill: "var(--color-ink-tertiary)" }} axisLine={{ stroke: "var(--color-border)" }} tickLine={false} />
          <YAxis tick={{ fontSize: 12, fill: "var(--color-ink-tertiary)" }} axisLine={false} tickLine={false} domain={[0, 100]} />
          <Tooltip
            contentStyle={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: 10, fontSize: 12.5 }}
          />
          <Area type="monotone" dataKey="health" stroke="var(--color-primary)" strokeWidth={2} fill="url(#healthGradient)" name="Portfolio Health" isAnimationActive={false} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
