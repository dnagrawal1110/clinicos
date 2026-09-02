import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { PageHeader } from "@/components/shell/PageHeader";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getGoogleSetupChecklist } from "@/lib/integrations/setup-checklist";

// Part 35 — shown when /api/integrations/google/connect is hit without
// Google OAuth configured. Never pretends the connection succeeded.
export default function GoogleSetupRequiredPage() {
  const missing = getGoogleSetupChecklist().filter((c) => !c.configured);

  return (
    <div className="animate-fade-in">
      <PageHeader title="Google Business Profile — Setup Required" subtitle="Connecting Google isn't possible yet in this environment." />
      <Card className="overflow-hidden">
        <div className="flex items-center gap-2 border-b border-[var(--color-border)] bg-[var(--color-warning-soft)] px-5 py-4">
          <AlertTriangle className="h-4 w-4 text-[var(--color-warning-strong)]" />
          <CardTitle>Missing configuration</CardTitle>
        </div>
        <div className="px-5 py-4">
          <p className="text-[13.5px] text-[var(--color-ink-secondary)]">The following must be configured before any real Google account can be connected:</p>
          <ul className="mt-3 flex flex-col gap-1.5">
            {missing.map((m) => <li key={m.key} className="text-[13px] text-[var(--color-ink)]">• {m.label} (<code className="text-[12px] text-[var(--color-ink-tertiary)]">{m.key}</code>)</li>)}
          </ul>
          <div className="mt-5 flex gap-2">
            <Link href="/integrations/system-health"><Button variant="outline" size="md">View System Health</Button></Link>
          </div>
        </div>
      </Card>
      <CardHeader className="mt-2 px-0"><CardDescription>No fake connection was created. Nothing in the database changed.</CardDescription></CardHeader>
    </div>
  );
}
