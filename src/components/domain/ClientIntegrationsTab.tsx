"use client";

import { useEffect, useState } from "react";
import { ExternalLink, Info } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { isLiveMode } from "@/lib/integration-mode";
import { getWorkspaceMode } from "@/lib/runtime-store";
import { getConnectionForClient } from "@/repositories/connections";
import { CONNECTION_STATE_LABEL, CONNECTION_STATE_TONE, type ConnectionState } from "@/lib/integrations/connection-state";
import type { Client } from "@/lib/types";

const OTHER_INTEGRATIONS = [
  { key: "meta", label: "Meta (Facebook & Instagram)" },
  { key: "google-ads", label: "Google Ads" },
  { key: "whatsapp", label: "WhatsApp" },
  { key: "website", label: "Website" },
];

// Part 15 — Client Workspace aggregates integration health. This is also
// the entry point for Journey B: a freshly-created client with zero
// locations starts here, not on a Location Workspace that doesn't exist yet.
export function ClientIntegrationsTab({ client }: { client: Client }) {
  const [googleState, setGoogleState] = useState<ConnectionState | "loading">("loading");
  const live = isLiveMode();

  useEffect(() => {
    let cancelled = false;
    getConnectionForClient(client.id, "google-business-profile").then((conn) => {
      if (!cancelled) setGoogleState(conn?.status ?? "not-connected");
    });
    return () => { cancelled = true; };
  }, [client.id]);

  return (
    <div className="flex flex-col gap-5">
      <Card>
        <CardHeader>
          <div>
            <CardTitle>Integration Health</CardTitle>
            <CardDescription>{client.name}</CardDescription>
          </div>
        </CardHeader>
        <div className="flex flex-col divide-y divide-[var(--color-border)] px-5 pb-3">
          <div className="flex items-center gap-3 py-3">
            <div className="min-w-0 flex-1">
              <div className="text-[13.5px] font-medium text-[var(--color-ink)]">Google Business Profile</div>
              {client.locations.length === 0 && <div className="text-[11.5px] text-[var(--color-ink-tertiary)]">No locations yet — connect Google to discover them</div>}
            </div>
            {googleState === "loading" ? (
              <Badge variant="neutral">Checking...</Badge>
            ) : (
              <Badge variant={CONNECTION_STATE_TONE[googleState as ConnectionState] ?? "neutral"}>
                {CONNECTION_STATE_LABEL[googleState as ConnectionState] ?? "Not Connected"}
              </Badge>
            )}
            {googleState === "not-connected" && (
              <a href={`/api/integrations/google/connect?clientId=${client.id}&returnTo=${encodeURIComponent(`/clients/${client.id}?tab=integrations`)}`}>
                <Button variant="primary" size="sm">Connect Google</Button>
              </a>
            )}
          </div>
          {OTHER_INTEGRATIONS.map((i) => (
            <div key={i.key} className="flex items-center gap-3 py-3">
              <div className="flex-1 text-[13.5px] font-medium text-[var(--color-ink)]">{i.label}</div>
              <Badge variant="neutral">Not Configured</Badge>
            </div>
          ))}
        </div>
      </Card>

      {!live && (
        <Card className="flex items-start gap-2.5 p-4">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-[var(--color-info)]" />
          <p className="text-[12.5px] text-[var(--color-ink-secondary)]">
            You&rsquo;re in Demo Workspace ({getWorkspaceMode()}). Switch to Live Agency Workspace in <a href="/integrations" className="font-medium text-[var(--color-primary-strong)] underline">Integrations</a> to attempt a real Google connection for this client.
          </p>
        </Card>
      )}

      <Card className="flex items-center justify-between p-4">
        <p className="text-[12.5px] text-[var(--color-ink-tertiary)]">ClinicOS never asks for a Google password — connecting opens Google&rsquo;s own sign-in and authorization screen.</p>
        <a href="/integrations/system-health" className="flex shrink-0 items-center gap-1 text-[12px] font-medium text-[var(--color-primary-strong)]">
          System Health <ExternalLink className="h-3 w-3" />
        </a>
      </Card>
    </div>
  );
}
