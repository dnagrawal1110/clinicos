"use client";

import { useState } from "react";
import Link from "next/link";
import { CheckCircle2, XCircle, Search } from "lucide-react";
import type { Client, Location } from "@/lib/types";
import { ScoreText, ScoreDot } from "@/components/ui/health";

export function GoogleProfilesTable({ rows }: { rows: { client: Client; location: Location }[] }) {
  const [query, setQuery] = useState("");
  const [onlyIssues, setOnlyIssues] = useState(false);

  const filtered = rows.filter(({ client, location }) => {
    const matches = `${client.name} ${location.name}`.toLowerCase().includes(query.toLowerCase());
    if (!matches) return false;
    if (onlyIssues) return !location.googleConnected || location.scores.google < 60;
    return true;
  });

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2 border-b border-[var(--color-border)] px-5 py-3.5">
        <div className="flex h-8 w-64 items-center gap-2 rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-surface-sunken)] px-2.5">
          <Search className="h-3.5 w-3.5 text-[var(--color-ink-tertiary)]" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search profiles..." className="w-full bg-transparent text-[13px] outline-none" />
        </div>
        <button
          onClick={() => setOnlyIssues((v) => !v)}
          className={`rounded-full px-3 py-1 text-[12.5px] font-medium ${onlyIssues ? "bg-[var(--color-critical)] text-white" : "bg-[var(--color-surface-sunken)] text-[var(--color-ink-secondary)]"}`}
        >
          Needs attention only
        </button>
        <span className="ml-auto text-[12px] text-[var(--color-ink-tertiary)]">{filtered.length} profiles</span>
      </div>
      <div className="overflow-x-auto px-5 pb-5 pt-3">
        <table className="w-full min-w-[760px] border-collapse text-left">
          <thead>
            <tr className="border-b border-[var(--color-border)] text-[11px] font-semibold uppercase tracking-wide text-[var(--color-ink-tertiary)]">
              <th className="py-2.5 pr-3">Client — Location</th>
              <th className="px-3 py-2.5">Status</th>
              <th className="px-3 py-2.5 text-right">Rating</th>
              <th className="px-3 py-2.5 text-right">Reviews</th>
              <th className="px-3 py-2.5 text-right">Photos</th>
              <th className="px-3 py-2.5 text-right">Google Health</th>
              <th className="py-2.5 pl-3"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.slice(0, 40).map(({ client, location }) => (
              <tr key={location.id} className="border-b border-[var(--color-border)] last:border-0 hover:bg-[var(--color-surface-sunken)]">
                <td className="py-2.5 pr-3">
                  <div className="text-[13px] font-medium text-[var(--color-ink)]">{client.name}</div>
                  <div className="text-[11.5px] text-[var(--color-ink-tertiary)]">{location.name}, {location.city}</div>
                </td>
                <td className="px-3 py-2.5">
                  {location.googleConnected ? (
                    <span className="flex items-center gap-1 text-[12px] font-medium text-[var(--color-success-strong)]"><CheckCircle2 className="h-3.5 w-3.5" /> Connected</span>
                  ) : (
                    <span className="flex items-center gap-1 text-[12px] font-medium text-[var(--color-critical-strong)]"><XCircle className="h-3.5 w-3.5" /> Disconnected</span>
                  )}
                </td>
                <td className="px-3 py-2.5 text-right text-[13px] tabular-nums text-[var(--color-ink-secondary)]">{location.rating.toFixed(1)} ★</td>
                <td className="px-3 py-2.5 text-right text-[13px] tabular-nums text-[var(--color-ink-secondary)]">{location.reviewCount.toLocaleString("en-IN")}</td>
                <td className="px-3 py-2.5 text-right text-[13px] tabular-nums text-[var(--color-ink-secondary)]">{location.photos}</td>
                <td className="px-3 py-2.5 text-right">
                  <span className="inline-flex items-center gap-1.5"><ScoreDot score={location.scores.google} /><ScoreText score={location.scores.google} className="text-[13px]" /></span>
                </td>
                <td className="py-2.5 pl-3 text-right">
                  <Link href={`/clients/${client.id}/locations/${location.id}`} className="text-[12.5px] font-medium text-[var(--color-primary-strong)] hover:underline">
                    Open
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
