"use client";

import { useState } from "react";
import { Sparkles, Check, X, UserPlus } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function AIDiagnosisCard({
  diagnosis, actions,
}: {
  diagnosis: string[];
  actions: { id: string; label: string }[];
}) {
  const [resolved, setResolved] = useState<Record<string, "assigned" | "done" | "dismissed">>({});

  return (
    <Card className="overflow-hidden">
      <div className="flex items-center gap-2 border-b border-[var(--color-border)] bg-[linear-gradient(120deg,var(--color-ai-soft)_0%,transparent_65%)] px-5 py-4">
        <div className="flex h-7 w-7 items-center justify-center rounded-[8px] bg-[var(--color-ai)] text-white">
          <Sparkles className="h-3.5 w-3.5" />
        </div>
        <h3 className="text-[14px] font-semibold text-[var(--color-ink)]">AI Diagnosis</h3>
      </div>
      <div className="px-5 py-4">
        <ul className="flex flex-col gap-2">
          {diagnosis.map((line, i) => (
            <li key={i} className="flex items-start gap-2 text-[13.5px] leading-relaxed text-[var(--color-ink-secondary)]">
              <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-[var(--color-ai)]" />
              {line}
            </li>
          ))}
        </ul>
      </div>
      <div className="border-t border-[var(--color-border)] px-5 py-4">
        <h4 className="mb-3 text-[12.5px] font-semibold uppercase tracking-wide text-[var(--color-ink-tertiary)]">Recommended Actions</h4>
        <div className="flex flex-col gap-2">
          {actions.map((action, i) => {
            const state = resolved[action.id];
            return (
              <div
                key={action.id}
                className={cn(
                  "flex items-center gap-3 rounded-[var(--radius-sm)] border border-[var(--color-border)] px-3 py-2.5",
                  state === "dismissed" && "opacity-40"
                )}
              >
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[var(--color-surface-sunken)] text-[11px] font-semibold text-[var(--color-ink-secondary)]">{i + 1}</span>
                <span className="flex-1 text-[13.5px] text-[var(--color-ink)]">{action.label}</span>
                {state ? (
                  <span className="text-[12px] font-medium capitalize text-[var(--color-ink-tertiary)]">{state}</span>
                ) : (
                  <div className="flex items-center gap-1.5">
                    <Button variant="outline" size="sm" onClick={() => setResolved((r) => ({ ...r, [action.id]: "assigned" }))}>
                      <UserPlus className="h-3 w-3" /> Assign
                    </Button>
                    <Button variant="primary" size="sm" onClick={() => setResolved((r) => ({ ...r, [action.id]: "done" }))}>
                      <Check className="h-3 w-3" /> Do Now
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setResolved((r) => ({ ...r, [action.id]: "dismissed" }))}>
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </Card>
  );
}
