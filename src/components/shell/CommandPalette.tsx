"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Command } from "cmdk";
import * as Dialog from "@radix-ui/react-dialog";
import { Sparkles, Search, ArrowLeft, Building2, MapPin, LayoutGrid, Stethoscope, MapPinned } from "lucide-react";
import { useScope } from "@/lib/scope-context";
import { ALL_CLIENTS, allLocations, allDoctors } from "@/lib/mock/clients";
import { TASKS, CONTENT_ITEMS, REVIEW_CAMPAIGNS } from "@/lib/mock/operations";
import { askClinicOS, AI_EXAMPLE_QUERIES, type AIResponse } from "@/lib/mock/ai-responses";
import { NAV_GROUPS } from "./nav-config";
import { cn } from "@/lib/utils";

const PAGES = NAV_GROUPS.flatMap((g) => g.items);
const GROUP_HEADING = "[&_[cmdk-group-heading]]:px-2.5 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-[11px] [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wide [&_[cmdk-group-heading]]:text-[var(--color-ink-tertiary)]";

export function CommandPalette() {
  const { paletteOpen, setPaletteOpen, setScope, scope } = useScope();
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [answer, setAnswer] = useState<{ q: string; r: AIResponse } | null>(null);

  const q = query.toLowerCase();

  const clientMatches = useMemo(() => {
    if (!query) return ALL_CLIENTS.slice(0, 5);
    return ALL_CLIENTS.filter((c) => c.name.toLowerCase().includes(q)).slice(0, 6);
  }, [query, q]);

  const locationMatches = useMemo(() => {
    if (!query) return [];
    return allLocations().filter((l) => l.name.toLowerCase().includes(q)).slice(0, 6);
  }, [query, q]);

  const doctorMatches = useMemo(() => {
    if (!query) return [];
    return allDoctors().filter((d) => d.name.toLowerCase().includes(q)).slice(0, 5);
  }, [query, q]);

  const pageMatches = useMemo(() => {
    if (!query) return PAGES.slice(0, 4);
    return PAGES.filter((p) => p.label.toLowerCase().includes(q));
  }, [query, q]);

  const relatedCounts = useMemo(() => {
    if (!query) return null;
    const taskCount = TASKS.filter((t) => t.title.toLowerCase().includes(q) || t.module.toLowerCase().includes(q)).length;
    const contentCount = CONTENT_ITEMS.filter((c) => c.title.toLowerCase().includes(q)).length;
    const campaignCount = REVIEW_CAMPAIGNS.filter((c) => c.name.toLowerCase().includes(q)).length;
    if (taskCount + contentCount + campaignCount === 0) return null;
    return { taskCount, contentCount, campaignCount };
  }, [query, q]);

  function close() {
    setPaletteOpen(false);
    setTimeout(() => { setQuery(""); setAnswer(null); }, 150);
  }

  function ask(query: string) {
    setAnswer({ q: query, r: askClinicOS(query, scope) });
  }

  function goToLocation(clientId: string, locationId?: string) {
    if (locationId) {
      setScope({ type: "location", clientId, locationId });
      router.push(`/clients/${clientId}/locations/${locationId}`);
    } else {
      setScope({ type: "client", clientId });
      router.push(`/clients/${clientId}`);
    }
    close();
  }

  return (
    <Dialog.Root open={paletteOpen} onOpenChange={(v) => (v ? setPaletteOpen(true) : close())}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/35 backdrop-blur-[2px] data-[state=open]:animate-fade-in" />
        <Dialog.Content
          className="fixed left-1/2 top-[14vh] z-50 w-full max-w-[640px] -translate-x-1/2 overflow-hidden rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-lg)] animate-scale-in focus:outline-none"
        >
          <Dialog.Title className="sr-only">Ask ClinicOS</Dialog.Title>
          <Command shouldFilter={false} className="flex max-h-[70vh] flex-col">
            {answer ? (
              <div className="flex flex-col">
                <div className="flex items-center gap-2 border-b border-[var(--color-border)] bg-[linear-gradient(135deg,var(--color-ai-soft),var(--color-surface))] px-4 py-3">
                  <button onClick={() => setAnswer(null)} className="rounded-md p-1 text-[var(--color-ink-tertiary)] hover:bg-white/60">
                    <ArrowLeft className="h-4 w-4" />
                  </button>
                  <Sparkles className="h-4 w-4 text-[var(--color-ai)]" />
                  <span className="text-[13px] font-medium text-[var(--color-ink)]">{answer.q}</span>
                </div>
                <div className="max-h-[55vh] overflow-y-auto px-5 py-4">
                  <div className="text-[10.5px] font-semibold uppercase tracking-wide text-[var(--color-ink-tertiary)]">Answer</div>
                  <p className="mt-1 text-[14px] leading-relaxed text-[var(--color-ink)]">{answer.r.answer}</p>

                  {answer.r.evidence.length > 0 && (
                    <>
                      <div className="mt-4 text-[10.5px] font-semibold uppercase tracking-wide text-[var(--color-ink-tertiary)]">Evidence</div>
                      <ul className="mt-1.5 flex flex-col gap-1.5">
                        {answer.r.evidence.map((item, i) => (
                          <li key={i} className="flex items-start gap-2 rounded-[var(--radius-sm)] bg-[var(--color-surface-sunken)] px-3 py-2 text-[13px] text-[var(--color-ink-secondary)]">
                            <span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-[var(--color-ai)]" />
                            {item}
                          </li>
                        ))}
                      </ul>
                    </>
                  )}

                  {answer.r.actions.length > 0 && (
                    <>
                      <div className="mt-4 text-[10.5px] font-semibold uppercase tracking-wide text-[var(--color-ink-tertiary)]">Recommended Actions</div>
                      <ol className="mt-1.5 flex flex-col gap-1.5">
                        {answer.r.actions.map((a, i) => (
                          <li key={i} className="flex items-start gap-2 text-[13px] text-[var(--color-ink)]">
                            <span className="flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full bg-[var(--color-ai-soft)] text-[10.5px] font-semibold text-[var(--color-ai-strong)]">{i + 1}</span>
                            {a}
                          </li>
                        ))}
                      </ol>
                    </>
                  )}

                  {answer.r.affected.length > 0 && (
                    <>
                      <div className="mt-4 text-[10.5px] font-semibold uppercase tracking-wide text-[var(--color-ink-tertiary)]">Affected Locations</div>
                      <div className="mt-1.5 flex flex-wrap gap-1.5">
                        {answer.r.affected.map((a) => (
                          <button
                            key={a.href}
                            onClick={() => goToLocation(a.clientId, a.locationId)}
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
            ) : (
              <>
                <div className="flex items-center gap-2.5 border-b border-[var(--color-border)] px-4 py-3.5">
                  <Search className="h-4 w-4 text-[var(--color-ink-tertiary)]" />
                  <Command.Input
                    autoFocus
                    value={query}
                    onValueChange={setQuery}
                    placeholder="Search clients, locations, reviews, tasks — or ask ClinicOS AI..."
                    className="flex-1 bg-transparent text-[14px] outline-none placeholder:text-[var(--color-ink-tertiary)]"
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && query) ask(query);
                    }}
                  />
                  <kbd className="rounded border border-[var(--color-border)] px-1.5 py-0.5 text-[10px] text-[var(--color-ink-tertiary)]">ESC</kbd>
                </div>
                <Command.List className="flex-1 overflow-y-auto p-2">
                  {query && (
                    <Command.Group heading="Ask ClinicOS AI" className={GROUP_HEADING}>
                      <Command.Item
                        value={`ask-${query}`}
                        onSelect={() => ask(query)}
                        className="flex cursor-pointer items-center gap-2.5 rounded-[var(--radius-sm)] bg-[var(--color-ai-soft)] px-2.5 py-2.5 text-[13px] font-medium text-[var(--color-ai-strong)] data-[selected=true]:bg-[var(--color-ai-soft)]/80"
                      >
                        <Sparkles className="h-3.5 w-3.5" />
                        Ask: &ldquo;{query}&rdquo;
                      </Command.Item>
                    </Command.Group>
                  )}

                  {!query && (
                    <Command.Group heading="Try asking" className={GROUP_HEADING}>
                      {AI_EXAMPLE_QUERIES.slice(0, 5).map((eq) => (
                        <Command.Item
                          key={eq}
                          value={eq}
                          onSelect={() => ask(eq)}
                          className="flex cursor-pointer items-center gap-2.5 rounded-[var(--radius-sm)] px-2.5 py-2 text-[13px] text-[var(--color-ink)] data-[selected=true]:bg-[var(--color-surface-sunken)]"
                        >
                          <Sparkles className="h-3.5 w-3.5 text-[var(--color-ai)]" />
                          {eq}
                        </Command.Item>
                      ))}
                    </Command.Group>
                  )}

                  {relatedCounts && (
                    <Command.Group heading="Related records" className={GROUP_HEADING}>
                      {relatedCounts.taskCount > 0 && (
                        <Command.Item value="related-tasks" onSelect={() => { router.push("/tasks"); close(); }} className="flex cursor-pointer items-center gap-2.5 rounded-[var(--radius-sm)] px-2.5 py-2 text-[13px] text-[var(--color-ink)] data-[selected=true]:bg-[var(--color-surface-sunken)]">
                          {relatedCounts.taskCount} Task{relatedCounts.taskCount !== 1 ? "s" : ""} match &ldquo;{query}&rdquo;
                        </Command.Item>
                      )}
                      {relatedCounts.contentCount > 0 && (
                        <Command.Item value="related-content" onSelect={() => { router.push("/content/calendar"); close(); }} className="flex cursor-pointer items-center gap-2.5 rounded-[var(--radius-sm)] px-2.5 py-2 text-[13px] text-[var(--color-ink)] data-[selected=true]:bg-[var(--color-surface-sunken)]">
                          {relatedCounts.contentCount} Content item{relatedCounts.contentCount !== 1 ? "s" : ""} match
                        </Command.Item>
                      )}
                      {relatedCounts.campaignCount > 0 && (
                        <Command.Item value="related-campaigns" onSelect={() => { router.push("/reputation"); close(); }} className="flex cursor-pointer items-center gap-2.5 rounded-[var(--radius-sm)] px-2.5 py-2 text-[13px] text-[var(--color-ink)] data-[selected=true]:bg-[var(--color-surface-sunken)]">
                          {relatedCounts.campaignCount} Campaign{relatedCounts.campaignCount !== 1 ? "s" : ""} match
                        </Command.Item>
                      )}
                    </Command.Group>
                  )}

                  {pageMatches.length > 0 && (
                    <Command.Group heading="Pages" className={GROUP_HEADING}>
                      {pageMatches.map((p) => (
                        <Command.Item
                          key={p.href}
                          value={`page-${p.label}`}
                          onSelect={() => { router.push(p.href); close(); }}
                          className="flex cursor-pointer items-center gap-2.5 rounded-[var(--radius-sm)] px-2.5 py-2 text-[13px] text-[var(--color-ink)] data-[selected=true]:bg-[var(--color-surface-sunken)]"
                        >
                          <LayoutGrid className="h-3.5 w-3.5 text-[var(--color-ink-tertiary)]" />
                          {p.label}
                        </Command.Item>
                      ))}
                    </Command.Group>
                  )}

                  {clientMatches.length > 0 && (
                    <Command.Group heading="Clients" className={GROUP_HEADING}>
                      {clientMatches.map((c) => (
                        <Command.Item
                          key={c.id}
                          value={`client-${c.name}`}
                          onSelect={() => goToLocation(c.id)}
                          className="flex cursor-pointer items-center gap-2.5 rounded-[var(--radius-sm)] px-2.5 py-2 text-[13px] text-[var(--color-ink)] data-[selected=true]:bg-[var(--color-surface-sunken)]"
                        >
                          <Building2 className="h-3.5 w-3.5 text-[var(--color-ink-tertiary)]" />
                          {c.name}
                          <span className="ml-auto text-[11px] text-[var(--color-ink-tertiary)]">{c.specialty}</span>
                        </Command.Item>
                      ))}
                    </Command.Group>
                  )}

                  {doctorMatches.length > 0 && (
                    <Command.Group heading="Doctors" className={GROUP_HEADING}>
                      {doctorMatches.map((d) => (
                        <Command.Item
                          key={d.id}
                          value={`doctor-${d.name}`}
                          onSelect={() => goToLocation(d.clientId, d.locationIds[0])}
                          className="flex cursor-pointer items-center gap-2.5 rounded-[var(--radius-sm)] px-2.5 py-2 text-[13px] text-[var(--color-ink)] data-[selected=true]:bg-[var(--color-surface-sunken)]"
                        >
                          <Stethoscope className="h-3.5 w-3.5 text-[var(--color-ink-tertiary)]" />
                          {d.name}
                          <span className="ml-auto text-[11px] text-[var(--color-ink-tertiary)]">{d.locationIds.length} location{d.locationIds.length !== 1 ? "s" : ""}</span>
                        </Command.Item>
                      ))}
                    </Command.Group>
                  )}

                  {locationMatches.length > 0 && (
                    <Command.Group heading="Locations" className={GROUP_HEADING}>
                      {locationMatches.map((l) => {
                        const client = ALL_CLIENTS.find((c) => c.id === l.clientId)!;
                        return (
                          <Command.Item
                            key={l.id}
                            value={`loc-${client.name}-${l.name}`}
                            onSelect={() => goToLocation(client.id, l.id)}
                            className="flex cursor-pointer items-center gap-2.5 rounded-[var(--radius-sm)] px-2.5 py-2 text-[13px] text-[var(--color-ink)] data-[selected=true]:bg-[var(--color-surface-sunken)]"
                          >
                            <MapPin className="h-3.5 w-3.5 text-[var(--color-ink-tertiary)]" />
                            {client.name} — {l.name}
                            <span className="ml-auto flex items-center gap-1 text-[11px] text-[var(--color-ink-tertiary)]">
                              <MapPinned className="h-3 w-3" /> {l.city}
                            </span>
                          </Command.Item>
                        );
                      })}
                    </Command.Group>
                  )}
                </Command.List>
                <div className={cn("flex items-center justify-between border-t border-[var(--color-border)] px-4 py-2 text-[11px] text-[var(--color-ink-tertiary)]")}>
                  <span>Navigate with ↑↓, select with ↵</span>
                  <span className="flex items-center gap-1"><Sparkles className="h-3 w-3 text-[var(--color-ai)]" /> AI-native search</span>
                </div>
              </>
            )}
          </Command>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
