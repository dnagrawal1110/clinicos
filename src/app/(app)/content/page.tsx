"use client";

import Link from "next/link";
import { ImageIcon, CalendarDays } from "lucide-react";
import { PageHeader } from "@/components/shell/PageHeader";
import { StatCard } from "@/components/ui/stat-card";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ContentAIComposer } from "@/components/domain/ContentAIComposer";
import { getClient } from "@/lib/mock/clients";
import { useScope } from "@/lib/scope-context";
import { getScopedContent } from "@/lib/scope-selectors";

const STATUS_VARIANT: Record<string, "success" | "warning" | "critical" | "neutral" | "info"> = {
  published: "success", scheduled: "info", approved: "neutral", pending: "warning", failed: "critical", idea: "neutral", draft: "neutral",
};

export default function ContentStudioPage() {
  const { scope, scopeMeta } = useScope();
  const items = getScopedContent(scope);
  const scheduled = items.filter((c) => c.status === "scheduled").length;
  const pending = items.filter((c) => c.status === "pending").length;
  const published = items.filter((c) => c.status === "published").length;
  const failed = items.filter((c) => c.status === "failed").length;
  const clientName = (id: string) => getClient(id)?.name ?? id;

  const upcoming = [...items]
    .filter((c) => new Date(c.date) >= new Date(2026, 7, 28))
    .sort((a, b) => +new Date(a.date) - +new Date(b.date))
    .slice(0, 8);

  return (
    <div className="animate-fade-in">
      <PageHeader
        breadcrumb={scope.type !== "all" ? scopeMeta.crumbs.concat({ label: "Content Studio" }) : undefined}
        title="Content Studio"
        subtitle="Plan, generate, and approve content across Google, Instagram, Facebook, and YouTube."
        actions={
          <>
            <Link href="/content/media"><Button variant="outline" size="md"><ImageIcon className="h-3.5 w-3.5" /> Media Library</Button></Link>
            <Link href="/content/calendar"><Button variant="secondary" size="md"><CalendarDays className="h-3.5 w-3.5" /> Full Calendar</Button></Link>
          </>
        }
      />

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Scheduled" value={scheduled} />
        <StatCard label="Pending Approval" value={pending} />
        <StatCard label="Published (14d)" value={published} />
        <StatCard label="Failed" value={failed} />
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_1fr]">
        <ContentAIComposer />
        <Card>
          <CardHeader>
            <CardTitle>Upcoming queue</CardTitle>
            <Link href="/content/calendar"><Button variant="ghost" size="sm">View calendar</Button></Link>
          </CardHeader>
          <div className="divide-y divide-[var(--color-border)] px-5 pb-3">
            {upcoming.length === 0 ? (
              <p className="py-8 text-center text-[13px] text-[var(--color-ink-tertiary)]">Nothing scheduled in this scope.</p>
            ) : upcoming.map((item) => (
              <div key={item.id} className="flex items-center gap-3 py-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius-sm)] bg-[var(--color-surface-sunken)]">
                  <ImageIcon className="h-4 w-4 text-[var(--color-ink-tertiary)]" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[13px] font-medium text-[var(--color-ink)]">{item.title}</div>
                  <div className="text-[11.5px] text-[var(--color-ink-tertiary)]">{clientName(item.clientId)} · {item.channel} · {item.owner} · {new Date(item.date).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</div>
                </div>
                <Badge variant={STATUS_VARIANT[item.status]} className="capitalize">{item.status}</Badge>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
