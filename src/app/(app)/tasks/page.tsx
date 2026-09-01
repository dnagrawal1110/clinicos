"use client";

import { useState } from "react";
import { Sparkles } from "lucide-react";
import { PageHeader } from "@/components/shell/PageHeader";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { getClient } from "@/lib/mock/clients";
import { useScope } from "@/lib/scope-context";
import { useRuntimeStore } from "@/lib/runtime-store";
import { getScopedTasks, getScopedKpi } from "@/lib/scope-selectors";
import { cn } from "@/lib/utils";
import type { Task } from "@/lib/types";

const STATUS_FILTERS: { key: Task["status"] | "all"; label: string }[] = [
  { key: "all", label: "All" }, { key: "open", label: "Open" }, { key: "in-progress", label: "In Progress" }, { key: "done", label: "Done" }, { key: "blocked", label: "Blocked" },
];

const PRIORITY_META: Record<Task["priority"], { label: string; variant: "critical" | "warning" | "neutral" }> = {
  high: { label: "🔴 High", variant: "critical" },
  medium: { label: "🟠 Medium", variant: "warning" },
  low: { label: "🟡 Low", variant: "neutral" },
};

export default function TasksPage() {
  useRuntimeStore();
  const { scope, scopeMeta } = useScope();
  const [status, setStatus] = useState<Task["status"] | "all">("all");
  const tasks = getScopedTasks(scope);
  const kpi = getScopedKpi(scope);
  const clientName = (id: string) => getClient(id)?.name ?? id;
  const locationName = (clientId: string, locationId?: string) => (locationId ? getClient(clientId)?.locations.find((l) => l.id === locationId)?.name : undefined);

  const filtered = tasks.filter((t) => status === "all" || t.status === status).sort((a, b) => +new Date(a.dueDate) - +new Date(b.dueDate));

  return (
    <div className="animate-fade-in">
      <PageHeader
        breadcrumb={scope.type !== "all" ? scopeMeta.crumbs.concat({ label: "Tasks" }) : undefined}
        title="Tasks"
        subtitle={`${kpi.openTasks} open task${kpi.openTasks !== 1 ? "s" : ""} ${scope.type === "all" ? "across the agency" : `for ${scopeMeta.title}`}`}
      />

      <div className="mb-4 flex flex-wrap items-center gap-1.5">
        {STATUS_FILTERS.map((f) => (
          <button key={f.key} onClick={() => setStatus(f.key)} className={cn("rounded-full px-3 py-1 text-[12.5px] font-medium", status === f.key ? "bg-[var(--color-primary)] text-white" : "bg-[var(--color-surface-sunken)] text-[var(--color-ink-secondary)]")}>
            {f.label}
          </button>
        ))}
      </div>

      <Card>
        <div className="divide-y divide-[var(--color-border)] px-2">
          {filtered.length === 0 ? (
            <p className="py-10 text-center text-[13px] text-[var(--color-ink-tertiary)]">No tasks in this scope.</p>
          ) : filtered.map((task) => (
            <div key={task.id} className="flex items-center gap-3 px-3 py-3.5">
              <Badge variant={PRIORITY_META[task.priority].variant}>{PRIORITY_META[task.priority].label}</Badge>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="truncate text-[13.5px] font-medium text-[var(--color-ink)]">{task.title}</span>
                  {task.aiRecommended && <Sparkles className="h-3 w-3 shrink-0 text-[var(--color-ai)]" />}
                </div>
                <div className="text-[11.5px] text-[var(--color-ink-tertiary)]">
                  {clientName(task.clientId)}{locationName(task.clientId, task.locationId) ? ` · ${locationName(task.clientId, task.locationId)}` : ""} · {task.module}
                  {task.source === "ai-audit" && <span className="ml-1 text-[var(--color-ai-strong)]">· AI Audit</span>}
                </div>
              </div>
              <div className="hidden items-center gap-1.5 sm:flex">
                <Avatar name={task.owner} size={22} />
                <span className="text-[12px] text-[var(--color-ink-tertiary)]">{task.ownerTeam}</span>
              </div>
              <span className="hidden w-20 shrink-0 text-right text-[12px] text-[var(--color-ink-tertiary)] md:block">
                {new Date(task.dueDate).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
              </span>
              <Badge variant={task.status === "done" ? "success" : task.status === "blocked" ? "critical" : task.status === "in-progress" ? "info" : "neutral"} className="w-24 shrink-0 justify-center capitalize">
                {task.status.replace("-", " ")}
              </Badge>
              <Button variant="ghost" size="sm">Open</Button>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
