import { CheckCircle2, XCircle } from "lucide-react";
import { PageHeader } from "@/components/shell/PageHeader";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getGoogleSetupChecklist, GOOGLE_SETUP_STEPS } from "@/lib/integrations/setup-checklist";

// Part 33 — a safe environment-configuration view. Never displays a secret
// value, only whether each one is present. Server Component so process.env
// is read on the server and only the boolean result ever reaches the client.
export default function SystemHealthPage() {
  const checklist = getGoogleSetupChecklist();
  const allConfigured = checklist.every((c) => c.configured);

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="System Health"
        subtitle="Environment configuration status — never displays secret values, only whether each is present."
      />
      <Card>
        <CardHeader>
          <div>
            <CardTitle>Google Business Profile — Environment Variables</CardTitle>
            <CardDescription>{allConfigured ? "All required variables are configured." : "Some required variables are missing — Google Connect will show \"Setup Required\" until these are set."}</CardDescription>
          </div>
        </CardHeader>
        <div className="flex flex-col divide-y divide-[var(--color-border)] px-5 pb-3">
          {checklist.map((item) => (
            <div key={item.key} className="flex items-center gap-3 py-2.5">
              {item.configured ? <CheckCircle2 className="h-4 w-4 shrink-0 text-[var(--color-success)]" /> : <XCircle className="h-4 w-4 shrink-0 text-[var(--color-critical)]" />}
              <div className="min-w-0 flex-1">
                <div className="text-[13px] text-[var(--color-ink)]">{item.label}</div>
                <code className="text-[11px] text-[var(--color-ink-tertiary)]">{item.key}</code>
              </div>
              <Badge variant={item.configured ? "success" : "critical"}>{item.configured ? "Configured" : "Missing"}</Badge>
            </div>
          ))}
        </div>
      </Card>

      <Card className="mt-5">
        <CardHeader>
          <div>
            <CardTitle>Google Cloud / OAuth Setup Checklist</CardTitle>
            <CardDescription>Manual steps — nothing here can be verified from an environment variable alone (Part 34)</CardDescription>
          </div>
        </CardHeader>
        <div className="flex flex-col gap-2 px-5 pb-5">
          {GOOGLE_SETUP_STEPS.map((step) => (
            <label key={step} className="flex items-start gap-2.5 text-[13px] text-[var(--color-ink-secondary)]">
              <input type="checkbox" disabled className="mt-0.5 h-3.5 w-3.5" />
              {step}
            </label>
          ))}
        </div>
      </Card>
    </div>
  );
}
