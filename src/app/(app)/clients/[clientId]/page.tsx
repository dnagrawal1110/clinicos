"use client";

import { use } from "react";
import { notFound, useRouter } from "next/navigation";
import Link from "next/link";
import { MapPin, CheckCircle2, Star, Globe, Target, CalendarCheck2, IndianRupee, Plus, FileBarChart, ExternalLink, MoreHorizontal, Stethoscope } from "lucide-react";
import { PageHeader } from "@/components/shell/PageHeader";
import { StatCard } from "@/components/ui/stat-card";
import { PortfolioHealth } from "@/components/domain/PortfolioHealth";
import { ClientWorkspaceView } from "@/components/domain/ClientWorkspaceView";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { getClient } from "@/lib/mock/clients";
import { useSyncScope } from "@/lib/scope-context";
import { useRuntimeStore, getCustomClients } from "@/lib/runtime-store";
import { formatINR, formatNumber } from "@/lib/utils";

const STATUS_META: Record<string, { label: string; variant: "success" | "warning" | "critical" | "neutral" }> = {
  active: { label: "Active", variant: "success" },
  onboarding: { label: "Onboarding", variant: "neutral" },
  "at-risk": { label: "At Risk", variant: "critical" },
  paused: { label: "Paused", variant: "warning" },
};

export default function ClientWorkspacePage({ params }: { params: Promise<{ clientId: string }> }) {
  useRuntimeStore();
  const { clientId } = use(params);
  const client = getClient(clientId) ?? getCustomClients().find((c) => c.id === clientId);
  const router = useRouter();
  const scope = { type: "client" as const, clientId };
  useSyncScope(scope);

  if (!client) notFound();

  const connectedGoogle = client.locations.filter((l) => l.googleConnected).length;
  const statusMeta = STATUS_META[client.status];

  return (
    <div className="animate-fade-in">
      <PageHeader
        breadcrumb={[{ label: "All Clients", href: "/clients" }, { label: client.name }]}
        title={
          <span className="flex items-center gap-2.5">
            {client.name}
            <Badge variant={statusMeta.variant}>{statusMeta.label}</Badge>
          </span>
        }
        subtitle={
          <span className="flex items-center gap-1.5">
            {client.brand ? `${client.brand} · ` : ""}{client.specialty} · {client.city} · <Stethoscope className="h-3.5 w-3.5" /> {client.doctors.length} Doctor{client.doctors.length !== 1 ? "s" : ""} · {client.locations.length} Location{client.locations.length !== 1 ? "s" : ""} · Account Manager: {client.accountManager}
          </span>
        }
        actions={
          <>
            <select
              onChange={(e) => e.target.value && router.push(`/clients/${client.id}/locations/${e.target.value}`)}
              defaultValue=""
              className="h-9 rounded-[var(--radius-sm)] border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-2.5 text-[13px] text-[var(--color-ink-secondary)] outline-none"
            >
              <option value="" disabled>Jump to location…</option>
              {client.locations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
            </select>
            <Button variant="outline" size="md"><Plus className="h-3.5 w-3.5" /> Add Location</Button>
            <Link href="/reports/preview"><Button variant="outline" size="md"><FileBarChart className="h-3.5 w-3.5" /> Generate Report</Button></Link>
            <Button variant="secondary" size="md"><ExternalLink className="h-3.5 w-3.5" /> Open Client Portal</Button>
            <Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button>
          </>
        }
      />

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
        <StatCard label="Locations" value={client.locations.length} icon={<MapPin className="h-4 w-4" />} />
        <StatCard label="Google Profiles" value={`${connectedGoogle} / ${client.locations.length}`} icon={<CheckCircle2 className="h-4 w-4" />} />
        <StatCard label="Reviews" value={formatNumber(client.reviewsTotal)} icon={<Star className="h-4 w-4" />} />
        <StatCard label="Avg Rating" value={client.ratingAvg.toFixed(1)} />
        <StatCard label="Website Health" value={client.websiteHealth} icon={<Globe className="h-4 w-4" />} />
        <StatCard label="Leads" value={formatNumber(client.leadsTotal)} icon={<Target className="h-4 w-4" />} />
        <StatCard label="Appointments" value={formatNumber(client.appointmentsTotal)} icon={<CalendarCheck2 className="h-4 w-4" />} />
        <StatCard label="Ad Spend" value={formatINR(client.adSpendTotal)} icon={<IndianRupee className="h-4 w-4" />} />
      </div>

      <div className="mb-6">
        <PortfolioHealth scores={client.scores} overall={client.healthOverall} trend={client.healthTrend} />
      </div>

      <Card className="mb-6">
        <div className="grid grid-cols-2 gap-4 px-5 py-4 sm:grid-cols-4">
          <Detail label="Specialty" value={client.specialty} />
          <Detail label="Primary City" value={client.city} />
          <Detail label="Client Since" value={new Date(client.createdAt).toLocaleDateString("en-IN", { month: "short", year: "numeric" })} />
          <Detail label="Account Manager" value={client.accountManager} />
        </div>
      </Card>

      <ClientWorkspaceView client={client} scope={scope} />
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[11.5px] uppercase tracking-wide text-[var(--color-ink-tertiary)]">{label}</div>
      <div className="mt-0.5 text-[13.5px] font-medium text-[var(--color-ink)]">{value}</div>
    </div>
  );
}
