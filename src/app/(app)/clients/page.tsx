"use client";

import { useMemo, useState } from "react";
import { PageHeader } from "@/components/shell/PageHeader";
import { ClientHealthTable } from "@/components/domain/ClientHealthTable";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, SlidersHorizontal, Plus } from "lucide-react";
import { ALL_CLIENTS } from "@/lib/mock/clients";
import type { Client } from "@/lib/types";

const STATUS_FILTERS: { key: Client["status"] | "all"; label: string }[] = [
  { key: "all", label: "All" },
  { key: "active", label: "Active" },
  { key: "onboarding", label: "Onboarding" },
  { key: "at-risk", label: "At Risk" },
  { key: "paused", label: "Paused" },
];

type SortKey = "name" | "healthOverall" | "locations" | "reviewsTotal";

export default function ClientsPage() {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<Client["status"] | "all">("all");
  const [sortKey, setSortKey] = useState<SortKey>("healthOverall");
  const [sortAsc, setSortAsc] = useState(true);

  const filtered = useMemo(() => {
    let list = ALL_CLIENTS.filter((c) => c.name.toLowerCase().includes(query.toLowerCase()) || c.specialty.toLowerCase().includes(query.toLowerCase()) || c.city.toLowerCase().includes(query.toLowerCase()));
    if (status !== "all") list = list.filter((c) => c.status === status);
    list = [...list].sort((a, b) => {
      let av: number | string, bv: number | string;
      if (sortKey === "name") { av = a.name; bv = b.name; }
      else if (sortKey === "locations") { av = a.locations.length; bv = b.locations.length; }
      else if (sortKey === "reviewsTotal") { av = a.reviewsTotal; bv = b.reviewsTotal; }
      else { av = a.healthOverall; bv = b.healthOverall; }
      if (typeof av === "string") return sortAsc ? av.localeCompare(bv as string) : (bv as string).localeCompare(av);
      return sortAsc ? (av as number) - (bv as number) : (bv as number) - (av as number);
    });
    return list;
  }, [query, status, sortKey, sortAsc]);

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="All Clients"
        subtitle={`${ALL_CLIENTS.length} clients across the portfolio`}
        actions={<Button variant="primary" size="md"><Plus className="h-3.5 w-3.5" /> Add Client</Button>}
      />

      <Card>
        <div className="flex flex-wrap items-center gap-2 border-b border-[var(--color-border)] px-5 py-3.5">
          <div className="flex h-8 flex-1 min-w-[220px] max-w-sm items-center gap-2 rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-surface-sunken)] px-2.5">
            <Search className="h-3.5 w-3.5 text-[var(--color-ink-tertiary)]" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name, specialty, or city..."
              className="w-full bg-transparent text-[13px] outline-none placeholder:text-[var(--color-ink-tertiary)]"
            />
          </div>
          <div className="flex items-center gap-1">
            {STATUS_FILTERS.map((f) => (
              <button
                key={f.key}
                onClick={() => setStatus(f.key)}
                className={`rounded-full px-3 py-1 text-[12.5px] font-medium transition-colors ${status === f.key ? "bg-[var(--color-primary)] text-white" : "bg-[var(--color-surface-sunken)] text-[var(--color-ink-secondary)] hover:bg-[var(--color-border)]"}`}
              >
                {f.label}
              </button>
            ))}
          </div>
          <div className="ml-auto flex items-center gap-2">
            <select
              value={sortKey}
              onChange={(e) => setSortKey(e.target.value as SortKey)}
              className="h-8 rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-surface)] px-2 text-[12.5px] text-[var(--color-ink-secondary)] outline-none"
            >
              <option value="healthOverall">Sort: Health</option>
              <option value="name">Sort: Name</option>
              <option value="locations">Sort: Locations</option>
              <option value="reviewsTotal">Sort: Reviews</option>
            </select>
            <Button variant="outline" size="sm" onClick={() => setSortAsc((v) => !v)}>
              <SlidersHorizontal className="h-3.5 w-3.5" /> {sortAsc ? "Asc" : "Desc"}
            </Button>
          </div>
        </div>
        <div className="px-5 pb-5 pt-3">
          <div className="mb-2 flex items-center gap-2 text-[12px] text-[var(--color-ink-tertiary)]">
            <Badge variant="neutral">{filtered.length} results</Badge>
          </div>
          <ClientHealthTable clients={filtered} />
        </div>
      </Card>
    </div>
  );
}
