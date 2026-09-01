import Link from "next/link";
import { QrCode, Copy, MessageCircle, Send, Star, ImageIcon, CheckCircle2, XCircle, TrendingUp, Users2, FileBarChart } from "lucide-react";
import type { Client, Location } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { HealthRing, ScoreText, TrendTag, ModuleBar } from "@/components/ui/health";
import { AIDiagnosisCard } from "./AIDiagnosisCard";
import { GoogleAuditCard } from "./GoogleAudit";
import { GoogleBlockers } from "./GoogleBlockers";
import { RankingsTable } from "./RankingsTable";
import { CompetitorComparison } from "./CompetitorComparison";
import { getDiagnosis, getGoogleAudit, getBlockers, getRankings, getCompetitors } from "@/lib/mock/location-detail";
import { PATIENT_FEEDBACK, CONTENT_ITEMS, AD_CAMPAIGNS, LEADS } from "@/lib/mock/operations";
import { getScopedCampaigns, getAdjustedReviewStats } from "@/lib/scope-selectors";
import { getReviewCompletion } from "@/lib/runtime-store";
import { CreateCampaignDialog } from "./CreateCampaignDialog";
import { formatINR, formatNumber } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Overview
// ---------------------------------------------------------------------------

export function OverviewTab({ location }: { location: Location; client: Client }) {
  const { diagnosis, actions } = getDiagnosis(location);

  return (
    <div className="flex flex-col gap-5">
      <Card>
        <CardHeader>
          <CardTitle>Location Growth Score</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-6 sm:flex-row sm:items-center">
          <div className="flex shrink-0 flex-col items-center gap-1">
            <HealthRing score={location.healthOverall} size={100} strokeWidth={9} />
            <span className="text-[12px] text-[var(--color-ink-tertiary)]">Overall</span>
          </div>
          <div className="flex flex-1 flex-col gap-2.5">
            <ModuleBar label="Google" score={location.scores.google} />
            <ModuleBar label="Reputation" score={location.scores.reputation} />
            <ModuleBar label="SEO" score={location.scores.website} />
            <ModuleBar label="Content" score={location.scores.content} />
            <ModuleBar label="Social" score={location.scores.social} />
            <ModuleBar label="Ads" score={location.hasAds ? location.scores.ads : 0} sublabel={location.hasAds ? undefined : "inactive"} />
            <ModuleBar label="Leads" score={location.scores.leads} />
          </div>
        </CardContent>
      </Card>
      <AIDiagnosisCard diagnosis={diagnosis} actions={actions} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Google
// ---------------------------------------------------------------------------

export function GoogleTab({ location }: { location: Location }) {
  const audit = getGoogleAudit(location);
  const blockers = getBlockers(location);
  const rankings = getRankings(location);
  const competitors = getCompetitors(location);

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <MiniStat label="Rating" value={`${location.rating.toFixed(1)} ★`} />
        <MiniStat label="Reviews" value={formatNumber(location.reviewCount)} />
        <MiniStat label="Photos" value={formatNumber(location.photos)} />
        <MiniStat label="Services" value={String(location.services)} />
      </div>
      <GoogleAuditCard overall={audit.overall} breakdown={audit.breakdown} />
      <GoogleBlockers blockers={blockers} />
      <RankingsTable rankings={rankings} />
      <CompetitorComparison competitors={competitors} />
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <Card className="px-4 py-3">
      <div className="text-[11.5px] text-[var(--color-ink-tertiary)]">{label}</div>
      <div className="mt-0.5 text-[17px] font-semibold text-[var(--color-ink)]">{value}</div>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Reviews
// ---------------------------------------------------------------------------

export function ReviewsTab({ location, client }: { location: Location; client: Client }) {
  const campaigns = getScopedCampaigns({ type: "location", clientId: client.id, locationId: location.id });
  const feedback = PATIENT_FEEDBACK.filter((f) => f.locationId === location.id);
  const stats = getAdjustedReviewStats(location);
  const live = getReviewCompletion(location.id);

  return (
    <div className="flex flex-col gap-5">
      <Card>
        <CardHeader className="flex-col items-start gap-0.5">
          <CardTitle>Review links & QR</CardTitle>
          <CardDescription>{location.name} — share these to collect more Google reviews</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-2">
          <Button variant="secondary" size="sm"><Copy className="h-3.5 w-3.5" /> Copy Review Link</Button>
          <Button variant="secondary" size="sm"><QrCode className="h-3.5 w-3.5" /> Download QR</Button>
          <Button variant="secondary" size="sm"><MessageCircle className="h-3.5 w-3.5" /> Send WhatsApp</Button>
          <Button variant="secondary" size="sm"><Send className="h-3.5 w-3.5" /> Send SMS</Button>
        </CardContent>
      </Card>

      {live.count > 0 && (
        <Card className="border-[var(--color-success)] bg-[var(--color-success-soft)] px-5 py-3.5">
          <p className="text-[12.5px] font-medium text-[var(--color-success-strong)]">
            ReviewFlow activity: {live.count} review{live.count !== 1 ? "s" : ""} completed via the patient app — reflected in {stats.reviewCount.toLocaleString("en-IN")} total reviews and {stats.rating.toFixed(1)}★ rating above.
          </p>
        </Card>
      )}

      {campaigns.length > 0 ? campaigns.map((c) => (
        <Card key={c.id}>
          <CardHeader>
            <div>
              <CardTitle>{c.name}</CardTitle>
              <CardDescription>{c.trigger} · {c.channel}</CardDescription>
            </div>
            <Badge variant={c.status === "active" ? "success" : c.status === "draft" ? "neutral" : "warning"} className="capitalize">{c.status}</Badge>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4 sm:grid-cols-5">
            <Metric label="Eligible" value={c.eligiblePatients} />
            <Metric label="Requests sent" value={c.requestsSent} />
            <Metric label="Feedback" value={c.feedbackReceived} />
            <Metric label="Google clicks" value={c.googleClicks} />
            <Metric label="Reviews generated" value={c.reviewsGenerated} highlight />
          </CardContent>
        </Card>
      )) : (
        <Card className="flex flex-col items-center gap-2 py-10 text-center">
          <Star className="h-6 w-6 text-[var(--color-ink-tertiary)]" />
          <p className="text-[13.5px] font-medium text-[var(--color-ink)]">No active review campaign.</p>
          <CreateCampaignDialog scope={{ type: "location", clientId: client.id, locationId: location.id }} trigger={<Button variant="primary" size="sm">Create Review Campaign</Button>} />
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Recent patient feedback</CardTitle>
        </CardHeader>
        <div className="divide-y divide-[var(--color-border)] px-5 pb-3">
          {feedback.length ? feedback.map((f) => (
            <div key={f.id} className="flex gap-3 py-3.5">
              <Avatar name={f.patientInitial} size={30} />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-[13px] font-medium text-[var(--color-ink)]">{f.patientInitial}</span>
                  <span className="flex items-center gap-0.5 text-[12px] text-[var(--color-warning)]">{"★".repeat(f.rating)}{"☆".repeat(5 - f.rating)}</span>
                  <Badge variant={f.status === "shared" ? "success" : f.status === "flagged" ? "critical" : "neutral"} className="ml-auto capitalize">{f.status.replace("-", " ")}</Badge>
                </div>
                <p className="mt-1 text-[13px] text-[var(--color-ink-secondary)]">{f.text}</p>
              </div>
            </div>
          )) : (
            <p className="py-6 text-center text-[13px] text-[var(--color-ink-tertiary)]">No patient feedback yet for {client.name} — {location.name}.</p>
          )}
        </div>
      </Card>
    </div>
  );
}

function Metric({ label, value, highlight }: { label: string; value: number; highlight?: boolean }) {
  return (
    <div>
      <div className="text-[11.5px] text-[var(--color-ink-tertiary)]">{label}</div>
      <div className={`mt-0.5 text-[18px] font-semibold tabular-nums ${highlight ? "text-[var(--color-success-strong)]" : "text-[var(--color-ink)]"}`}>{formatNumber(value)}</div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Content
// ---------------------------------------------------------------------------

const STATUS_VARIANT: Record<string, "success" | "warning" | "critical" | "neutral" | "info"> = {
  published: "success", scheduled: "info", approved: "neutral", pending: "warning", failed: "critical", idea: "neutral", draft: "neutral",
};

export function ContentTab({ location }: { location: Location }) {
  const items = CONTENT_ITEMS.filter((c) => c.locationId === location.id);
  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>Content calendar</CardTitle>
          <CardDescription>Next 14 days for {location.name}</CardDescription>
        </div>
        <Link href="/content/calendar"><Button variant="outline" size="sm">Open full calendar</Button></Link>
      </CardHeader>
      <div className="divide-y divide-[var(--color-border)] px-5 pb-3">
        {items.length ? items.map((item) => (
          <div key={item.id} className="flex items-center gap-3 py-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius-sm)] bg-[var(--color-surface-sunken)]">
              <ImageIcon className="h-4 w-4 text-[var(--color-ink-tertiary)]" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-[13px] font-medium text-[var(--color-ink)]">{item.title}</div>
              <div className="text-[11.5px] text-[var(--color-ink-tertiary)]">{item.type} · {item.channel} · {new Date(item.date).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</div>
            </div>
            <Badge variant={STATUS_VARIANT[item.status]} className="capitalize">{item.status}</Badge>
          </div>
        )) : (
          <p className="py-8 text-center text-[13px] text-[var(--color-ink-tertiary)]">No content scheduled for this location.</p>
        )}
      </div>
      <CardFooter>
        <span className="text-[12px] text-[var(--color-ink-tertiary)]">{items.length} items in queue</span>
        <Button variant="ai" size="sm">Generate 30-Day Calendar</Button>
      </CardFooter>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// SEO (lightweight)
// ---------------------------------------------------------------------------

export function SeoTab({ location }: { location: Location }) {
  const base = location.scores.website;
  const rng = (n: number) => Math.max(20, Math.min(99, base + n));
  return (
    <div className="flex flex-col gap-5">
      <Card>
        <CardHeader><CardTitle>Website Audit</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-2 gap-4 sm:grid-cols-5">
          <ScoreBlock label="Technical SEO" score={rng(12)} />
          <ScoreBlock label="Local SEO" score={rng(-8)} />
          <ScoreBlock label="Content" score={rng(2)} />
          <ScoreBlock label="Conversion" score={rng(-3)} />
          <ScoreBlock label="Overall" score={base} emphasis />
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex-col items-start gap-0.5">
          <CardTitle>SEO Opportunity Engine</CardTitle>
          <CardDescription>Keyword gaps worth targeting for this location</CardDescription>
        </CardHeader>
        <div className="divide-y divide-[var(--color-border)] px-5 pb-3">
          {getRankings(location).slice(0, 3).map((r) => (
            <div key={r.keyword} className="flex items-center justify-between py-3">
              <div>
                <div className="text-[13px] font-medium text-[var(--color-ink)]">&ldquo;{r.keyword}&rdquo;</div>
                <div className="text-[11.5px] text-[var(--color-ink-tertiary)]">
                  {r.position > 15 ? "Not ranking on page 1" : `Currently rank #${r.position}`} · Recommend: dedicated service page
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={r.position > 15 ? "critical" : r.position > 8 ? "warning" : "success"}>{r.position > 15 ? "High priority" : r.position > 8 ? "Medium priority" : "Maintain"}</Badge>
                <Button variant="outline" size="sm">Create Task</Button>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

function ScoreBlock({ label, score, emphasis }: { label: string; score: number; emphasis?: boolean }) {
  return (
    <div className={emphasis ? "rounded-[var(--radius-md)] bg-[var(--color-surface-sunken)] p-3" : ""}>
      <div className="text-[11.5px] text-[var(--color-ink-tertiary)]">{label}</div>
      <ScoreText score={score} className="text-[20px]" />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Social (lightweight)
// ---------------------------------------------------------------------------

const SOCIAL_PLATFORMS = ["Instagram", "Facebook", "YouTube"] as const;

export function SocialTab({ location }: { location: Location }) {
  const items = CONTENT_ITEMS.filter((c) => c.locationId === location.id && c.channel !== "google");
  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {SOCIAL_PLATFORMS.map((p, i) => {
          const connected = location.scores.social > 30 || i === 0;
          return (
            <Card key={p} className="p-4">
              <div className="flex items-center justify-between">
                <span className="text-[13.5px] font-semibold text-[var(--color-ink)]">{p}</span>
                {connected ? <CheckCircle2 className="h-4 w-4 text-[var(--color-success)]" /> : <XCircle className="h-4 w-4 text-[var(--color-critical)]" />}
              </div>
              {connected ? (
                <>
                  <div className="mt-2 text-[20px] font-semibold tabular-nums text-[var(--color-ink)]">{formatNumber(2400 + location.scores.social * 41)}</div>
                  <div className="text-[11.5px] text-[var(--color-ink-tertiary)]">followers</div>
                  <TrendTag value={Math.round((location.scores.social - 50) / 3)} />
                </>
              ) : (
                <div className="mt-3">
                  <Button variant="outline" size="sm">Connect {p}</Button>
                </div>
              )}
            </Card>
          );
        })}
      </div>
      <Card>
        <CardHeader><CardTitle>Content queue</CardTitle></CardHeader>
        <div className="divide-y divide-[var(--color-border)] px-5 pb-3">
          {items.length ? items.slice(0, 6).map((item) => (
            <div key={item.id} className="flex items-center justify-between py-2.5">
              <span className="text-[13px] text-[var(--color-ink)]">{item.title} <span className="text-[var(--color-ink-tertiary)]">· {item.channel}</span></span>
              <Badge variant={STATUS_VARIANT[item.status]} className="capitalize">{item.status}</Badge>
            </div>
          )) : <p className="py-6 text-center text-[13px] text-[var(--color-ink-tertiary)]">No social content queued.</p>}
        </div>
      </Card>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Ads
// ---------------------------------------------------------------------------

export function AdsTab({ location }: { location: Location }) {
  const campaigns = AD_CAMPAIGNS.filter((c) => c.locationId === location.id);
  if (!location.hasAds || campaigns.length === 0) {
    return (
      <Card className="flex flex-col items-center gap-2 py-12 text-center">
        <TrendingUp className="h-6 w-6 text-[var(--color-ink-tertiary)]" />
        <p className="text-[13.5px] font-medium text-[var(--color-ink)]">No active ad campaigns for this location.</p>
        <p className="max-w-sm text-[12.5px] text-[var(--color-ink-tertiary)]">Strong organic performance makes this a good candidate for a Google Ads pilot.</p>
        <Button variant="primary" size="sm">Propose Ad Campaign</Button>
      </Card>
    );
  }
  return (
    <div className="flex flex-col gap-4">
      {campaigns.map((c) => (
        <Card key={c.id}>
          <CardHeader>
            <div>
              <CardTitle>{c.name}</CardTitle>
              <CardDescription className="capitalize">{c.platform} · {c.service} · {c.landingPage}</CardDescription>
            </div>
            <Badge variant={c.status === "active" ? "success" : "warning"} className="capitalize">{c.status}</Badge>
          </CardHeader>
          <CardContent className="grid grid-cols-3 gap-4 sm:grid-cols-6">
            <Metric label="Spend" value={c.spend} />
            <Metric label="Leads" value={c.leads} />
            <Metric label="CPL" value={c.cpl} />
            <Metric label="Appointments" value={c.appointments} highlight />
            <Metric label="CPA" value={c.cpa} />
            <div>
              <div className="text-[11.5px] text-[var(--color-ink-tertiary)]">Conversion</div>
              <div className="mt-0.5 text-[18px] font-semibold text-[var(--color-ink)]">{c.conversionRate}%</div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Leads
// ---------------------------------------------------------------------------

const LEAD_STATUS_VARIANT: Record<string, "success" | "warning" | "critical" | "neutral" | "info"> = {
  new: "info", contacted: "neutral", qualified: "warning", appointment: "success", completed: "success", lost: "critical", reactivation: "neutral",
};

export function LeadsTab({ location }: { location: Location }) {
  const leads = LEADS.filter((l) => l.locationId === location.id);
  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>Leads</CardTitle>
          <CardDescription>{leads.length} leads tracked for {location.name}</CardDescription>
        </div>
        <Users2 className="h-4 w-4 text-[var(--color-ink-tertiary)]" />
      </CardHeader>
      <div className="overflow-x-auto px-5 pb-4 pt-2">
        <table className="w-full min-w-[600px] border-collapse text-left">
          <thead>
            <tr className="border-b border-[var(--color-border)] text-[11px] font-semibold uppercase tracking-wide text-[var(--color-ink-tertiary)]">
              <th className="py-2 pr-3">Name</th>
              <th className="px-3 py-2">Source</th>
              <th className="px-3 py-2">Service</th>
              <th className="px-3 py-2 text-right">Value</th>
              <th className="py-2 pl-3 text-right">Status</th>
            </tr>
          </thead>
          <tbody>
            {leads.length ? leads.map((l) => (
              <tr key={l.id} className="border-b border-[var(--color-border)] last:border-0">
                <td className="py-2.5 pr-3 text-[13px] font-medium text-[var(--color-ink)]">{l.name}</td>
                <td className="px-3 py-2.5 text-[12.5px] text-[var(--color-ink-secondary)]">{l.source}</td>
                <td className="px-3 py-2.5 text-[12.5px] text-[var(--color-ink-secondary)]">{l.service}</td>
                <td className="px-3 py-2.5 text-right text-[12.5px] tabular-nums text-[var(--color-ink-secondary)]">{formatINR(l.value)}</td>
                <td className="py-2.5 pl-3 text-right"><Badge variant={LEAD_STATUS_VARIANT[l.status]} className="capitalize">{l.status}</Badge></td>
              </tr>
            )) : (
              <tr><td colSpan={5} className="py-8 text-center text-[13px] text-[var(--color-ink-tertiary)]">No leads recorded for this location yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Reports (lightweight)
// ---------------------------------------------------------------------------

export function ReportsTab({ location, client }: { location: Location; client: Client }) {
  return (
    <Card className="flex flex-col items-center gap-3 py-12 text-center">
      <FileBarChart className="h-6 w-6 text-[var(--color-ink-tertiary)]" />
      <div>
        <p className="text-[13.5px] font-medium text-[var(--color-ink)]">Generate a report for {client.name} — {location.name}</p>
        <p className="mt-1 max-w-md text-[12.5px] text-[var(--color-ink-tertiary)]">Bundle Google, Reputation, Website, Social, Ads, and Leads performance into a client-ready report.</p>
      </div>
      <Link href="/reports/preview"><Button variant="primary" size="sm">Generate Report</Button></Link>
    </Card>
  );
}
