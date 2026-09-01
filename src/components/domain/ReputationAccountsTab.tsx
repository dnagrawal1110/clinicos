"use client";

import { useState } from "react";
import Link from "next/link";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ACCOUNT_MANAGERS } from "@/lib/mock/pools";
import { getClient } from "@/lib/mock/clients";
import { getLocationsForManager } from "@/lib/mock/work-queue";
import { getProgramForLocation, PROGRAM_STATUS_LABEL } from "@/lib/mock/review-programs";
import { REVIEW_CAMPAIGNS, campaignConversionRate } from "@/lib/mock/operations";
import { formatNumber } from "@/lib/utils";

const PROGRAM_STATUS_VARIANT: Record<string, "success" | "warning" | "critical" | "neutral" | "info"> = {
  active: "success", paused: "warning", "needs-attention": "warning", disconnected: "critical",
  "setup-required": "neutral", archived: "neutral",
};

// The "daily working screen" (section 48) — an account manager's own book of
// locations, not the whole portfolio.
export function ReputationAccountsTab() {
  const [manager, setManager] = useState(ACCOUNT_MANAGERS[0]?.name ?? "");
  const locations = getLocationsForManager(manager);

  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>My Reputation Accounts</CardTitle>
          <CardDescription>{locations.length} location{locations.length !== 1 ? "s" : ""} assigned to {manager}</CardDescription>
        </div>
        <select
          value={manager}
          onChange={(e) => setManager(e.target.value)}
          className="h-8 rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-surface-sunken)] px-2.5 text-[12.5px] outline-none"
        >
          {ACCOUNT_MANAGERS.map((m) => <option key={m.id} value={m.name}>{m.name}</option>)}
        </select>
      </CardHeader>
      <div className="overflow-x-auto px-5 pb-5 pt-2">
        <table className="w-full min-w-[900px] border-collapse text-left">
          <thead>
            <tr className="border-b border-[var(--color-border)] text-[11px] font-semibold uppercase tracking-wide text-[var(--color-ink-tertiary)]">
              <th className="py-2.5 pr-3">Client</th>
              <th className="px-3 py-2.5">Location</th>
              <th className="px-3 py-2.5 text-right">Health</th>
              <th className="px-3 py-2.5 text-right">Reviews</th>
              <th className="px-3 py-2.5 text-right">Velocity</th>
              <th className="px-3 py-2.5 text-right">Conversion</th>
              <th className="px-3 py-2.5">Program</th>
              <th className="px-3 py-2.5">Next Action</th>
            </tr>
          </thead>
          <tbody>
            {locations.length === 0 ? (
              <tr><td colSpan={8} className="py-8 text-center text-[13px] text-[var(--color-ink-tertiary)]">No locations assigned to {manager} yet.</td></tr>
            ) : locations.map((loc) => {
              const client = getClient(loc.clientId);
              const program = getProgramForLocation(loc.id);
              const campaign = REVIEW_CAMPAIGNS.find((c) => c.locationId === loc.id);
              const conversion = campaign ? campaignConversionRate(campaign) : 0;
              const nextAction = program?.status === "disconnected" ? "Reconnect destination"
                : program?.status === "setup-required" ? "Launch first campaign"
                : loc.reviewDelta30d < -25 ? "Investigate velocity drop"
                : conversion < 40 ? "Improve follow-up workflow"
                : "Maintain cadence";
              return (
                <tr key={loc.id} className="border-b border-[var(--color-border)] last:border-0 hover:bg-[var(--color-surface-sunken)]">
                  <td className="py-2.5 pr-3 text-[12.5px] font-medium text-[var(--color-ink)]">
                    <Link href={`/clients/${loc.clientId}`} className="hover:underline">{client?.name}</Link>
                  </td>
                  <td className="px-3 py-2.5 text-[12.5px] text-[var(--color-ink-secondary)]">
                    <Link href={`/clients/${loc.clientId}/locations/${loc.id}`} className="hover:underline">{loc.name}</Link>
                  </td>
                  <td className="px-3 py-2.5 text-right text-[12.5px] tabular-nums">{loc.healthOverall}</td>
                  <td className="px-3 py-2.5 text-right text-[12.5px] tabular-nums">{formatNumber(loc.reviewCount)}</td>
                  <td className={`px-3 py-2.5 text-right text-[12.5px] tabular-nums ${loc.reviewDelta30d < 0 ? "text-[var(--color-critical-strong)]" : "text-[var(--color-success-strong)]"}`}>{loc.reviewDelta30d > 0 ? "+" : ""}{loc.reviewDelta30d}%</td>
                  <td className="px-3 py-2.5 text-right text-[12.5px] tabular-nums">{conversion}%</td>
                  <td className="px-3 py-2.5">{program && <Badge variant={PROGRAM_STATUS_VARIANT[program.status]}>{PROGRAM_STATUS_LABEL[program.status]}</Badge>}</td>
                  <td className="px-3 py-2.5 text-[12px] text-[var(--color-ink-tertiary)]">{nextAction}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
