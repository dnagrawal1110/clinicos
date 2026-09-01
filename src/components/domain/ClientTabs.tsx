import Link from "next/link";
import { ImageIcon, Stethoscope } from "lucide-react";
import type { Client } from "@/lib/types";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { LocationCard } from "./LocationCard";
import { LocationHealthTable } from "./LocationHealthTable";
import { GoogleProfilesTable } from "./GoogleProfilesTable";
import { RankingsTable } from "./RankingsTable";
import { GrowthOpportunities } from "./GrowthOpportunities";
import { ServicePackage } from "./ServicePackage";
import { getDiagnosis, getRankings } from "@/lib/mock/location-detail";
import { getGrowthOpportunities } from "@/lib/mock/upsell";
import { getScopedCampaigns, getScopedContent, getScopedAds, getScopedLeads, getScopedTasks } from "@/lib/scope-selectors";
import type { Scope } from "@/lib/scope-context";
import { formatINR, formatNumber } from "@/lib/utils";

const STATUS_VARIANT: Record<string, "success" | "warning" | "critical" | "neutral" | "info"> = {
  published: "success", scheduled: "info", approved: "neutral", pending: "warning", failed: "critical", idea: "neutral", draft: "neutral",
  active: "success", paused: "warning", completed: "success", lost: "critical", "in-progress": "info", done: "success", blocked: "critical", open: "neutral",
};

// ---------------------------------------------------------------------------
// Overview
// ---------------------------------------------------------------------------

export function ClientOverviewTab({ client }: { client: Client }) {
  const worst = [...client.locations].sort((a, b) => a.healthOverall - b.healthOverall)[0];
  const diag = worst ? getDiagnosis(worst) : null;
  const opportunities = getGrowthOpportunities(client);

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex-col items-start gap-0.5">
            <CardTitle className="flex items-center gap-1.5"><Stethoscope className="h-4 w-4 text-[var(--color-ink-tertiary)]" /> Doctors</CardTitle>
            <CardDescription>{client.doctors.length} doctor{client.doctors.length !== 1 ? "s" : ""} across {client.locations.length} location{client.locations.length !== 1 ? "s" : ""}</CardDescription>
          </CardHeader>
          <div className="flex flex-col gap-2 px-5 pb-5 pt-2">
            {client.doctors.map((d) => (
              <div key={d.id} className="flex items-center gap-2.5 rounded-[var(--radius-sm)] border border-[var(--color-border)] px-3 py-2">
                <Avatar name={d.name} size={28} />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[13px] font-medium text-[var(--color-ink)]">{d.name}</div>
                  <div className="text-[11.5px] text-[var(--color-ink-tertiary)]">{d.specialty}</div>
                </div>
                <span className="text-[11.5px] text-[var(--color-ink-tertiary)]">{d.locationIds.map((id) => client.locations.find((l) => l.id === id)?.name).filter(Boolean).join(", ")}</span>
              </div>
            ))}
          </div>
        </Card>
        <ServicePackage activeServices={client.activeServices} />
      </div>

      {diag && worst && (
        <Card className="overflow-hidden">
          <div className="border-b border-[var(--color-border)] bg-[linear-gradient(120deg,var(--color-ai-soft)_0%,transparent_65%)] px-5 py-4">
            <CardTitle>AI Diagnosis — {worst.name} needs attention most</CardTitle>
          </div>
          <ul className="flex flex-col gap-2 px-5 py-4">
            {diag.diagnosis.map((line, i) => (
              <li key={i} className="flex items-start gap-2 text-[13.5px] text-[var(--color-ink-secondary)]">
                <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-[var(--color-ai)]" />
                {line}
              </li>
            ))}
          </ul>
        </Card>
      )}

      <GrowthOpportunities opportunities={opportunities} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Locations
// ---------------------------------------------------------------------------

export function ClientLocationsTab({ client }: { client: Client }) {
  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {client.locations.map((loc) => (
          <LocationCard key={loc.id} clientId={client.id} location={loc} />
        ))}
      </div>
      <Card>
        <CardHeader><CardTitle>All locations</CardTitle></CardHeader>
        <div className="px-5 pb-5 pt-2">
          <LocationHealthTable clientId={client.id} locations={client.locations} />
        </div>
      </Card>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Google
// ---------------------------------------------------------------------------

export function ClientGoogleTab({ client }: { client: Client }) {
  const worst = [...client.locations].sort((a, b) => a.scores.google - b.scores.google)[0];
  return (
    <div className="flex flex-col gap-5">
      <GoogleProfilesTable rows={client.locations.map((location) => ({ client, location }))} />
      {worst && (
        <Card>
          <CardHeader className="flex-col items-start gap-0.5">
            <CardTitle>Rankings — {worst.name}</CardTitle>
            <CardDescription>Weakest Google performer in this client&rsquo;s portfolio</CardDescription>
          </CardHeader>
          <div className="px-5 pb-5">
            <RankingsTable rankings={getRankings(worst)} />
          </div>
        </Card>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Reputation
// ---------------------------------------------------------------------------

export function ClientReputationTab({ client, scope }: { client: Client; scope: Scope }) {
  const campaigns = getScopedCampaigns(scope);
  return (
    <Card>
      <CardHeader>
        <CardTitle>Review campaigns</CardTitle>
        <span className="text-[12px] text-[var(--color-ink-tertiary)]">{campaigns.length} campaigns</span>
      </CardHeader>
      <div className="flex flex-col gap-3 px-5 pb-5 pt-2">
        {campaigns.length === 0 ? (
          <p className="py-6 text-center text-[13px] text-[var(--color-ink-tertiary)]">No review campaigns for {client.name} yet.</p>
        ) : campaigns.map((c) => (
          <div key={c.id} className="rounded-[var(--radius-md)] border border-[var(--color-border)] p-4">
            <div className="flex items-center justify-between">
              <h4 className="text-[13.5px] font-semibold text-[var(--color-ink)]">{c.name}</h4>
              <Badge variant={STATUS_VARIANT[c.status]} className="capitalize">{c.status}</Badge>
            </div>
            <p className="mt-0.5 text-[12px] text-[var(--color-ink-tertiary)]">{client.locations.find((l) => l.id === c.locationId)?.name} · {c.trigger} · {c.channel}</p>
            <div className="mt-3 grid grid-cols-5 gap-2 text-center text-[13px]">
              <div><div className="font-semibold text-[var(--color-ink)]">{c.eligiblePatients}</div><div className="text-[10.5px] text-[var(--color-ink-tertiary)]">Eligible</div></div>
              <div><div className="font-semibold text-[var(--color-ink)]">{c.requestsSent}</div><div className="text-[10.5px] text-[var(--color-ink-tertiary)]">Sent</div></div>
              <div><div className="font-semibold text-[var(--color-ink)]">{c.feedbackReceived}</div><div className="text-[10.5px] text-[var(--color-ink-tertiary)]">Feedback</div></div>
              <div><div className="font-semibold text-[var(--color-ink)]">{c.googleClicks}</div><div className="text-[10.5px] text-[var(--color-ink-tertiary)]">Clicks</div></div>
              <div><div className="font-semibold text-[var(--color-success-strong)]">{c.reviewsGenerated}</div><div className="text-[10.5px] text-[var(--color-ink-tertiary)]">Reviews</div></div>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Website / Social / Ads / Leads / Tasks / Reports
// ---------------------------------------------------------------------------

export function ClientWebsiteTab({ client }: { client: Client }) {
  return (
    <Card>
      <CardHeader><CardTitle>Website & SEO by location</CardTitle></CardHeader>
      <div className="divide-y divide-[var(--color-border)] px-5 pb-3">
        {client.locations.map((l) => (
          <div key={l.id} className="flex items-center justify-between py-3">
            <div>
              <div className="text-[13px] font-medium text-[var(--color-ink)]">{l.name}</div>
              <div className="text-[11.5px] text-[var(--color-ink-tertiary)]">Website score {l.scores.website}/100</div>
            </div>
            <Link href={`/clients/${client.id}/locations/${l.id}`}><Button variant="ghost" size="sm">Open SEO tab</Button></Link>
          </div>
        ))}
      </div>
    </Card>
  );
}

export function ClientSocialTab({ client, scope }: { client: Client; scope: Scope }) {
  const items = getScopedContent(scope).filter((c) => c.channel !== "google");
  return (
    <Card>
      <CardHeader><CardTitle>Social content queue</CardTitle></CardHeader>
      <div className="divide-y divide-[var(--color-border)] px-5 pb-3">
        {items.length === 0 ? <p className="py-6 text-center text-[13px] text-[var(--color-ink-tertiary)]">No social content scheduled.</p> : items.slice(0, 15).map((item) => (
          <div key={item.id} className="flex items-center gap-3 py-2.5">
            <ImageIcon className="h-4 w-4 shrink-0 text-[var(--color-ink-tertiary)]" />
            <span className="flex-1 text-[13px] text-[var(--color-ink)]">{item.title} <span className="text-[var(--color-ink-tertiary)]">· {client.locations.find((l) => l.id === item.locationId)?.name} · {item.channel}</span></span>
            <Badge variant={STATUS_VARIANT[item.status]} className="capitalize">{item.status}</Badge>
          </div>
        ))}
      </div>
    </Card>
  );
}

export function ClientAdsTab({ client, scope }: { client: Client; scope: Scope }) {
  const campaigns = getScopedAds(scope);
  return (
    <Card>
      <CardHeader>
        <CardTitle>Ad campaigns</CardTitle>
        <span className="text-[12px] text-[var(--color-ink-tertiary)]">{formatINR(campaigns.reduce((a, c) => a + c.spend, 0))} spend this month</span>
      </CardHeader>
      <div className="divide-y divide-[var(--color-border)] px-5 pb-3">
        {campaigns.length === 0 ? <p className="py-6 text-center text-[13px] text-[var(--color-ink-tertiary)]">No active ad campaigns for {client.name}.</p> : campaigns.map((c) => (
          <div key={c.id} className="flex items-center justify-between py-2.5">
            <div>
              <div className="text-[13px] font-medium text-[var(--color-ink)]">{c.name}</div>
              <div className="text-[11.5px] text-[var(--color-ink-tertiary)]">{client.locations.find((l) => l.id === c.locationId)?.name} · {c.platform} · {formatINR(c.spend)}</div>
            </div>
            <Badge variant={c.status === "active" ? "success" : "warning"} className="capitalize">{c.status}</Badge>
          </div>
        ))}
      </div>
    </Card>
  );
}

export function ClientLeadsTab({ scope }: { client: Client; scope: Scope }) {
  const leads = getScopedLeads(scope);
  return (
    <Card>
      <CardHeader>
        <CardTitle>Leads</CardTitle>
        <span className="text-[12px] text-[var(--color-ink-tertiary)]">{formatNumber(leads.length)} tracked</span>
      </CardHeader>
      <div className="divide-y divide-[var(--color-border)] px-5 pb-3">
        {leads.slice(0, 15).map((l) => (
          <div key={l.id} className="flex items-center justify-between py-2.5">
            <span className="text-[13px] text-[var(--color-ink)]">{l.name}</span>
            <Badge variant={STATUS_VARIANT[l.status] ?? "neutral"} className="capitalize">{l.status}</Badge>
          </div>
        ))}
      </div>
    </Card>
  );
}

export function ClientTasksTab({ scope }: { client: Client; scope: Scope }) {
  const tasks = getScopedTasks(scope);
  return (
    <Card>
      <CardHeader>
        <CardTitle>Tasks</CardTitle>
        <span className="text-[12px] text-[var(--color-ink-tertiary)]">{tasks.filter((t) => t.status !== "done").length} open</span>
      </CardHeader>
      <div className="divide-y divide-[var(--color-border)] px-5 pb-3">
        {tasks.length === 0 ? <p className="py-6 text-center text-[13px] text-[var(--color-ink-tertiary)]">No tasks for this client.</p> : tasks.slice(0, 20).map((t) => (
          <div key={t.id} className="flex items-center justify-between gap-3 py-2.5">
            <span className="min-w-0 flex-1 truncate text-[13px] text-[var(--color-ink)]">{t.title}</span>
            <Badge variant={STATUS_VARIANT[t.status] ?? "neutral"} className="shrink-0 capitalize">{t.status.replace("-", " ")}</Badge>
          </div>
        ))}
      </div>
    </Card>
  );
}

export function ClientReportsTab({ client }: { client: Client }) {
  return (
    <Card className="flex flex-col items-center gap-3 py-12 text-center">
      <p className="text-[13.5px] font-medium text-[var(--color-ink)]">Generate a report for {client.name}</p>
      <p className="max-w-md text-[12.5px] text-[var(--color-ink-tertiary)]">Aggregates all {client.locations.length} locations into one client-ready report.</p>
      <Link href="/reports/preview"><Button variant="primary" size="sm">Generate Report</Button></Link>
    </Card>
  );
}
