"use client";

import { useState } from "react";
import { CheckCircle2, Circle } from "lucide-react";
import type { Client } from "@/lib/types";
import { getOnboardingProgress } from "@/lib/mock/onboarding";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export function OnboardingWizard({ client }: { client: Client }) {
  const initial = getOnboardingProgress(client);
  const [steps, setSteps] = useState(initial.steps);
  const percent = Math.round((steps.filter((s) => s.done).length / steps.length) * 100);
  const nextIndex = steps.findIndex((s) => !s.done);

  function completeNext() {
    if (nextIndex === -1) return;
    setSteps((prev) => prev.map((s, i) => (i === nextIndex ? { ...s, done: true } : s)));
  }

  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>{client.name}</CardTitle>
          <p className="text-[12px] text-[var(--color-ink-tertiary)]">{client.specialty} · {client.city}</p>
        </div>
        <Badge variant={percent === 100 ? "success" : "neutral"}>{percent}% complete</Badge>
      </CardHeader>
      <div className="px-5 pb-2 pt-3">
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--color-surface-sunken)]">
          <div className="h-full rounded-full bg-[var(--color-primary)] transition-all duration-500" style={{ width: `${percent}%` }} />
        </div>
      </div>
      <div className="flex flex-col gap-2 px-5 pb-5 pt-3">
        {steps.map((step, i) => (
          <div key={step.key} className="flex items-center gap-2 text-[13px]">
            {step.done ? (
              <CheckCircle2 className="h-4 w-4 text-[var(--color-success)]" />
            ) : (
              <Circle className={i === nextIndex ? "h-4 w-4 text-[var(--color-primary)]" : "h-4 w-4 text-[var(--color-border-strong)]"} />
            )}
            <span className={step.done ? "text-[var(--color-ink-secondary)] line-through" : i === nextIndex ? "font-medium text-[var(--color-ink)]" : "text-[var(--color-ink-tertiary)]"}>
              {i + 1}. {step.label}
            </span>
          </div>
        ))}
      </div>
      <div className="border-t border-[var(--color-border)] px-5 py-3">
        <Button variant="outline" size="sm" onClick={completeNext} disabled={nextIndex === -1}>
          {nextIndex === -1 ? "Onboarding complete" : `Mark "${steps[nextIndex].label}" done`}
        </Button>
      </div>
    </Card>
  );
}
