"use client";

import { useMemo, useState } from "react";
import { PageHeader } from "@/components/shell/PageHeader";
import { Card } from "@/components/ui/card";
import { CONTENT_ITEMS } from "@/lib/mock/operations";
import { ALL_CLIENTS, getClient } from "@/lib/mock/clients";
import { useScope } from "@/lib/scope-context";
import { cn } from "@/lib/utils";
import type { ContentItem } from "@/lib/types";

const CHANNELS: { key: ContentItem["channel"] | "all"; label: string }[] = [
  { key: "all", label: "All Channels" },
  { key: "google", label: "Google" },
  { key: "instagram", label: "Instagram" },
  { key: "facebook", label: "Facebook" },
  { key: "reels", label: "Reels" },
  { key: "youtube", label: "YouTube" },
];

const STATUS_DOT: Record<string, string> = {
  published: "bg-[var(--color-success)]", scheduled: "bg-[var(--color-info)]", approved: "bg-[var(--color-ink-tertiary)]",
  pending: "bg-[var(--color-warning)]", failed: "bg-[var(--color-critical)]", idea: "bg-[var(--color-ink-tertiary)]", draft: "bg-[var(--color-ink-tertiary)]",
};

const STATUSES: ContentItem["status"][] = ["idea", "draft", "pending", "approved", "scheduled", "published", "failed"];

const YEAR = 2026, MONTH = 8; // September (0-indexed)

export default function ContentCalendarPage() {
  const { scope } = useScope();
  const [channel, setChannel] = useState<ContentItem["channel"] | "all">("all");
  const [clientFilter, setClientFilter] = useState<string>(scope.type !== "all" ? scope.clientId : "all");
  const [locationFilter, setLocationFilter] = useState<string>(scope.type === "location" ? scope.locationId : "all");
  const [statusFilter, setStatusFilter] = useState<ContentItem["status"] | "all">("all");
  const [ownerFilter, setOwnerFilter] = useState<string>("all");

  const clientName = (id: string) => getClient(id)?.name ?? id;
  const filterClient = clientFilter !== "all" ? getClient(clientFilter) : undefined;
  const owners = useMemo(() => Array.from(new Set(CONTENT_ITEMS.map((c) => c.owner))).sort(), []);

  const filtered = CONTENT_ITEMS.filter((c) =>
    (channel === "all" || c.channel === channel) &&
    (clientFilter === "all" || c.clientId === clientFilter) &&
    (locationFilter === "all" || c.locationId === locationFilter) &&
    (statusFilter === "all" || c.status === statusFilter) &&
    (ownerFilter === "all" || c.owner === ownerFilter)
  );

  const days: { date: Date | null; items: ContentItem[] }[] = [];
  {
    const daysInMonth = new Date(YEAR, MONTH + 1, 0).getDate();
    const firstWeekday = new Date(YEAR, MONTH, 1).getDay();
    for (let i = 0; i < firstWeekday; i++) days.push({ date: null, items: [] });
    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(YEAR, MONTH, d);
      const items = filtered.filter((c) => {
        const cd = new Date(c.date);
        return cd.getFullYear() === YEAR && cd.getMonth() === MONTH && cd.getDate() === d;
      });
      days.push({ date, items });
    }
  }

  return (
    <div className="animate-fade-in">
      <PageHeader title="Content Calendar" subtitle="Google, Instagram, Facebook, YouTube, and Reels — one view across the portfolio." />

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <select value={clientFilter} onChange={(e) => { setClientFilter(e.target.value); setLocationFilter("all"); }} className="h-8 rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-surface)] px-2 text-[12.5px] text-[var(--color-ink-secondary)] outline-none">
          <option value="all">All Clients</option>
          {ALL_CLIENTS.slice(0, 60).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select value={locationFilter} onChange={(e) => setLocationFilter(e.target.value)} disabled={!filterClient} className="h-8 rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-surface)] px-2 text-[12.5px] text-[var(--color-ink-secondary)] outline-none disabled:opacity-50">
          <option value="all">All Locations</option>
          {filterClient?.locations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
        </select>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as ContentItem["status"] | "all")} className="h-8 rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-surface)] px-2 text-[12.5px] text-[var(--color-ink-secondary)] outline-none capitalize">
          <option value="all">All Statuses</option>
          {STATUSES.map((s) => <option key={s} value={s} className="capitalize">{s}</option>)}
        </select>
        <select value={ownerFilter} onChange={(e) => setOwnerFilter(e.target.value)} className="h-8 rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-surface)] px-2 text-[12.5px] text-[var(--color-ink-secondary)] outline-none">
          <option value="all">All Owners</option>
          {owners.map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
        <span className="ml-auto text-[12px] text-[var(--color-ink-tertiary)]">{filtered.length} items</span>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-1.5">
        {CHANNELS.map((c) => (
          <button
            key={c.key}
            onClick={() => setChannel(c.key)}
            className={cn("rounded-full px-3 py-1 text-[12.5px] font-medium", channel === c.key ? "bg-[var(--color-primary)] text-white" : "bg-[var(--color-surface-sunken)] text-[var(--color-ink-secondary)]")}
          >
            {c.label}
          </button>
        ))}
      </div>

      <Card className="p-3">
        <div className="grid grid-cols-7 gap-px overflow-hidden rounded-[var(--radius-md)] bg-[var(--color-border)] text-[11px] font-semibold uppercase tracking-wide text-[var(--color-ink-tertiary)]">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
            <div key={d} className="bg-[var(--color-surface-sunken)] px-2 py-1.5 text-center">{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-px overflow-hidden rounded-b-[var(--radius-md)] bg-[var(--color-border)]">
          {days.map((cell, i) => (
            <div key={i} className="min-h-[100px] bg-[var(--color-surface)] p-1.5">
              {cell.date && (
                <>
                  <div className="mb-1 text-[11px] font-medium text-[var(--color-ink-tertiary)]">{cell.date.getDate()}</div>
                  <div className="flex flex-col gap-1">
                    {cell.items.slice(0, 3).map((item) => (
                      <div key={item.id} className="flex items-center gap-1 truncate rounded-[4px] bg-[var(--color-surface-sunken)] px-1.5 py-0.5 text-[10.5px] text-[var(--color-ink-secondary)]">
                        <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", STATUS_DOT[item.status])} />
                        <span className="truncate">{clientName(item.clientId).split(" ").slice(-1)} · {item.title}</span>
                      </div>
                    ))}
                    {cell.items.length > 3 && <span className="text-[10px] text-[var(--color-ink-tertiary)]">+{cell.items.length - 3} more</span>}
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      </Card>

      <div className="mt-4 flex items-center gap-4 text-[12px] text-[var(--color-ink-tertiary)]">
        <Legend color="bg-[var(--color-success)]" label="Published" />
        <Legend color="bg-[var(--color-info)]" label="Scheduled" />
        <Legend color="bg-[var(--color-warning)]" label="Pending" />
        <Legend color="bg-[var(--color-critical)]" label="Failed" />
        <Legend color="bg-[var(--color-ink-tertiary)]" label="Draft / Approved" />
      </div>
    </div>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className={cn("inline-block h-2 w-2 rounded-full", color)} />
      {label}
    </span>
  );
}
