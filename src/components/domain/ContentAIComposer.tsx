"use client";

import { useState } from "react";
import { Sparkles, ImageIcon, Clock, Radio } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { generateContentIdea, type GeneratedContentIdea } from "@/lib/mock/ai-content";

const STAGES = ["Draft", "Review", "Approve", "Schedule"] as const;

export function ContentAIComposer() {
  const [prompt, setPrompt] = useState("");
  const [idea, setIdea] = useState<GeneratedContentIdea | null>(null);
  const [stage, setStage] = useState(0);

  function generate() {
    if (!prompt.trim()) return;
    setIdea(generateContentIdea(prompt));
    setStage(0);
  }

  return (
    <Card className="overflow-hidden">
      <div className="flex items-center gap-2 border-b border-[var(--color-border)] bg-[linear-gradient(120deg,var(--color-ai-soft)_0%,transparent_65%)] px-5 py-4">
        <div className="flex h-7 w-7 items-center justify-center rounded-[8px] bg-[var(--color-ai)] text-white">
          <Sparkles className="h-3.5 w-3.5" />
        </div>
        <h3 className="text-[14px] font-semibold text-[var(--color-ink)]">Create with AI</h3>
      </div>
      <div className="p-5">
        <div className="flex gap-2">
          <input
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && generate()}
            placeholder="What should we post for SkinEthics Kothrud this week?"
            className="flex-1 rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-surface-sunken)] px-3.5 py-2.5 text-[13.5px] outline-none placeholder:text-[var(--color-ink-tertiary)] focus:border-[var(--color-primary)]"
          />
          <Button variant="ai" onClick={generate}>Generate</Button>
        </div>

        {idea && (
          <div className="mt-5 animate-fade-in rounded-[var(--radius-md)] border border-[var(--color-border)] p-4">
            <div className="flex items-center justify-between">
              <h4 className="text-[14px] font-semibold text-[var(--color-ink)]">{idea.topic}</h4>
              <span className="rounded-full bg-[var(--color-ai-soft)] px-2.5 py-0.5 text-[11px] font-medium text-[var(--color-ai-strong)]">{idea.channel}</span>
            </div>
            <p className="mt-2 text-[13px] font-medium italic text-[var(--color-ink-secondary)]">&ldquo;{idea.hook}&rdquo;</p>
            <p className="mt-2 text-[13px] leading-relaxed text-[var(--color-ink-secondary)]">{idea.caption}</p>
            <div className="mt-3 flex flex-wrap items-center gap-4 text-[12px] text-[var(--color-ink-tertiary)]">
              <span className="flex items-center gap-1.5"><ImageIcon className="h-3.5 w-3.5" /> {idea.imageSuggestion}</span>
              <span className="flex items-center gap-1.5"><Clock className="h-3.5 w-3.5" /> {idea.suggestedTime}</span>
              <span className="flex items-center gap-1.5"><Radio className="h-3.5 w-3.5" /> CTA: {idea.cta}</span>
            </div>

            <div className="mt-4 flex items-center gap-1.5">
              {STAGES.map((s, i) => (
                <button
                  key={s}
                  onClick={() => setStage(i)}
                  className={`flex-1 rounded-[var(--radius-sm)] py-2 text-[12px] font-medium transition-colors ${
                    i <= stage ? "bg-[var(--color-primary)] text-white" : "bg-[var(--color-surface-sunken)] text-[var(--color-ink-tertiary)]"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
            <Button
              variant="primary"
              size="sm"
              className="mt-3 w-full"
              onClick={() => setStage((s) => Math.min(s + 1, STAGES.length - 1))}
              disabled={stage === STAGES.length - 1}
            >
              {stage === STAGES.length - 1 ? "Scheduled" : `Move to ${STAGES[stage + 1]}`}
            </Button>
          </div>
        )}
      </div>
    </Card>
  );
}
