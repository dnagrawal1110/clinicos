"use client";

import { use } from "react";
import { notFound } from "next/navigation";
import { MapPin, Phone, Globe, CheckCircle2, XCircle, Clock, Stethoscope, UserCog } from "lucide-react";
import { PageHeader } from "@/components/shell/PageHeader";
import { Badge } from "@/components/ui/badge";
import { LocationWorkspaceView } from "@/components/domain/LocationWorkspaceView";
import { getClient } from "@/lib/mock/clients";
import { useSyncScope } from "@/lib/scope-context";
import { useRuntimeStore } from "@/lib/runtime-store";

function timeAgo(iso: string): string {
  const days = Math.round((Date.now() - new Date(iso).getTime()) / 86400000);
  if (days <= 0) return "Today";
  if (days === 1) return "Yesterday";
  return `${days} days ago`;
}

export default function LocationWorkspacePage({ params }: { params: Promise<{ clientId: string; locationId: string }> }) {
  useRuntimeStore();
  const { clientId, locationId } = use(params);
  const client = getClient(clientId);
  const location = client?.locations.find((l) => l.id === locationId);
  useSyncScope({ type: "location", clientId, locationId });

  if (!client) notFound();
  if (!location) notFound();

  const doctors = client.doctors.filter((d) => d.locationIds.includes(location.id));

  return (
    <div className="animate-fade-in">
      <PageHeader
        breadcrumb={[
          { label: "All Clients", href: "/clients" },
          { label: client.name, href: `/clients/${client.id}` },
          { label: location.name },
        ]}
        title={
          <span className="flex items-center gap-2.5">
            {client.name} / {location.name}
            <Badge variant={location.status === "active" ? "success" : "neutral"} className="capitalize">{location.status}</Badge>
          </span>
        }
        subtitle={
          <span className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <span className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" /> {location.address}</span>
            <span className="flex items-center gap-1.5"><Phone className="h-3.5 w-3.5" /> {location.phone}</span>
            <span className="flex items-center gap-1.5">
              {location.googleConnected ? <CheckCircle2 className="h-3.5 w-3.5 text-[var(--color-success)]" /> : <XCircle className="h-3.5 w-3.5 text-[var(--color-critical)]" />}
              Google Profile {location.googleConnected ? "Connected" : "Disconnected"}
            </span>
            <span className="flex items-center gap-1.5"><Globe className="h-3.5 w-3.5" /> Website Connected</span>
            <span className="flex items-center gap-1.5"><Clock className="h-3.5 w-3.5" /> Last activity: {timeAgo(location.lastActivity)}</span>
            <span className="flex items-center gap-1.5"><UserCog className="h-3.5 w-3.5" /> {client.accountManager}</span>
            {doctors.length > 0 && (
              <span className="flex items-center gap-1.5"><Stethoscope className="h-3.5 w-3.5" /> {doctors.map((d) => d.name).join(", ")}</span>
            )}
          </span>
        }
      />
      <LocationWorkspaceView client={client} location={location} />
    </div>
  );
}
