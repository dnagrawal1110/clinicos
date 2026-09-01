import { CheckCircle2, AlertTriangle, XCircle, Circle } from "lucide-react";
import { PageHeader } from "@/components/shell/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { GoogleConnectDialog } from "@/components/domain/GoogleConnectDialog";
import { INTEGRATIONS } from "@/lib/mock/operations";
import type { Integration } from "@/lib/types";

const CATEGORIES = ["Google", "Meta", "Communication", "Website"];

const STATUS_META: Record<Integration["status"], { label: string; icon: typeof CheckCircle2; color: string }> = {
  connected: { label: "Connected", icon: CheckCircle2, color: "var(--color-success-strong)" },
  attention: { label: "Needs attention", icon: AlertTriangle, color: "var(--color-warning-strong)" },
  disconnected: { label: "Disconnected", icon: XCircle, color: "var(--color-critical-strong)" },
  "not-connected": { label: "Not connected", icon: Circle, color: "var(--color-ink-tertiary)" },
};

export default function IntegrationsPage() {
  return (
    <div className="animate-fade-in">
      <PageHeader title="Integrations" subtitle="Connect Google, Meta, communication, and website platforms across the portfolio." />

      {CATEGORIES.map((category) => (
        <div key={category} className="mb-6">
          <h3 className="mb-2.5 text-[12.5px] font-semibold uppercase tracking-wide text-[var(--color-ink-tertiary)]">{category}</h3>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {INTEGRATIONS.filter((i) => i.category === category).map((integration) => {
              const meta = STATUS_META[integration.status];
              const Icon = meta.icon;
              const isGoogleProfile = integration.name === "Google Business Profile";
              return (
                <Card key={integration.id} className="p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="text-[13.5px] font-semibold text-[var(--color-ink)]">{integration.name}</h4>
                      <p className="mt-0.5 text-[12px] text-[var(--color-ink-tertiary)]">{integration.description}</p>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-[12px] font-medium" style={{ color: meta.color }}>
                      <Icon className="h-3.5 w-3.5" /> {meta.label}
                    </span>
                    {integration.connectedAccounts ? (
                      <span className="text-[11.5px] text-[var(--color-ink-tertiary)]">{integration.connectedAccounts} accounts</span>
                    ) : null}
                  </div>
                  <div className="mt-3">
                    {isGoogleProfile ? (
                      <GoogleConnectDialog trigger={<Button variant="outline" size="sm" className="w-full">Manage connections</Button>} />
                    ) : integration.status === "not-connected" ? (
                      <Button variant="primary" size="sm" className="w-full">Connect</Button>
                    ) : integration.status === "attention" ? (
                      <Button variant="outline" size="sm" className="w-full">Reconnect</Button>
                    ) : (
                      <Button variant="ghost" size="sm" className="w-full">Manage</Button>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
