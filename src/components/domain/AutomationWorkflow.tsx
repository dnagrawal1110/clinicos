import { ArrowDown } from "lucide-react";
import type { AutomationStep } from "@/lib/types";

export function AutomationWorkflow({ steps }: { steps: AutomationStep[] }) {
  return (
    <div className="flex flex-col items-stretch">
      {steps.map((step, i) => (
        <div key={i} className="flex flex-col items-center">
          {i > 0 && <ArrowDown className="my-1 h-3.5 w-3.5 text-[var(--color-ink-tertiary)]" />}
          <div className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-sunken)] px-4 py-2.5">
            <div className="text-[13px] font-medium text-[var(--color-ink)]">{step.label}</div>
            <div className="text-[11.5px] text-[var(--color-ink-tertiary)]">{step.detail}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
