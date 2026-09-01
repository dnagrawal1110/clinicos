"use client";

import { useState } from "react";
import { PageHeader } from "@/components/shell/PageHeader";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getClient } from "@/lib/mock/clients";
import { useScope } from "@/lib/scope-context";
import { getScopedApprovals } from "@/lib/scope-selectors";
import { cn } from "@/lib/utils";
import type { ApprovalItem } from "@/lib/types";

const STATUS_FILTERS: { key: ApprovalItem["status"] | "all"; label: string }[] = [
  { key: "all", label: "All" }, { key: "draft", label: "Draft" }, { key: "pending", label: "Pending Review" },
  { key: "approved", label: "Approved" }, { key: "scheduled", label: "Scheduled" }, { key: "published", label: "Published" }, { key: "rejected", label: "Rejected" },
];

const TYPE_LABEL: Record<ApprovalItem["type"], string> = {
  "google-post": "Google Post", "social-post": "Social Post", "review-response": "Review Response",
  "website-change": "Website Change", "ad-creative": "Ad Creative", "report": "Report",
};

const STATUS_VARIANT: Record<ApprovalItem["status"], "success" | "warning" | "critical" | "neutral" | "info"> = {
  draft: "neutral", pending: "warning", approved: "info", scheduled: "info", published: "success", rejected: "critical",
};

export default function ApprovalsPage() {
  const { scope, scopeMeta } = useScope();
  const [status, setStatus] = useState<ApprovalItem["status"] | "all">("pending");
  const approvals = getScopedApprovals(scope);
  const clientName = (id: string) => getClient(id)?.name ?? id;
  const filtered = status === "all" ? approvals : approvals.filter((a) => a.status === status);

  return (
    <div className="animate-fade-in">
      <PageHeader
        breadcrumb={scope.type !== "all" ? scopeMeta.crumbs.concat({ label: "Approvals" }) : undefined}
        title="Approval Center"
        subtitle="Google posts, social content, review responses, website changes, ads, and reports — all in one queue."
      />

      <div className="mb-4 flex flex-wrap items-center gap-1.5">
        {STATUS_FILTERS.map((f) => (
          <button key={f.key} onClick={() => setStatus(f.key)} className={cn("rounded-full px-3 py-1 text-[12.5px] font-medium", status === f.key ? "bg-[var(--color-primary)] text-white" : "bg-[var(--color-surface-sunken)] text-[var(--color-ink-secondary)]")}>
            {f.label} {f.key !== "all" && <span className="ml-1 opacity-70">{approvals.filter((a) => a.status === f.key).length}</span>}
          </button>
        ))}
      </div>

      <Card>
        <div className="divide-y divide-[var(--color-border)] px-2">
          {filtered.length === 0 ? (
            <p className="py-10 text-center text-[13px] text-[var(--color-ink-tertiary)]">Nothing here right now.</p>
          ) : filtered.map((item) => (
            <div key={item.id} className="flex items-center gap-3 px-3 py-3.5">
              <Badge variant="neutral">{TYPE_LABEL[item.type]}</Badge>
              <div className="min-w-0 flex-1">
                <div className="truncate text-[13.5px] font-medium text-[var(--color-ink)]">{item.title}</div>
                <div className="text-[11.5px] text-[var(--color-ink-tertiary)]">{clientName(item.clientId)} · Submitted by {item.owner}</div>
              </div>
              <span className="hidden text-[12px] text-[var(--color-ink-tertiary)] md:block">
                {new Date(item.submittedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
              </span>
              <Badge variant={STATUS_VARIANT[item.status]} className="w-24 shrink-0 justify-center capitalize">{item.status}</Badge>
              {item.status === "pending" ? (
                <div className="flex items-center gap-1.5">
                  <Button variant="primary" size="sm">Approve</Button>
                  <Button variant="outline" size="sm">Request Changes</Button>
                  <Button variant="ghost" size="sm">Reject</Button>
                </div>
              ) : (
                <Button variant="ghost" size="sm">View</Button>
              )}
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
