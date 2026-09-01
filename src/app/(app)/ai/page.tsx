"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, ArrowUp, TrendingUp, Megaphone, Globe, Star, Users2 } from "lucide-react";
import { PageHeader } from "@/components/shell/PageHeader";
import { Card } from "@/components/ui/card";
import { useScope } from "@/lib/scope-context";
import { askClinicOS, AI_EXAMPLE_QUERIES, type AIResponse } from "@/lib/mock/ai-responses";

const MODULE_INSIGHTS = [
  { icon: Star, module: "Reputation", text: "Waiting time is mentioned in 14% of negative feedback across the portfolio this month.", color: "var(--color-warning)" },
  { icon: Megaphone, module: "Ads", text: "CPL increased 21% this week for Meta campaigns targeting Kothrud and Wakad audiences.", color: "var(--color-critical)" },
  { icon: Globe, module: "Website", text: "The Acne Treatment page has high search opportunity but weak conversion — 2.4% vs. portfolio avg 5.1%.", color: "var(--color-info)" },
  { icon: TrendingUp, module: "Google", text: "Your review velocity is 38% below your top competitor in 6 tracked locations.", color: "var(--color-ai)" },
  { icon: Users2, module: "Leads", text: "32 Google leads have not received a response within 15 minutes.", color: "var(--color-critical)" },
];

export default function AICommandCenterPage() {
  const [query, setQuery] = useState("");
  const [conversation, setConversation] = useState<{ q: string; r: AIResponse }[]>([]);
  const { scope, scopeLabel, setScope } = useScope();
  const router = useRouter();

  function ask(q: string) {
    if (!q.trim()) return;
    setConversation((c) => [...c, { q, r: askClinicOS(q, scope) }]);
    setQuery("");
  }

  function goTo(clientId: string, locationId?: string) {
    if (locationId) { setScope({ type: "location", clientId, locationId }); router.push(`/clients/${clientId}/locations/${locationId}`); }
    else { setScope({ type: "client", clientId }); router.push(`/clients/${clientId}`); }
  }

  return (
    <div className="animate-fade-in">
      <PageHeader title="AI Command Center" subtitle="Ask ClinicOS anything about your portfolio, or scan what it's already flagged." />

      <Card className="mb-6 overflow-hidden">
        <div className="bg-[linear-gradient(120deg,var(--color-ai-soft)_0%,transparent_70%)] p-6">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-[9px] bg-[var(--color-ai)] text-white">
                <Sparkles className="h-4 w-4" />
              </div>
              <h2 className="text-[16px] font-semibold text-[var(--color-ink)]">Ask ClinicOS</h2>
            </div>
            <span className="rounded-full bg-white px-3 py-1 text-[11.5px] font-medium text-[var(--color-ink-secondary)]">Scope: {scopeLabel}</span>
          </div>
          <div className="mt-4 flex items-center gap-2 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-white px-4 py-3">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && ask(query)}
              placeholder="Which clients need attention today?"
              className="flex-1 bg-transparent text-[14px] outline-none placeholder:text-[var(--color-ink-tertiary)]"
            />
            <button onClick={() => ask(query)} className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--color-ai)] text-white disabled:opacity-30" disabled={!query.trim()}>
              <ArrowUp className="h-4 w-4" />
            </button>
          </div>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {AI_EXAMPLE_QUERIES.map((eq) => (
              <button key={eq} onClick={() => ask(eq)} className="rounded-full border border-[var(--color-border)] bg-white px-3 py-1.5 text-[12px] font-medium text-[var(--color-ink-secondary)] hover:border-[var(--color-ai)] hover:text-[var(--color-ai-strong)]">
                {eq}
              </button>
            ))}
          </div>
        </div>

        {conversation.length > 0 && (
          <div className="flex flex-col gap-5 border-t border-[var(--color-border)] p-6">
            {conversation.map((turn, i) => (
              <div key={i} className="flex flex-col gap-2">
                <div className="self-end rounded-[var(--radius-md)] bg-[var(--color-surface-sunken)] px-3.5 py-2 text-[13.5px] font-medium text-[var(--color-ink)]">{turn.q}</div>
                <div className="rounded-[var(--radius-md)] border border-[var(--color-border)] p-4">
                  <div className="text-[10.5px] font-semibold uppercase tracking-wide text-[var(--color-ink-tertiary)]">Answer</div>
                  <p className="mt-1 text-[13.5px] leading-relaxed text-[var(--color-ink)]">{turn.r.answer}</p>

                  {turn.r.evidence.length > 0 && (
                    <>
                      <div className="mt-3 text-[10.5px] font-semibold uppercase tracking-wide text-[var(--color-ink-tertiary)]">Evidence</div>
                      <ul className="mt-1.5 flex flex-col gap-1.5">
                        {turn.r.evidence.map((item, j) => (
                          <li key={j} className="flex items-start gap-2 rounded-[var(--radius-sm)] bg-[var(--color-surface-sunken)] px-3 py-1.5 text-[12.5px] text-[var(--color-ink-secondary)]">
                            <span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-[var(--color-ai)]" />
                            {item}
                          </li>
                        ))}
                      </ul>
                    </>
                  )}

                  {turn.r.actions.length > 0 && (
                    <>
                      <div className="mt-3 text-[10.5px] font-semibold uppercase tracking-wide text-[var(--color-ink-tertiary)]">Recommended Actions</div>
                      <ol className="mt-1.5 flex flex-col gap-1.5">
                        {turn.r.actions.map((a, j) => (
                          <li key={j} className="flex items-start gap-2 text-[12.5px] text-[var(--color-ink)]">
                            <span className="flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full bg-[var(--color-ai-soft)] text-[10.5px] font-semibold text-[var(--color-ai-strong)]">{j + 1}</span>
                            {a}
                          </li>
                        ))}
                      </ol>
                    </>
                  )}

                  {turn.r.affected.length > 0 && (
                    <>
                      <div className="mt-3 text-[10.5px] font-semibold uppercase tracking-wide text-[var(--color-ink-tertiary)]">Affected Locations</div>
                      <div className="mt-1.5 flex flex-wrap gap-1.5">
                        {turn.r.affected.map((a) => (
                          <button
                            key={a.href}
                            onClick={() => goTo(a.clientId, a.locationId)}
                            className="rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-1.5 text-[12px] font-medium text-[var(--color-primary-strong)] hover:border-[var(--color-primary)] hover:bg-[var(--color-primary-soft)]"
                          >
                            {a.label}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card>
        <div className="border-b border-[var(--color-border)] px-5 py-4">
          <h3 className="text-[14.5px] font-semibold text-[var(--color-ink)]">AI insights across every module</h3>
          <p className="text-[12.5px] text-[var(--color-ink-tertiary)]">Contextual findings surfaced automatically — not a bolted-on chatbot.</p>
        </div>
        <div className="divide-y divide-[var(--color-border)]">
          {MODULE_INSIGHTS.map((insight, i) => {
            const Icon = insight.icon;
            return (
              <div key={i} className="flex items-start gap-3.5 px-5 py-4">
                <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full" style={{ background: `color-mix(in srgb, ${insight.color} 15%, white)` }}>
                  <Icon className="h-3.5 w-3.5" style={{ color: insight.color }} />
                </div>
                <div>
                  <span className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: insight.color }}>{insight.module}</span>
                  <p className="mt-0.5 text-[13.5px] text-[var(--color-ink)]">{insight.text}</p>
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
