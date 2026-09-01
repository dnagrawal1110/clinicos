import { CheckCircle2, Circle } from "lucide-react";
import { SERVICE_CATALOG, type ServiceKey } from "@/lib/types";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export function ServicePackage({ activeServices }: { activeServices: ServiceKey[] }) {
  const active = new Set(activeServices);
  return (
    <Card>
      <CardHeader className="flex-col items-start gap-0.5">
        <CardTitle>Service Package</CardTitle>
        <CardDescription>What the agency is actively managing for this client</CardDescription>
      </CardHeader>
      <div className="grid grid-cols-1 gap-1.5 px-5 pb-5 pt-2 sm:grid-cols-2">
        {SERVICE_CATALOG.map((service) => {
          const isActive = active.has(service);
          return (
            <div key={service} className="flex items-center gap-2 text-[13px]">
              {isActive ? (
                <CheckCircle2 className="h-4 w-4 shrink-0 text-[var(--color-success)]" />
              ) : (
                <Circle className="h-4 w-4 shrink-0 text-[var(--color-border-strong)]" />
              )}
              <span className={isActive ? "text-[var(--color-ink)]" : "text-[var(--color-ink-tertiary)]"}>{service}</span>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
