"use client";

import type React from "react";
import { useState } from "react";
import { Dialog, DialogContent, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Search, CheckCircle2, MapPin } from "lucide-react";

const DISCOVERED = [
  { account: "SkinEthics Clinics LLP", locations: ["Baner", "Wakad", "Kothrud"] },
  { account: "Dr. Ananya Sharma Dermatology", locations: ["Baner", "Wakad", "Kothrud", "Mumbai"] },
];

export function GoogleConnectDialog({ trigger }: { trigger: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<"connect" | "discover" | "done">("connect");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  function toggle(id: string) {
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function selectAll() {
    const all = new Set<string>();
    DISCOVERED.forEach((acc) => acc.locations.forEach((loc) => all.add(`${acc.account}__${loc}`)));
    setSelected(all);
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setStep("connect"); setSelected(new Set()); } }}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-md">
        {step === "connect" && (
          <>
            <DialogTitle>Connect Google Business Profile</DialogTitle>
            <DialogDescription>Connect your Google account to import and manage Business Profiles across locations.</DialogDescription>
            <div className="mt-5 flex flex-col items-center gap-4 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-sunken)] p-6 text-center">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-[var(--shadow-sm)]">
                <Search className="h-5 w-5 text-[var(--color-ink-secondary)]" />
              </div>
              <p className="text-[12.5px] text-[var(--color-ink-tertiary)]">This is a mock OAuth flow — no real Google account is contacted.</p>
              <Button variant="primary" size="md" className="w-full" onClick={() => setStep("discover")}>Connect Google</Button>
            </div>
          </>
        )}
        {step === "discover" && (
          <>
            <DialogTitle>Select locations to import</DialogTitle>
            <DialogDescription>We found {DISCOVERED.reduce((a, d) => a + d.locations.length, 0)} locations across {DISCOVERED.length} Google accounts.</DialogDescription>
            <div className="mt-4 flex items-center justify-between">
              <span className="text-[12px] text-[var(--color-ink-tertiary)]">{selected.size} selected</span>
              <Button variant="ghost" size="sm" onClick={selectAll}>Select all</Button>
            </div>
            <div className="mt-2 max-h-64 overflow-y-auto rounded-[var(--radius-md)] border border-[var(--color-border)]">
              {DISCOVERED.map((acc) => (
                <div key={acc.account} className="border-b border-[var(--color-border)] p-3 last:border-0">
                  <div className="mb-1.5 text-[12.5px] font-semibold text-[var(--color-ink)]">{acc.account}</div>
                  {acc.locations.map((loc) => {
                    const id = `${acc.account}__${loc}`;
                    return (
                      <label key={id} className="flex items-center gap-2 rounded-[var(--radius-sm)] px-2 py-1.5 text-[13px] text-[var(--color-ink-secondary)] hover:bg-[var(--color-surface-sunken)]">
                        <input type="checkbox" checked={selected.has(id)} onChange={() => toggle(id)} className="accent-[var(--color-primary)]" />
                        <MapPin className="h-3.5 w-3.5 text-[var(--color-ink-tertiary)]" /> {loc}
                      </label>
                    );
                  })}
                </div>
              ))}
            </div>
            <Button variant="primary" size="md" className="mt-4 w-full" disabled={selected.size === 0} onClick={() => setStep("done")}>
              Import {selected.size || ""} Location{selected.size === 1 ? "" : "s"}
            </Button>
          </>
        )}
        {step === "done" && (
          <div className="flex flex-col items-center gap-3 py-4 text-center">
            <CheckCircle2 className="h-10 w-10 text-[var(--color-success)]" />
            <DialogTitle>Import complete</DialogTitle>
            <DialogDescription>{selected.size} locations were imported and are now syncing.</DialogDescription>
            <Button variant="secondary" size="md" onClick={() => setOpen(false)}>Done</Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
