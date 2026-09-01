"use client";

import Link from "next/link";
import { PageHeader } from "@/components/shell/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ALL_CLIENTS } from "@/lib/mock/clients";
import { useScope } from "@/lib/scope-context";

export default function ClientReportsPage() {
  const { setScope } = useScope();
  return (
    <div className="animate-fade-in">
      <PageHeader title="Client Reports" subtitle="Report history and send status, organized by client." />
      <Card>
        <div className="divide-y divide-[var(--color-border)] px-2">
          {ALL_CLIENTS.slice(0, 20).map((c, i) => (
            <div key={c.id} className="flex items-center gap-3 px-3 py-3.5">
              <div className="min-w-0 flex-1">
                <div className="text-[13.5px] font-medium text-[var(--color-ink)]">{c.name}</div>
                <div className="text-[11.5px] text-[var(--color-ink-tertiary)]">Last sent {i % 3 === 0 ? "2 days ago" : i % 3 === 1 ? "3 weeks ago" : "Never"}</div>
              </div>
              <Badge variant={i % 3 === 2 ? "warning" : "success"}>{i % 3 === 2 ? "Not sent this month" : "Up to date"}</Badge>
              <Link href="/reports/preview" onClick={() => setScope({ type: "client", clientId: c.id })}><Button variant="ghost" size="sm">Preview</Button></Link>
              <Link href="/reports/preview" onClick={() => setScope({ type: "client", clientId: c.id })}><Button variant="outline" size="sm">Generate</Button></Link>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
