"use client";

import { useState } from "react";
import type React from "react";
import { useRouter } from "next/navigation";
import { Plus, Check } from "lucide-react";
import { Dialog, DialogContent, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { addCustomClient, logIntegrationActivity } from "@/lib/runtime-store";
import { isLiveMode } from "@/lib/integration-mode";
import { SPECIALTIES, CITIES } from "@/lib/mock/pools";
import type { Client } from "@/lib/types";

// Journey A — "Agency creates client... Do not require locations to be
// manually entered if they can be discovered from Google later." No
// locations are collected here; a client can be created with zero
// locations and have them populated via Google discovery afterward.
export function AddClientDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [doctorName, setDoctorName] = useState("");
  const [specialty, setSpecialty] = useState(SPECIALTIES[0]);
  const [city, setCity] = useState(CITIES[0]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdId, setCreatedId] = useState<string | null>(null);

  function reset() {
    setName(""); setDoctorName(""); setSpecialty(SPECIALTIES[0]); setCity(CITIES[0]);
    setError(null); setCreatedId(null); setSubmitting(false);
  }

  async function submit() {
    if (!name.trim()) { setError("Client name is required."); return; }
    setSubmitting(true);
    setError(null);

    if (!isLiveMode()) {
      const id = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || `client-${Date.now()}`;
      const client: Client = {
        id, name: name.trim(), specialty, city, status: "onboarding",
        accountManager: "Unassigned",
        doctors: doctorName.trim() ? [{ id: `${id}__doc-0`, clientId: id, name: doctorName.trim(), specialty, locationIds: [] }] : [],
        locations: [],
        activeServices: [],
        scores: { google: 0, reputation: 0, website: 0, content: 0, social: 0, ads: 0, leads: 0 },
        healthOverall: 0, healthTrend: 0, reviewsTotal: 0, ratingAvg: 0, leadsTotal: 0,
        appointmentsTotal: 0, adSpendTotal: 0, websiteHealth: 0,
        createdAt: new Date().toISOString(),
      };
      addCustomClient(client);
      logIntegrationActivity({ actorLabel: "Add Client", clientId: id, integration: "google", action: `Client "${name}" created (Demo Workspace)`, result: "success" });
      setCreatedId(id);
      setSubmitting(false);
      return;
    }

    try {
      const res = await fetch("/api/clients", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), specialty, city, doctorName: doctorName.trim() || undefined }),
      });
      const data = await res.json() as { clientId?: string; error?: string };
      if (!res.ok || !data.clientId) {
        setError(data.error ?? "Failed to create client.");
        setSubmitting(false);
        return;
      }
      setCreatedId(data.clientId);
    } catch {
      setError("Network error while creating client.");
    }
    setSubmitting(false);
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) reset(); }}>
      <DialogTrigger asChild>
        <Button variant="primary" size="md"><Plus className="h-3.5 w-3.5" /> Add Client</Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        {createdId ? (
          <div className="flex flex-col items-center gap-3 py-4 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--color-success-soft)]">
              <Check className="h-6 w-6 text-[var(--color-success-strong)]" />
            </div>
            <DialogTitle>{name} created</DialogTitle>
            <DialogDescription>Next: connect Google Business Profile from the client&rsquo;s Integrations tab to discover their locations.</DialogDescription>
            <div className="flex gap-2">
              <Button variant="secondary" size="md" onClick={() => setOpen(false)}>Done</Button>
              <Button variant="primary" size="md" onClick={() => { setOpen(false); router.push(`/clients/${createdId}`); }}>Open Client</Button>
            </div>
          </div>
        ) : (
          <>
            <DialogTitle>Add Client</DialogTitle>
            <DialogDescription>Locations don&rsquo;t need to be entered manually — they can be discovered from Google afterward.</DialogDescription>
            <div className="mt-4 flex flex-col gap-3">
              <Field label="Client / Doctor name">
                <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Dr. Uday Pote" className="w-full rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-surface-sunken)] px-3 py-2 text-[13.5px] outline-none focus:border-[var(--color-primary)]" />
              </Field>
              <Field label="Doctor profile (optional, if different from above)">
                <input value={doctorName} onChange={(e) => setDoctorName(e.target.value)} placeholder="Dr. Uday Pote" className="w-full rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-surface-sunken)] px-3 py-2 text-[13.5px] outline-none focus:border-[var(--color-primary)]" />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Specialty">
                  <select value={specialty} onChange={(e) => setSpecialty(e.target.value)} className="w-full rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-surface-sunken)] px-3 py-2 text-[13.5px] outline-none">
                    {SPECIALTIES.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </Field>
                <Field label="City">
                  <select value={city} onChange={(e) => setCity(e.target.value)} className="w-full rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-surface-sunken)] px-3 py-2 text-[13.5px] outline-none">
                    {CITIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </Field>
              </div>
              {error && <p className="text-[12.5px] text-[var(--color-critical-strong)]">{error}</p>}
              <Button variant="primary" size="md" disabled={submitting} onClick={submit}>{submitting ? "Creating..." : "Create Client"}</Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-1 text-[11.5px] font-medium text-[var(--color-ink-tertiary)]">{label}</div>
      {children}
    </div>
  );
}
