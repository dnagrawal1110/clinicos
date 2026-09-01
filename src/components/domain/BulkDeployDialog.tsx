"use client";

import { useMemo, useState } from "react";
import { Layers, Check, AlertTriangle } from "lucide-react";
import { Dialog, DialogContent, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { Scope } from "@/lib/scope-context";
import { getScopedLocations, getScopedDestinations } from "@/lib/scope-selectors";
import { getClient } from "@/lib/mock/clients";
import { addCustomCampaign, logAuditAction } from "@/lib/runtime-store";
import { track } from "@/lib/analytics";
import type { ReviewCampaign } from "@/lib/types";

const TRIGGERS = ["After consultation", "After appointment", "After procedure", "After follow-up"];

let bulkSeq = 0;
function nextBulkId(): string {
  bulkSeq += 1;
  return `bulk-deploy-${Date.now()}-${bulkSeq}`;
}

// Bulk deployment (section 46) — this is the tool that lets the agency
// actually operate hundreds of locations instead of creating one campaign
// at a time.
export function BulkDeployDialog({ scope }: { scope: Scope }) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [trigger, setTrigger] = useState(TRIGGERS[0]);
  const [deployed, setDeployed] = useState<number | null>(null);
  const locations = getScopedLocations(scope);
  const destinations = getScopedDestinations(scope);

  const rows = useMemo(() => locations.map((loc) => {
    const destination = destinations.find((d) => d.locationId === loc.id && d.type === "google");
    const blocked = loc.status !== "active" || !destination || destination.status !== "connected";
    return { location: loc, blocked, reason: loc.status !== "active" ? "Location paused" : !destination ? "No destination configured" : destination.status !== "connected" ? "Destination disconnected" : undefined };
  }), [locations, destinations]);

  const readyRows = rows.filter((r) => !r.blocked);
  const blockedCount = rows.length - readyRows.length;

  function toggle(id: string) {
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function selectAllReady() {
    setSelected(new Set(readyRows.map((r) => r.location.id)));
  }

  function deploy() {
    const targets = readyRows.filter((r) => selected.has(r.location.id));
    for (const { location } of targets) {
      const client = getClient(location.clientId);
      const campaign: ReviewCampaign = {
        id: nextBulkId(),
        name: `${location.name} Bulk Deployed Campaign`,
        clientId: location.clientId,
        locationId: location.id,
        doctorId: location.doctorIds[0],
        status: "active",
        trigger,
        audience: "All patients",
        language: "English",
        channel: "WhatsApp",
        reviewDestination: "Google",
        destinationPlatform: "google",
        maxRequestsPerPatient: 2,
        frequencyDays: 3,
        eligiblePatients: 0, requestsSent: 0, opened: 0, feedbackReceived: 0, googleClicks: 0, reviewsGenerated: 0,
      };
      addCustomCampaign(campaign);
      logAuditAction("campaign.deployed", "campaign", campaign.id, `Bulk-deployed to ${client?.name} — ${location.name}`, { clientId: location.clientId, locationId: location.id });
    }
    track("bulk_campaign_deployed", { properties: { count: targets.length } });
    setDeployed(targets.length);
  }

  function reset() {
    setSelected(new Set());
    setDeployed(null);
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) reset(); }}>
      <DialogTrigger asChild>
        <Button variant="outline" size="md"><Layers className="h-3.5 w-3.5" /> Bulk Deploy</Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        {deployed !== null ? (
          <div className="flex flex-col items-center gap-3 py-4 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--color-success-soft)]">
              <Check className="h-6 w-6 text-[var(--color-success-strong)]" />
            </div>
            <DialogTitle>Deployed to {deployed} location{deployed !== 1 ? "s" : ""}</DialogTitle>
            <DialogDescription>New campaigns now appear in Review Campaigns for each selected location.</DialogDescription>
            <Button variant="secondary" size="md" onClick={() => setOpen(false)}>Done</Button>
          </div>
        ) : (
          <>
            <DialogTitle>Bulk Deploy Review Campaign</DialogTitle>
            <DialogDescription>{selected.size} selected · {readyRows.length} ready · {blockedCount} blocked</DialogDescription>

            <div className="mt-3 flex items-center gap-2">
              <span className="text-[12px] text-[var(--color-ink-tertiary)]">Trigger</span>
              <select value={trigger} onChange={(e) => setTrigger(e.target.value)} className="h-8 rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-surface-sunken)] px-2 text-[12.5px] outline-none">
                {TRIGGERS.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
              <Button variant="ghost" size="sm" className="ml-auto" onClick={selectAllReady}>Select all ready</Button>
            </div>

            <div className="mt-3 max-h-[320px] overflow-y-auto rounded-[var(--radius-md)] border border-[var(--color-border)]">
              {rows.slice(0, 100).map(({ location, blocked, reason }) => {
                const client = getClient(location.clientId);
                return (
                  <label key={location.id} className={`flex items-center gap-3 border-b border-[var(--color-border)] px-3 py-2.5 last:border-0 ${blocked ? "opacity-50" : "cursor-pointer hover:bg-[var(--color-surface-sunken)]"}`}>
                    <input type="checkbox" disabled={blocked} checked={selected.has(location.id)} onChange={() => toggle(location.id)} className="h-3.5 w-3.5" />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[12.5px] font-medium text-[var(--color-ink)]">{client?.name} — {location.name}</div>
                      {blocked && <div className="flex items-center gap-1 text-[11px] text-[var(--color-warning-strong)]"><AlertTriangle className="h-3 w-3" /> {reason}</div>}
                    </div>
                    {blocked && <Badge variant="warning">Blocked</Badge>}
                  </label>
                );
              })}
            </div>

            <div className="mt-4 flex items-center justify-between border-t border-[var(--color-border)] pt-4">
              <span className="text-[12px] text-[var(--color-ink-tertiary)]">{rows.length > 100 ? `Showing first 100 of ${rows.length} locations` : ""}</span>
              <Button variant="primary" size="md" disabled={selected.size === 0} onClick={deploy}>Deploy to {selected.size}</Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
