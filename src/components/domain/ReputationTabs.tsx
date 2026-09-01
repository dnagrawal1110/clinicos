"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Sparkles, Copy, QrCode as QrIcon, MessageCircle, Send, Bot, Check, Pencil, Clock, AlertTriangle, ListChecks } from "lucide-react";
import type { Scope } from "@/lib/scope-context";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { HealthRing, ModuleBar } from "@/components/ui/health";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ReviewFunnel } from "./ReviewFunnel";
import { ReputationOpportunities } from "./ReputationOpportunities";
import { ReviewVelocityChart } from "./ReviewVelocityChart";
import { LocationComparisonTable } from "./LocationComparisonTable";
import { CreateCampaignDialog } from "./CreateCampaignDialog";
import { BulkDeployDialog } from "./BulkDeployDialog";
import { AutomationWorkflow } from "./AutomationWorkflow";
import { QRCodeVisual } from "./QRCodeVisual";
import { WhatsAppPreview, DEFAULT_MESSAGE_TEMPLATE, renderMessageTemplate } from "./WhatsAppPreview";
import {
  getScopedLocations, getScopedCampaigns, getScopedRequests, getScopedGoogleReviews,
  aggregateLocations, getAdjustedReviewStats, getScopedDestinations, getScopedAuditLog,
} from "@/lib/scope-selectors";
import { getClient } from "@/lib/mock/clients";
import { getReputationDiagnosis } from "@/lib/mock/reputation-diagnosis";
import { computeProgramHealth, PROGRAM_HEALTH_LABELS, getProgramForLocation, PROGRAM_STATUS_LABEL } from "@/lib/mock/review-programs";
import { computeThemes, aiSummaryFor, isActionRequired, themeFor } from "@/lib/mock/feedback-insights";
import { generateAIResponseDraft } from "@/lib/mock/google-reviews";
import { AUTOMATION_RULES } from "@/lib/mock/automation";
import { campaignConversionRate } from "@/lib/mock/operations";
import { addCustomTask, logAuditAction, setCampaignStatusOverride, publishReviewResponse } from "@/lib/runtime-store";
import { teamForModule } from "@/lib/mock/pools";
import { useCurrentRole, setCurrentRole, PERMISSION_ROLES } from "@/lib/permissions";
import { track } from "@/lib/analytics";
import { formatNumber } from "@/lib/utils";
import type { ReviewCampaign, GoogleReviewItem, ReviewRequest, ProgramStatus } from "@/lib/types";

const PROGRAM_STATUS_VARIANT: Record<ProgramStatus, "success" | "warning" | "critical" | "neutral" | "info"> = {
  active: "success", paused: "warning", "needs-attention": "warning", disconnected: "critical",
  "setup-required": "neutral", archived: "neutral",
};

const STATUS_VARIANT: Record<string, "success" | "warning" | "critical" | "neutral" | "info"> = {
  active: "success", paused: "warning", draft: "neutral", completed: "info",
};

function clientNameOf(id: string) {
  return getClient(id)?.name ?? id;
}

// Hoisted outside any component so the React Compiler doesn't flag the
// Date.now() call as an impure render-time side effect (same fix pattern
// used for ID generation in CreateCampaignDialog).
function isoDaysFromNow(days: number): string {
  return new Date(Date.now() + days * 86400000).toISOString();
}

function hoursSince(dateIso: string): number {
  return (Date.now() - +new Date(dateIso)) / 3600000;
}

// ---------------------------------------------------------------------------
// Overview
// ---------------------------------------------------------------------------

export function ReputationOverviewTab({ scope }: { scope: Scope }) {
  const locations = getScopedLocations(scope);
  const campaigns = getScopedCampaigns(scope);
  const agg = aggregateLocations(locations);
  const totalRequests = campaigns.reduce((a, c) => a + c.requestsSent, 0);
  const totalOpened = campaigns.reduce((a, c) => a + c.opened, 0);
  const totalFeedback = campaigns.reduce((a, c) => a + c.feedbackReceived, 0);
  const totalClicks = campaigns.reduce((a, c) => a + c.googleClicks, 0);
  const totalReviews = campaigns.reduce((a, c) => a + c.reviewsGenerated, 0);

  const improving = locations.filter((l) => l.reviewDelta30d > 5).length;
  const declining = locations.filter((l) => l.reviewDelta30d < -15).length;
  const needsAttention = locations.filter((l) => l.healthOverall < 55).length;
  const worst = [...locations].sort((a, b) => a.healthOverall - b.healthOverall)[0];
  const diag = worst ? getReputationDiagnosis(worst) : null;

  const programStatusCounts: Record<ProgramStatus, number> = { active: 0, paused: 0, "needs-attention": 0, disconnected: 0, "setup-required": 0, archived: 0 };
  for (const l of locations) {
    const program = getProgramForLocation(l.id);
    if (program) programStatusCounts[program.status] += 1;
  }

  return (
    <div className="flex flex-col gap-5">
      {scope.type === "all" && (
        <Card className="overflow-hidden">
          <div className="border-b border-[var(--color-border)] bg-[linear-gradient(120deg,var(--color-primary-soft)_0%,transparent_70%)] px-5 py-4">
            <CardTitle>Reputation Command Center</CardTitle>
            <CardDescription>Portfolio-wide health at a glance</CardDescription>
          </div>
          <div className="grid grid-cols-2 gap-4 px-5 py-4 sm:grid-cols-4">
            <MiniStat label="Total Locations" value={formatNumber(locations.length)} />
            <MiniStat label="Active Campaigns" value={formatNumber(campaigns.filter((c) => c.status === "active").length)} />
            <MiniStat label="Requests This Month" value={formatNumber(totalRequests)} />
            <MiniStat label="Reviews This Month" value={formatNumber(agg.reviewsThisMonth)} />
            <MiniStat label="Average Rating" value={agg.ratingAvg.toFixed(1)} />
            <MiniStat label="Locations Improving" value={String(improving)} tone="success" />
            <MiniStat label="Locations Declining" value={String(declining)} tone="critical" />
            <MiniStat label="Need Attention" value={String(needsAttention)} tone="warning" />
          </div>
        </Card>
      )}

      {locations.length > 1 && (
        <Card className="p-4">
          <div className="mb-3 text-[12px] font-semibold uppercase tracking-wide text-[var(--color-ink-tertiary)]">Review Program Status — {locations.length} locations</div>
          <div className="flex flex-wrap gap-2">
            {(Object.entries(programStatusCounts) as [ProgramStatus, number][]).filter(([, n]) => n > 0).map(([status, count]) => (
              <Badge key={status} variant={PROGRAM_STATUS_VARIANT[status]}>{PROGRAM_STATUS_LABEL[status]}: {count}</Badge>
            ))}
          </div>
        </Card>
      )}

      <ReviewFunnel
        stages={[
          { label: "Review Requests", value: totalRequests },
          { label: "Feedback Started", value: totalOpened },
          { label: "Feedback Completed", value: totalFeedback },
          { label: "Public Review Clicks", value: totalClicks },
          { label: "Reviews Completed", value: totalReviews },
        ]}
      />

      <ReviewVelocityChart seedKey={scope.type === "all" ? "agency" : scope.type === "client" ? scope.clientId : scope.locationId} dailyBaseline={Math.max(2, Math.round(agg.reviewsThisMonth / 30))} />

      {locations.length > 1 ? (
        <>
          <LocationComparisonTable locations={locations} />
          <ReputationOpportunities locations={locations} />
        </>
      ) : worst ? (
        <Card>
          <CardHeader><CardTitle>Location snapshot</CardTitle></CardHeader>
          <div className="grid grid-cols-2 gap-4 px-5 pb-5 sm:grid-cols-4">
            <MiniStat label="Rating" value={getAdjustedReviewStats(worst).rating.toFixed(1)} />
            <MiniStat label="Total Reviews" value={String(getAdjustedReviewStats(worst).reviewCount)} />
            <MiniStat label="This Month" value={`+${getAdjustedReviewStats(worst).reviewsThisMonth}`} />
            <MiniStat label="Health" value={String(worst.healthOverall)} />
          </div>
        </Card>
      ) : null}

      {scope.type === "location" && worst && (
        <ReputationHealthCard location={worst} />
      )}

      {diag && worst && (
        <Card className="overflow-hidden">
          <div className="flex items-center gap-2 border-b border-[var(--color-border)] bg-[linear-gradient(120deg,var(--color-ai-soft)_0%,transparent_65%)] px-5 py-4">
            <Sparkles className="h-4 w-4 text-[var(--color-ai)]" />
            <CardTitle>Why {worst.name} needs attention</CardTitle>
          </div>
          <div className="px-5 py-4">
            <ol className="flex flex-col gap-2">
              {diag.diagnosis.map((line, i) => (
                <li key={i} className="flex items-start gap-2.5 text-[13.5px] text-[var(--color-ink-secondary)]">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[var(--color-ai-soft)] text-[10.5px] font-semibold text-[var(--color-ai-strong)]">{String(i + 1).padStart(2, "0")}</span>
                  {line}
                </li>
              ))}
            </ol>
            <h4 className="mb-2 mt-4 text-[12px] font-semibold uppercase tracking-wide text-[var(--color-ink-tertiary)]">Recommended actions</h4>
            <div className="flex flex-wrap gap-2">
              {diag.actions.map((a) => <Badge key={a} variant="ai">{a}</Badge>)}
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}

function MiniStat({ label, value, tone }: { label: string; value: string; tone?: "success" | "critical" | "warning" }) {
  const color = tone === "success" ? "var(--color-success-strong)" : tone === "critical" ? "var(--color-critical-strong)" : tone === "warning" ? "var(--color-warning-strong)" : "var(--color-ink)";
  return (
    <div>
      <div className="text-[11.5px] text-[var(--color-ink-tertiary)]">{label}</div>
      <div className="mt-0.5 text-[19px] font-semibold tabular-nums" style={{ color }}>{value}</div>
    </div>
  );
}

function ReputationHealthCard({ location }: { location: ReturnType<typeof getScopedLocations>[number] }) {
  const health = computeProgramHealth(location);
  const program = getProgramForLocation(location.id);
  const breakdown = (Object.entries(health.breakdown) as [keyof typeof health.breakdown, number][])
    .map(([key, score]) => ({ label: PROGRAM_HEALTH_LABELS[key], score }));
  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>Program Health</CardTitle>
          <CardDescription>{program?.name ?? `${location.name} Reputation Program`}</CardDescription>
        </div>
        {program && <Badge variant={PROGRAM_STATUS_VARIANT[program.status]}>{PROGRAM_STATUS_LABEL[program.status]}</Badge>}
      </CardHeader>
      <div className="flex flex-col gap-6 px-5 pb-5 sm:flex-row sm:items-center">
        <div className="flex shrink-0 flex-col items-center gap-1">
          <HealthRing score={health.overall} size={92} strokeWidth={8} label="/ 100" />
        </div>
        <div className="flex flex-1 flex-col gap-2.5">
          {breakdown.map((b) => <ModuleBar key={b.label} label={b.label} score={b.score} />)}
        </div>
      </div>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Campaigns
// ---------------------------------------------------------------------------

export function ReputationCampaignsTab({ scope }: { scope: Scope }) {
  const campaigns = getScopedCampaigns(scope);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  function toggle(id: string) {
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function bulkSetStatus(status: "active" | "paused") {
    for (const id of selected) {
      setCampaignStatusOverride(id, status);
      logAuditAction(status === "paused" ? "campaign.paused" : "campaign.resumed", "campaign", id, `Bulk ${status === "paused" ? "paused" : "resumed"} via Campaigns tab`);
    }
    setSelected(new Set());
  }

  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>Review Campaigns</CardTitle>
          <CardDescription>{campaigns.length} campaigns in scope — one-off outreach initiatives (see Automation for always-on flows)</CardDescription>
        </div>
        <div className="flex items-center gap-2">
          <BulkDeployDialog scope={scope} />
          <CreateCampaignDialog scope={scope} />
        </div>
      </CardHeader>
      {selected.size > 0 && (
        <div className="mx-5 mb-2 flex items-center gap-2 rounded-[var(--radius-sm)] bg-[var(--color-primary-soft)] px-3 py-2">
          <span className="text-[12.5px] font-medium text-[var(--color-primary-strong)]">{selected.size} selected</span>
          <Button variant="outline" size="sm" onClick={() => bulkSetStatus("paused")}>Pause</Button>
          <Button variant="outline" size="sm" onClick={() => bulkSetStatus("active")}>Resume</Button>
          <Button variant="ghost" size="sm" className="ml-auto" onClick={() => setSelected(new Set())}>Clear</Button>
        </div>
      )}
      <div className="flex flex-col gap-3 px-5 pb-5 pt-2">
        {campaigns.length === 0 ? (
          <p className="py-8 text-center text-[13px] text-[var(--color-ink-tertiary)]">No campaigns in this scope yet.</p>
        ) : campaigns.map((c) => {
          const client = getClient(c.clientId);
          const doctor = client?.doctors.find((d) => d.id === c.doctorId);
          const location = client?.locations.find((l) => l.id === c.locationId);
          const alwaysOn = c.name.includes("Always-On") || c.name.includes("Continuous") || c.name.includes("Standing");
          return (
            <div key={c.id} className="flex items-start gap-2 rounded-[var(--radius-md)] border border-[var(--color-border)] p-4 transition-colors hover:border-[var(--color-primary)]">
              <input type="checkbox" checked={selected.has(c.id)} onChange={() => toggle(c.id)} onClick={(e) => e.stopPropagation()} className="mt-1 h-3.5 w-3.5 shrink-0" />
              <Link href={`/reputation/campaigns/${c.id}`} className="min-w-0 flex-1">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-[13.5px] font-semibold text-[var(--color-ink)]">{c.name}</h4>
                    <p className="text-[12px] text-[var(--color-ink-tertiary)]">
                      {client?.name} — {location?.name}{doctor ? ` · ${doctor.name}` : ""} · {c.trigger} · {c.channel}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {alwaysOn && <Badge variant="ai">Always-On</Badge>}
                    <Badge variant={STATUS_VARIANT[c.status]} className="capitalize">{c.status}</Badge>
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2 text-center sm:grid-cols-6">
                  <CampaignMetric label="Eligible" value={c.eligiblePatients} />
                  <CampaignMetric label="Sent" value={c.requestsSent} />
                  <CampaignMetric label="Opened" value={c.opened} />
                  <CampaignMetric label="Feedback" value={c.feedbackReceived} />
                  <CampaignMetric label="Clicks" value={c.googleClicks} />
                  <CampaignMetric label="Reviews" value={c.reviewsGenerated} highlight />
                </div>
              </Link>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

function CampaignMetric({ label, value, highlight }: { label: string; value: number; highlight?: boolean }) {
  return (
    <div>
      <div className={`text-[14px] font-semibold tabular-nums ${highlight ? "text-[var(--color-success-strong)]" : "text-[var(--color-ink)]"}`}>{value}</div>
      <div className="text-[10px] text-[var(--color-ink-tertiary)]">{label}</div>
    </div>
  );
}

export function CampaignDetailView({ campaign }: { campaign: ReviewCampaign }) {
  const client = getClient(campaign.clientId);
  const location = client?.locations.find((l) => l.id === campaign.locationId);
  const doctor = client?.doctors.find((d) => d.id === campaign.doctorId);
  const conversion = campaignConversionRate(campaign);
  const workflowRule = AUTOMATION_RULES[0];
  const message = renderMessageTemplate(DEFAULT_MESSAGE_TEMPLATE, {
    patientName: "Riya", doctorName: doctor?.name ?? client?.name ?? "the doctor",
    clinicName: client?.brand ?? client?.name ?? "the clinic", location: location?.name ?? "",
    reviewLink: `clinicos.link/${location?.slug ?? ""}`,
  });

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
        <CampaignMetric label="Eligible" value={campaign.eligiblePatients} />
        <CampaignMetric label="Sent" value={campaign.requestsSent} />
        <CampaignMetric label="Opened" value={campaign.opened} />
        <CampaignMetric label="Feedback" value={campaign.feedbackReceived} />
        <CampaignMetric label="Clicks" value={campaign.googleClicks} />
        <CampaignMetric label="Reviews" value={campaign.reviewsGenerated} highlight />
        <div>
          <div className="text-[14px] font-semibold tabular-nums text-[var(--color-ink)]">{conversion}%</div>
          <div className="text-[10px] text-[var(--color-ink-tertiary)]">Conversion</div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Automation workflow</CardTitle></CardHeader>
          <div className="px-5 pb-5">
            <AutomationWorkflow steps={workflowRule.steps} />
            <p className="mt-3 text-[11.5px] text-[var(--color-ink-tertiary)]">Max {campaign.maxRequestsPerPatient} request(s) per patient · minimum {campaign.frequencyDays} day(s) between sends</p>
          </div>
        </Card>
        <Card>
          <CardHeader><CardTitle>Message preview</CardTitle></CardHeader>
          <div className="px-5 pb-5">
            <WhatsAppPreview message={message} />
          </div>
        </Card>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Requests
// ---------------------------------------------------------------------------

const STATUS_LABEL: Record<string, string> = {
  created: "Created", queued: "Queued", sent: "Sent", delivered: "Delivered", opened: "Opened", started: "Started",
  "rating-selected": "Rating Selected", "feedback-submitted": "Feedback Submitted", "ai-assisted": "AI Assisted",
  "final-approved": "Final Approved", "public-clicked": "Public Review Clicked", completed: "Completed",
  expired: "Expired", failed: "Failed", "opted-out": "Opted Out", suppressed: "Suppressed",
};

const CRITICAL_STATUSES = new Set(["failed", "opted-out", "expired", "suppressed"]);

function requestStatusVariant(status: string): "success" | "warning" | "critical" | "neutral" | "info" {
  if (CRITICAL_STATUSES.has(status)) return "critical";
  if (status === "completed") return "success";
  return "info";
}

export function ReputationRequestsTab({ scope }: { scope: Scope }) {
  const [query, setQuery] = useState("");
  const [activeRequest, setActiveRequest] = useState<ReviewRequest | null>(null);
  const requests = getScopedRequests(scope);
  const filtered = requests.filter((r) => `${r.patientMasked} ${clientNameOf(r.clientId)} ${r.trigger} ${r.channel} ${r.id}`.toLowerCase().includes(query.toLowerCase()));
  const suppressedCount = requests.filter((r) => r.eligibility === "suppressed").length;

  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>Patient Request Log</CardTitle>
          <CardDescription>{requests.length} requests in scope · {suppressedCount} suppressed · masked identifiers only</CardDescription>
        </div>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search requests..."
          className="h-8 w-56 rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-surface-sunken)] px-2.5 text-[12.5px] outline-none"
        />
      </CardHeader>
      <div className="overflow-x-auto px-5 pb-5 pt-2">
        <table className="w-full min-w-[820px] border-collapse text-left">
          <thead>
            <tr className="border-b border-[var(--color-border)] text-[11px] font-semibold uppercase tracking-wide text-[var(--color-ink-tertiary)]">
              <th className="py-2.5 pr-3">Patient</th>
              <th className="px-3 py-2.5">Location</th>
              <th className="px-3 py-2.5">Date</th>
              <th className="px-3 py-2.5">Trigger</th>
              <th className="px-3 py-2.5">Channel</th>
              <th className="px-3 py-2.5">Status</th>
              <th className="px-3 py-2.5 text-right">Rating</th>
              <th className="py-2.5 pl-3">Public Review</th>
            </tr>
          </thead>
          <tbody>
            {filtered.slice(0, 80).map((r) => {
              const client = getClient(r.clientId);
              const location = client?.locations.find((l) => l.id === r.locationId);
              return (
                <tr key={r.id} onClick={() => setActiveRequest(r)} className="cursor-pointer border-b border-[var(--color-border)] last:border-0 hover:bg-[var(--color-surface-sunken)]">
                  <td className="py-2.5 pr-3 text-[12.5px] font-medium text-[var(--color-ink)]">{r.patientMasked}</td>
                  <td className="px-3 py-2.5 text-[12.5px] text-[var(--color-ink-secondary)]">{client?.name} — {location?.name}</td>
                  <td className="px-3 py-2.5 text-[12px] text-[var(--color-ink-tertiary)]">{new Date(r.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</td>
                  <td className="px-3 py-2.5 text-[12px] text-[var(--color-ink-tertiary)]">{r.trigger}</td>
                  <td className="px-3 py-2.5"><Badge variant="neutral" className="capitalize">{r.channel}</Badge></td>
                  <td className="px-3 py-2.5"><Badge variant={requestStatusVariant(r.status)}>{STATUS_LABEL[r.status]}</Badge></td>
                  <td className="px-3 py-2.5 text-right text-[12.5px] tabular-nums">{r.ratingGiven ? "★".repeat(r.ratingGiven) : "—"}</td>
                  <td className="py-2.5 pl-3">{r.publicReviewClicked ? <Check className="h-4 w-4 text-[var(--color-success)]" /> : <span className="text-[var(--color-ink-tertiary)]">—</span>}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <RequestTimelineDialog request={activeRequest} onClose={() => setActiveRequest(null)} />
    </Card>
  );
}

function RequestTimelineDialog({ request, onClose }: { request: ReviewRequest | null; onClose: () => void }) {
  const client = request ? getClient(request.clientId) : undefined;
  const location = client?.locations.find((l) => l.id === request?.locationId);
  return (
    <Dialog open={!!request} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        {request && (
          <>
            <DialogTitle className="flex items-center gap-2"><Clock className="h-4 w-4 text-[var(--color-ink-tertiary)]" /> Request Timeline</DialogTitle>
            <DialogDescription>{request.patientMasked} · {client?.name} — {location?.name} · {request.id}</DialogDescription>
            {request.eligibility === "suppressed" && request.suppressionReason && (
              <div className="mt-3 flex items-start gap-2 rounded-[var(--radius-sm)] bg-[var(--color-warning-soft)] px-3 py-2.5 text-[12.5px] text-[var(--color-warning-strong)]">
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                Suppressed — {request.suppressionReason.replace(/-/g, " ")}
              </div>
            )}
            <div className="mt-4 flex max-h-[50vh] flex-col overflow-y-auto pl-1">
              {request.timeline.map((event, i) => (
                <div key={i} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${i === request.timeline.length - 1 ? "bg-[var(--color-primary)]" : "bg-[var(--color-border)]"}`} />
                    {i < request.timeline.length - 1 && <span className="w-px flex-1 bg-[var(--color-border)]" />}
                  </div>
                  <div className="pb-4">
                    <div className="text-[11.5px] text-[var(--color-ink-tertiary)]">{new Date(event.at).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })}</div>
                    <div className="text-[13px] font-medium text-[var(--color-ink)]">{event.label}</div>
                    {event.detail && <div className="text-[12px] text-[var(--color-ink-tertiary)]">{event.detail}</div>}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Feedback Inbox
// ---------------------------------------------------------------------------

let feedbackTaskSeq = 0;
function nextFeedbackTaskId(): string {
  feedbackTaskSeq += 1;
  return `ftask-${Date.now()}-${feedbackTaskSeq}`;
}

export function ReputationFeedbackTab({ scope }: { scope: Scope }) {
  const [filter, setFilter] = useState<"all" | "action">("all");
  const [createdFor, setCreatedFor] = useState<Set<string>>(new Set());
  const requests = getScopedRequests(scope).filter((r) => r.feedbackText);
  const filtered = filter === "action" ? requests.filter(isActionRequired) : requests;

  function createTask(r: ReviewRequest) {
    const location = getClient(r.clientId)?.locations.find((l) => l.id === r.locationId);
    const owner = teamForModule("Reputation", r.id);
    const theme = r.feedbackText ? themeFor(r.feedbackText) : "General";
    addCustomTask({
      id: nextFeedbackTaskId(),
      title: `Follow up on ${theme.toLowerCase()} feedback — ${location?.name ?? r.locationId}`,
      clientId: r.clientId,
      locationId: r.locationId,
      doctorId: r.doctorId,
      module: "Reputation",
      priority: r.sentiment === "needs-attention" ? "high" : "medium",
      owner: owner.name,
      ownerTeam: owner.team,
      dueDate: isoDaysFromNow(3),
      status: "open",
      aiRecommended: true,
      source: "ai-audit",
    });
    logAuditAction("task.created", "feedback", r.id, `Task created from ${theme} feedback at ${location?.name}`, { clientId: r.clientId, locationId: r.locationId });
    setCreatedFor((s) => new Set(s).add(r.id));
  }

  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>Feedback Inbox</CardTitle>
          <CardDescription>{requests.length} feedback entries · {requests.filter(isActionRequired).length} need action</CardDescription>
        </div>
        <div className="flex gap-1.5">
          <button onClick={() => setFilter("all")} className={`rounded-full px-3 py-1 text-[12px] font-medium ${filter === "all" ? "bg-[var(--color-primary)] text-white" : "bg-[var(--color-surface-sunken)] text-[var(--color-ink-secondary)]"}`}>All</button>
          <button onClick={() => setFilter("action")} className={`rounded-full px-3 py-1 text-[12px] font-medium ${filter === "action" ? "bg-[var(--color-critical)] text-white" : "bg-[var(--color-surface-sunken)] text-[var(--color-ink-secondary)]"}`}>Needs Action</button>
        </div>
      </CardHeader>
      <div className="divide-y divide-[var(--color-border)] px-5 pb-3">
        {filtered.length === 0 ? (
          <p className="py-8 text-center text-[13px] text-[var(--color-ink-tertiary)]">No feedback to show.</p>
        ) : filtered.slice(0, 40).map((r) => {
          const client = getClient(r.clientId);
          const location = client?.locations.find((l) => l.id === r.locationId);
          const action = isActionRequired(r);
          return (
            <div key={r.id} className="flex gap-3 py-3.5">
              <Avatar name={r.patientMasked} size={30} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="flex items-center gap-0.5 text-[12px] text-[var(--color-warning)]">{"★".repeat(r.ratingGiven ?? 0)}{"☆".repeat(5 - (r.ratingGiven ?? 0))}</span>
                  <span className="text-[11.5px] text-[var(--color-ink-tertiary)]">{client?.name} — {location?.name}</span>
                  <span className="ml-auto text-[11px] text-[var(--color-ink-tertiary)]">{new Date(r.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</span>
                </div>
                <p className="mt-1 text-[13px] text-[var(--color-ink-secondary)]">&ldquo;{r.feedbackText}&rdquo;</p>
                <div className="mt-1.5 flex items-center gap-2">
                  <Badge variant={action ? "critical" : r.sentiment === "positive" ? "success" : "neutral"}>{aiSummaryFor(r)}</Badge>
                  {action && (
                    createdFor.has(r.id) ? (
                      <span className="flex items-center gap-1 text-[12px] font-medium text-[var(--color-success-strong)]"><Check className="h-3.5 w-3.5" /> Task created</span>
                    ) : (
                      <Button variant="outline" size="sm" onClick={() => createTask(r)}><ListChecks className="h-3.5 w-3.5" /> Create Task</Button>
                    )
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// AI Insights / Themes
// ---------------------------------------------------------------------------

export function ReputationInsightsTab({ scope }: { scope: Scope }) {
  const requests = getScopedRequests(scope).filter((r) => r.feedbackText);
  const [activeTheme, setActiveTheme] = useState<string | null>(null);
  const themes = useMemo(() => computeThemes(requests.map((r) => r.feedbackText!)), [requests]);
  const positive = requests.filter((r) => r.sentiment === "positive").map((r) => themeFor(r.feedbackText!));
  const negative = requests.filter((r) => r.sentiment === "needs-attention" || r.sentiment === "negative").map((r) => themeFor(r.feedbackText!));
  const topThemes = (arr: string[]) => [...new Set(arr)].slice(0, 4);
  const filteredForTheme = activeTheme ? requests.filter((r) => themeFor(r.feedbackText!) === activeTheme) : [];

  const THEME_COLORS: Record<string, string> = {
    "Doctor communication": "var(--color-primary)", Staff: "var(--color-ai)", "Waiting time": "var(--color-warning)",
    Clinic: "var(--color-info)", Pricing: "var(--color-critical)", Other: "var(--color-ink-tertiary)",
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Most praised</CardTitle></CardHeader>
          <div className="flex flex-wrap gap-2 px-5 pb-5">
            {topThemes(positive).length ? topThemes(positive).map((t) => <Badge key={t} variant="success">{t}</Badge>) : <p className="text-[13px] text-[var(--color-ink-tertiary)]">Not enough positive feedback yet.</p>}
          </div>
        </Card>
        <Card>
          <CardHeader><CardTitle>Most mentioned issues</CardTitle></CardHeader>
          <div className="flex flex-wrap gap-2 px-5 pb-5">
            {topThemes(negative).length ? topThemes(negative).map((t) => <Badge key={t} variant="critical">{t}</Badge>) : <p className="text-[13px] text-[var(--color-ink-tertiary)]">No significant issues detected.</p>}
          </div>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex-col items-start gap-0.5">
          <CardTitle>What patients are saying</CardTitle>
          <CardDescription>AI-clustered themes across {requests.length} feedback entries — click a theme to see examples</CardDescription>
        </CardHeader>
        <div className="px-5 pb-5">
          <div className="flex h-3 w-full overflow-hidden rounded-full">
            {themes.map((t) => (
              <button key={t.theme} onClick={() => setActiveTheme(t.theme === activeTheme ? null : t.theme)} style={{ width: `${t.percent}%`, background: THEME_COLORS[t.theme] ?? "var(--color-ink-tertiary)" }} title={`${t.theme}: ${t.percent}%`} />
            ))}
          </div>
          <div className="mt-3 flex flex-wrap gap-3">
            {themes.map((t) => (
              <button key={t.theme} onClick={() => setActiveTheme(t.theme === activeTheme ? null : t.theme)} className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[12px] font-medium ${activeTheme === t.theme ? "bg-[var(--color-surface-sunken)]" : ""}`}>
                <span className="h-2 w-2 rounded-full" style={{ background: THEME_COLORS[t.theme] ?? "var(--color-ink-tertiary)" }} />
                {t.theme} — {t.percent}%
              </button>
            ))}
          </div>
          {activeTheme && (
            <div className="mt-4 flex flex-col gap-2 border-t border-[var(--color-border)] pt-4">
              {filteredForTheme.slice(0, 6).map((r) => (
                <div key={r.id} className="rounded-[var(--radius-sm)] bg-[var(--color-surface-sunken)] px-3 py-2 text-[12.5px] text-[var(--color-ink-secondary)]">&ldquo;{r.feedbackText}&rdquo;</div>
              ))}
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Google Reviews + AI Response
// ---------------------------------------------------------------------------

const SLA_HOURS = 48;
type QueueStage = "Escalated" | "Needs Response" | "AI Draft Ready" | "Pending Approval" | "Approved" | "Published";
const QUEUE_VARIANT: Record<QueueStage, "critical" | "warning" | "info" | "success" | "neutral"> = {
  Escalated: "critical", "Needs Response": "warning", "AI Draft Ready": "info", "Pending Approval": "info", Approved: "success", Published: "success",
};

export function ReputationGoogleReviewsTab({ scope }: { scope: Scope }) {
  const reviews = getScopedGoogleReviews(scope);
  const [drafting, setDrafting] = useState<Record<string, string>>({});
  const [approved, setApproved] = useState<Set<string>>(new Set());

  function generate(review: GoogleReviewItem) {
    setDrafting((d) => ({ ...d, [review.id]: generateAIResponseDraft(review) }));
    logAuditAction("review-response.generated", "google-review", review.id, `AI draft generated for ${review.reviewer}'s review`);
  }

  function approve(review: GoogleReviewItem) {
    setApproved((s) => new Set(s).add(review.id));
    logAuditAction("review-response.approved", "google-review", review.id, `Draft response approved for ${review.reviewer}`);
  }

  function publish(review: GoogleReviewItem, text: string) {
    publishReviewResponse(review.id, text);
    logAuditAction("review-response.published", "google-review", review.id, `Response published to ${review.reviewer}'s review`);
    track("review_response_published", { locationId: review.locationId });
  }

  function stageFor(r: GoogleReviewItem): QueueStage {
    if (r.responseStatus === "responded") return "Published";
    const overdue = hoursSince(r.date) > SLA_HOURS;
    if (approved.has(r.id)) return "Approved";
    if (drafting[r.id] ?? r.aiResponseDraft) return "Pending Approval";
    if (overdue && r.sentiment === "negative") return "Escalated";
    return "Needs Response";
  }

  const overdueCount = reviews.filter((r) => r.responseStatus !== "responded" && hoursSince(r.date) > SLA_HOURS).length;

  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>Google Reviews</CardTitle>
          <CardDescription>{reviews.length} reviews in scope · {SLA_HOURS}-hour response SLA</CardDescription>
        </div>
      </CardHeader>
      {overdueCount > 0 && (
        <div className="mx-5 mb-2 flex items-center gap-2 rounded-[var(--radius-sm)] bg-[var(--color-critical-soft)] px-3 py-2 text-[12.5px] font-medium text-[var(--color-critical-strong)]">
          <AlertTriangle className="h-3.5 w-3.5" /> {overdueCount} review{overdueCount !== 1 ? "s" : ""} overdue past the {SLA_HOURS}-hour SLA
        </div>
      )}
      <div className="divide-y divide-[var(--color-border)] px-5 pb-3">
        {reviews.slice(0, 30).map((r) => {
          const client = getClient(r.clientId);
          const location = client?.locations.find((l) => l.id === r.locationId);
          const draft = drafting[r.id] ?? r.aiResponseDraft;
          const stage = stageFor(r);
          return (
            <div key={r.id} className="py-4">
              <div className="flex items-center gap-2">
                <Avatar name={r.reviewer} size={28} />
                <div>
                  <div className="text-[13px] font-medium text-[var(--color-ink)]">{r.reviewer}</div>
                  <div className="text-[11px] text-[var(--color-ink-tertiary)]">{client?.name} — {location?.name} · {new Date(r.date).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</div>
                </div>
                <span className="ml-auto flex items-center gap-0.5 text-[12px] text-[var(--color-warning)]">{"★".repeat(r.rating)}{"☆".repeat(5 - r.rating)}</span>
              </div>
              <p className="mt-2 text-[13px] text-[var(--color-ink-secondary)]">{r.text}</p>
              <div className="mt-2 flex items-center gap-2">
                <Badge variant={QUEUE_VARIANT[stage]}>{stage}</Badge>
                {r.responseStatus !== "responded" && !draft && (
                  <Button variant="outline" size="sm" onClick={() => generate(r)}><Bot className="h-3.5 w-3.5" /> Generate Response</Button>
                )}
              </div>
              {draft && r.responseStatus !== "responded" && (
                <div className="mt-2 rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-ai-soft)]/40 p-3">
                  <div className="mb-1 flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-wide text-[var(--color-ai-strong)]"><Sparkles className="h-3 w-3" /> AI draft response</div>
                  <p className="text-[12.5px] text-[var(--color-ink)]">{draft}</p>
                  <div className="mt-2 flex gap-1.5">
                    <Button variant="ghost" size="sm"><Pencil className="h-3 w-3" /> Edit</Button>
                    {!approved.has(r.id) ? (
                      <Button variant="outline" size="sm" onClick={() => approve(r)}>Approve</Button>
                    ) : (
                      <Button variant="primary" size="sm" onClick={() => publish(r, draft)}>Publish</Button>
                    )}
                  </div>
                </div>
              )}
              {r.publishedResponse && (
                <div className="mt-2 rounded-[var(--radius-sm)] bg-[var(--color-surface-sunken)] p-3 text-[12.5px] text-[var(--color-ink-secondary)]">
                  <span className="font-medium text-[var(--color-ink)]">Response: </span>{r.publishedResponse}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Links & QR
// ---------------------------------------------------------------------------

export function ReputationLinksTab({ scope }: { scope: Scope }) {
  const locations = getScopedLocations(scope);
  const destinations = getScopedDestinations(scope);
  const campaigns = getScopedCampaigns(scope);

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {locations.slice(0, 60).map((loc) => {
          const client = getClient(loc.clientId);
          const url = `clinicos.link/${loc.slug}`;
          const destination = destinations.find((d) => d.locationId === loc.id && d.type === "google");
          return (
            <Card key={loc.id} className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-[13.5px] font-semibold text-[var(--color-ink)]">{client?.name}</h4>
                  <p className="text-[11.5px] text-[var(--color-ink-tertiary)]">{loc.name}</p>
                </div>
                <Badge variant={loc.status === "paused" ? "warning" : "success"}>{loc.status === "paused" ? "Paused" : "Active"}</Badge>
              </div>
              <div className="mt-3 flex items-center gap-3">
                <QRCodeVisual value={url} size={72} />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[11.5px] text-[var(--color-ink-secondary)]">{url}</div>
                  <div className="mt-0.5 text-[11px] text-[var(--color-ink-tertiary)]">
                    Google destination: <span className={destination?.status === "connected" ? "text-[var(--color-success-strong)]" : "text-[var(--color-critical-strong)]"}>{destination ? destination.status : "Not configured"}</span>
                  </div>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-1.5">
                <Button variant="outline" size="sm" onClick={() => logAuditAction("qr.generated", "location", loc.id, `QR regenerated for ${loc.name}`, { clientId: loc.clientId, locationId: loc.id })}><Copy className="h-3.5 w-3.5" /> Copy Link</Button>
                <Button variant="outline" size="sm"><QrIcon className="h-3.5 w-3.5" /> Download QR</Button>
                <Button variant="outline" size="sm"><MessageCircle className="h-3.5 w-3.5" /> WhatsApp</Button>
                <Button variant="ghost" size="sm"><Send className="h-3.5 w-3.5" /> SMS</Button>
              </div>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader><CardTitle>Link Analytics</CardTitle><CardDescription>Performance per ReviewFlow link</CardDescription></CardHeader>
        <div className="overflow-x-auto px-5 pb-5 pt-2">
          <table className="w-full min-w-[760px] border-collapse text-left">
            <thead>
              <tr className="border-b border-[var(--color-border)] text-[11px] font-semibold uppercase tracking-wide text-[var(--color-ink-tertiary)]">
                <th className="py-2.5 pr-3">Location</th>
                <th className="px-3 py-2.5 text-right">Clicks</th>
                <th className="px-3 py-2.5 text-right">Feedback</th>
                <th className="px-3 py-2.5 text-right">Google Clicks</th>
                <th className="px-3 py-2.5 text-right">Completed Reviews</th>
                <th className="px-3 py-2.5 text-right">Conversion</th>
              </tr>
            </thead>
            <tbody>
              {locations.slice(0, 60).map((loc) => {
                const client = getClient(loc.clientId);
                const locCampaigns = campaigns.filter((c) => c.locationId === loc.id);
                const sent = locCampaigns.reduce((a, c) => a + c.requestsSent, 0);
                const feedback = locCampaigns.reduce((a, c) => a + c.feedbackReceived, 0);
                const clicks = locCampaigns.reduce((a, c) => a + c.googleClicks, 0);
                const reviews = locCampaigns.reduce((a, c) => a + c.reviewsGenerated, 0);
                const conversion = sent ? Math.round((reviews / sent) * 1000) / 10 : 0;
                return (
                  <tr key={loc.id} className="border-b border-[var(--color-border)] last:border-0 hover:bg-[var(--color-surface-sunken)]">
                    <td className="py-2.5 pr-3 text-[12.5px] font-medium text-[var(--color-ink)]">{client?.name} — {loc.name}</td>
                    <td className="px-3 py-2.5 text-right text-[12.5px] tabular-nums">{formatNumber(sent)}</td>
                    <td className="px-3 py-2.5 text-right text-[12.5px] tabular-nums">{formatNumber(feedback)}</td>
                    <td className="px-3 py-2.5 text-right text-[12.5px] tabular-nums">{formatNumber(clicks)}</td>
                    <td className="px-3 py-2.5 text-right text-[12.5px] tabular-nums text-[var(--color-success-strong)]">{formatNumber(reviews)}</td>
                    <td className="px-3 py-2.5 text-right text-[12.5px] tabular-nums">{conversion}%</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Automation
// ---------------------------------------------------------------------------

export function ReputationAutomationTab() {
  const [expanded, setExpanded] = useState<string | null>(AUTOMATION_RULES[0]?.id ?? null);
  return (
    <div className="flex flex-col gap-3">
      <Card className="p-4 text-[12.5px] text-[var(--color-ink-secondary)]">
        <span className="font-semibold text-[var(--color-ink)]">Automation vs. Campaigns:</span> a Campaign is a specific outreach initiative you launch and can end (e.g. &ldquo;September Consultation Campaign&rdquo;). Automation is always-on — it keeps running in the background reacting to events like &ldquo;appointment completed&rdquo; without anyone re-launching it.
      </Card>
      {AUTOMATION_RULES.map((rule) => (
        <Card key={rule.id} className="overflow-hidden">
          <button onClick={() => setExpanded(expanded === rule.id ? null : rule.id)} className="flex w-full items-center justify-between px-5 py-4 text-left">
            <div>
              <h4 className="text-[13.5px] font-semibold text-[var(--color-ink)]">{rule.name}</h4>
              <p className="text-[12px] text-[var(--color-ink-tertiary)]">{rule.trigger} → {rule.action}</p>
            </div>
            <Badge variant={rule.enabled ? "success" : "neutral"}>{rule.enabled ? "Enabled" : "Disabled"}</Badge>
          </button>
          {expanded === rule.id && (
            <div className="border-t border-[var(--color-border)] px-5 py-4">
              <AutomationWorkflow steps={rule.steps} />
              {(rule.waitHours !== undefined || rule.quietHoursStart) && (
                <div className="mt-4 flex flex-wrap gap-1.5 border-t border-[var(--color-border)] pt-4">
                  {rule.waitHours !== undefined && <Badge variant="neutral">Wait {rule.waitHours}h before send</Badge>}
                  {rule.channel && <Badge variant="neutral" className="capitalize">Channel: {rule.channel}</Badge>}
                  {rule.reminderAfterHours !== undefined && <Badge variant="neutral">Reminder after {rule.reminderAfterHours}h</Badge>}
                  {rule.maxAttempts !== undefined && <Badge variant="neutral">Max {rule.maxAttempts} attempts</Badge>}
                  {rule.frequencyCapDays !== undefined && <Badge variant="neutral">1 request / {rule.frequencyCapDays} days</Badge>}
                  {rule.quietHoursStart && <Badge variant="neutral">Quiet hours {rule.quietHoursStart}–{rule.quietHoursEnd} ({rule.timezone})</Badge>}
                </div>
              )}
              {rule.conditions && (
                <div className="mt-3">
                  <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-[var(--color-ink-tertiary)]">Eligibility checks before send</div>
                  <div className="flex flex-wrap gap-1.5">
                    {rule.conditions.map((c) => <span key={c} className="rounded-full bg-[var(--color-surface-sunken)] px-2.5 py-1 text-[11.5px] text-[var(--color-ink-secondary)]">{c.replace(/-/g, " ")}</span>)}
                  </div>
                </div>
              )}
            </div>
          )}
        </Card>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Settings
// ---------------------------------------------------------------------------

export function ReputationSettingsTab({ scope }: { scope: Scope }) {
  const client = scope.type !== "all" ? getClient(scope.clientId) : undefined;
  const destinations = getScopedDestinations(scope);
  const disconnected = destinations.filter((d) => d.status !== "connected");
  const auditLog = getScopedAuditLog(scope);
  const role = useCurrentRole();

  return (
    <div className="flex flex-col gap-5">
      <Card>
        <CardHeader><CardTitle>Reputation settings</CardTitle></CardHeader>
        <div className="flex flex-col gap-4 px-5 pb-5">
          <SettingRow label="Default public destination" value="Google" />
          <SettingRow label="Default language" value="English" />
          <SettingRow label="Max requests per patient" value="2" />
          <SettingRow label="Reminder delay" value="24 hours" />
          <SettingRow label="Client" value={client?.name ?? "All clients"} />
          <p className="text-[11.5px] text-[var(--color-ink-tertiary)]">
            White-label branding (logo, accent color, welcome text) is configured per client in Settings → Brand and applied automatically to that client&rsquo;s ReviewFlow links.
          </p>
        </div>
      </Card>

      <Card>
        <CardHeader>
          <div>
            <CardTitle>Review Destinations</CardTitle>
            <CardDescription>{destinations.length} destinations · {disconnected.length} need attention</CardDescription>
          </div>
        </CardHeader>
        <div className="flex flex-col divide-y divide-[var(--color-border)] px-5 pb-3">
          {destinations.slice(0, 40).map((d) => {
            const locClient = getClient(d.clientId);
            const location = locClient?.locations.find((l) => l.id === d.locationId);
            return (
              <div key={d.id} className="flex items-center gap-3 py-2.5">
                <div className="min-w-0 flex-1">
                  <div className="text-[12.5px] font-medium text-[var(--color-ink)]">{locClient?.name} — {location?.name} <span className="text-[var(--color-ink-tertiary)]">({d.name})</span></div>
                </div>
                <Badge variant={d.status === "connected" ? "success" : d.status === "not-configured" ? "neutral" : "critical"} className="capitalize">{d.status.replace(/-/g, " ")}</Badge>
              </div>
            );
          })}
        </div>
      </Card>

      <Card className="p-4">
        <div className="mb-2 text-[12px] font-semibold uppercase tracking-wide text-[var(--color-ink-tertiary)]">Role (session demo)</div>
        <div className="flex flex-wrap gap-1.5">
          {PERMISSION_ROLES.map((r) => (
            <button key={r} onClick={() => setCurrentRole(r)} className={`rounded-full border px-3 py-1.5 text-[12.5px] font-medium ${role === r ? "border-[var(--color-primary)] bg-[var(--color-primary-soft)] text-[var(--color-primary-strong)]" : "border-[var(--color-border)] text-[var(--color-ink-secondary)]"}`}>{r}</button>
          ))}
        </div>
        <p className="mt-2 text-[11.5px] text-[var(--color-ink-tertiary)]">Role-based permissions are architected but session-local for this demo — no real auth backend yet.</p>
      </Card>

      <Card>
        <CardHeader><CardTitle>Audit Log</CardTitle><CardDescription>Recent reputation-module actions</CardDescription></CardHeader>
        <div className="flex flex-col divide-y divide-[var(--color-border)] px-5 pb-3">
          {auditLog.length === 0 ? (
            <p className="py-6 text-center text-[13px] text-[var(--color-ink-tertiary)]">No actions recorded yet this session.</p>
          ) : auditLog.slice(0, 20).map((a) => (
            <div key={a.id} className="py-2.5 text-[12.5px] text-[var(--color-ink-secondary)]">
              <span className="font-medium text-[var(--color-ink)]">{a.actor}</span> — {a.detail}
              <span className="ml-2 text-[11px] text-[var(--color-ink-tertiary)]">{new Date(a.at).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" })}</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

function SettingRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-3 last:border-0 last:pb-0">
      <span className="text-[13px] text-[var(--color-ink-secondary)]">{label}</span>
      <span className="text-[13px] font-medium text-[var(--color-ink)]">{value}</span>
    </div>
  );
}
