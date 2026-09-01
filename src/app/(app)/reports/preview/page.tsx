"use client";

import { Download, Send, TrendingUp, TrendingDown } from "lucide-react";
import { PageHeader } from "@/components/shell/PageHeader";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useScope } from "@/lib/scope-context";
import { useRuntimeStore } from "@/lib/runtime-store";
import { getScopedLocations, aggregateLocations, getScopedCampaigns, getScopedContent, getScopedRequests } from "@/lib/scope-selectors";
import { getDiagnosis } from "@/lib/mock/location-detail";
import { themeFor } from "@/lib/mock/feedback-insights";
import { formatINR, formatNumber } from "@/lib/utils";

export default function ReportPreviewPage() {
  useRuntimeStore();
  const { scope, scopeMeta } = useScope();
  const locations = getScopedLocations(scope);
  const agg = aggregateLocations(locations);
  const campaigns = getScopedCampaigns(scope);
  const content = getScopedContent(scope);
  const reviewsGenerated = campaigns.reduce((a, c) => a + c.reviewsGenerated, 0);
  const publishedContent = content.filter((c) => c.status === "published" || c.status === "scheduled").length;
  const worst = [...locations].sort((a, b) => a.healthOverall - b.healthOverall)[0];
  const best = [...locations].sort((a, b) => b.healthOverall - a.healthOverall)[0];
  const diag = worst ? getDiagnosis(worst) : null;

  const reportTitle =
    scope.type === "all" ? "MixMedia Portfolio" : scope.type === "client" ? scopeMeta.client!.name : `${scopeMeta.client!.name} — ${scopeMeta.location!.name}`;
  const accountManager = scope.type === "all" ? "MixMedia Leadership" : scopeMeta.client?.accountManager ?? "MixMedia";
  const adSpend = scope.type === "all" ? locations.reduce((a, l) => a + l.adSpendThisMonth, 0) : agg.adSpendTotal;

  const summary = [
    { label: "Google visibility", value: `↑ ${Math.max(4, Math.round(agg.scores.google / 6))}%`, positive: true },
    { label: "Reviews", value: `+${formatNumber(agg.reviewsThisMonth)}`, positive: true },
    { label: "Average rating", value: agg.ratingAvg.toFixed(1), positive: true },
    { label: "Website traffic", value: `↑ ${Math.max(3, Math.round(agg.scores.website / 5))}%`, positive: true },
    { label: "Leads", value: formatNumber(agg.leadsTotal), positive: true },
    { label: "Ad CPA", value: `↓ ${Math.max(3, Math.round(agg.scores.ads / 8))}%`, positive: true },
  ];

  const accomplished = [
    `Generated ${reviewsGenerated || Math.round(agg.reviewsThisMonth * 0.6)} new Google reviews through active review campaigns.`,
    `Published or scheduled ${publishedContent} pieces of content across Google and social channels.`,
    best && locations.length > 1 ? `${best.name} continues to lead the portfolio with a health score of ${best.healthOverall}/100.` : "Maintained consistent service delivery across the review period.",
    `Improved local rankings across tracked keywords in the last 60 days.`,
  ];

  const changed = worst ? [
    `${worst.name} review velocity moved ${worst.reviewDelta30d >= 0 ? "up" : "down"} ${Math.abs(worst.reviewDelta30d)}% this period.`,
    locations.length > 1 ? "Ad spend allocation shifted toward the strongest-performing locations." : "Ad spend held steady month over month.",
  ] : ["No significant changes to report this period."];

  const attention = diag ? diag.diagnosis.slice(0, 2) : ["All tracked locations are performing within expected ranges."];
  const priorities = diag ? diag.actions.slice(0, 4).map((a) => a.label) : ["Continue current growth initiatives."];

  const requestsWithFeedback = getScopedRequests(scope).filter((r) => r.feedbackText);
  const positiveThemes = [...new Set(requestsWithFeedback.filter((r) => r.sentiment === "positive").map((r) => themeFor(r.feedbackText!)))].slice(0, 3);
  const improvementThemes = [...new Set(requestsWithFeedback.filter((r) => r.sentiment === "negative" || r.sentiment === "needs-attention").map((r) => themeFor(r.feedbackText!)))].slice(0, 3);
  const positiveShare = requestsWithFeedback.length ? Math.round((requestsWithFeedback.filter((r) => r.sentiment === "positive").length / requestsWithFeedback.length) * 100) : 0;

  return (
    <div className="animate-fade-in">
      <PageHeader
        breadcrumb={scope.type !== "all" ? scopeMeta.crumbs.concat({ label: "Report Preview" }) : undefined}
        title="Report Preview"
        subtitle="Client-facing — designed to be understood in under 3 minutes."
        actions={
          <>
            <Button variant="outline" size="md"><Download className="h-3.5 w-3.5" /> Download PDF</Button>
            <Button variant="primary" size="md"><Send className="h-3.5 w-3.5" /> Send to Client</Button>
          </>
        }
      />

      <Card className="mx-auto max-w-[760px] overflow-hidden !rounded-[20px] !shadow-[var(--shadow-md)]">
        <div className="bg-[var(--color-primary)] px-10 py-10 text-white">
          <span className="text-[12px] font-medium uppercase tracking-wider text-white/70">MixMedia Growth Report</span>
          <h1 className="mt-2 text-[26px] font-semibold tracking-tight">Monthly Clinic Growth Report</h1>
          <p className="mt-1 text-[15px] text-white/85">{reportTitle}</p>
          <p className="text-[13px] text-white/60">September 2026 · {locations.length} Location{locations.length !== 1 ? "s" : ""}</p>
        </div>

        <div className="px-10 py-8">
          <h2 className="text-[13px] font-semibold uppercase tracking-wide text-[var(--color-ink-tertiary)]">Growth Summary</h2>
          <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3">
            {summary.map((s) => (
              <div key={s.label} className="rounded-[var(--radius-md)] bg-[var(--color-surface-sunken)] p-4">
                <div className="flex items-center gap-1.5 text-[19px] font-semibold text-[var(--color-success-strong)]">
                  {s.positive ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                  {s.value}
                </div>
                <div className="mt-0.5 text-[12px] text-[var(--color-ink-tertiary)]">{s.label}</div>
              </div>
            ))}
          </div>

          {requestsWithFeedback.length > 0 && (
            <div className="mt-8">
              <h3 className="text-[14px] font-semibold text-[var(--color-ink)]">Patient sentiment</h3>
              <div className="mt-2.5 flex items-center gap-3">
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-[var(--color-critical-soft)]">
                  <div className="h-full rounded-full bg-[var(--color-success)]" style={{ width: `${positiveShare}%` }} />
                </div>
                <span className="text-[12.5px] font-medium text-[var(--color-ink-secondary)]">{positiveShare}% positive</span>
              </div>
              <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-wide text-[var(--color-ink-tertiary)]">Top positive themes</div>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {positiveThemes.length ? positiveThemes.map((t) => <span key={t} className="rounded-full bg-[var(--color-success-soft)] px-2.5 py-1 text-[12px] font-medium text-[var(--color-success-strong)]">{t}</span>) : <span className="text-[12.5px] text-[var(--color-ink-tertiary)]">Not enough data yet</span>}
                  </div>
                </div>
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-wide text-[var(--color-ink-tertiary)]">Areas for improvement</div>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {improvementThemes.length ? improvementThemes.map((t) => <span key={t} className="rounded-full bg-[var(--color-warning-soft)] px-2.5 py-1 text-[12px] font-medium text-[var(--color-warning-strong)]">{t}</span>) : <span className="text-[12.5px] text-[var(--color-ink-tertiary)]">No significant issues</span>}
                  </div>
                </div>
              </div>
            </div>
          )}

          <ReportSection title="What we accomplished" items={accomplished} tone="success" />
          <ReportSection title="What changed" items={changed} tone="info" />
          <ReportSection title="What needs attention" items={attention} tone="warning" />
          <ReportSection title="Next month's priorities" items={priorities} tone="ai" />

          <div className="mt-10 border-t border-[var(--color-border)] pt-6 text-center">
            <p className="text-[12.5px] text-[var(--color-ink-tertiary)]">Prepared by MixMedia · Account Manager {accountManager}</p>
            <p className="mt-0.5 text-[11.5px] text-[var(--color-ink-tertiary)]">Total ad investment this month: {formatINR(adSpend)}</p>
          </div>
        </div>
      </Card>
    </div>
  );
}

function ReportSection({ title, items, tone }: { title: string; items: string[]; tone: "success" | "info" | "warning" | "ai" }) {
  const dot: Record<string, string> = {
    success: "bg-[var(--color-success)]", info: "bg-[var(--color-info)]", warning: "bg-[var(--color-warning)]", ai: "bg-[var(--color-ai)]",
  };
  return (
    <div className="mt-8">
      <h3 className="text-[14px] font-semibold text-[var(--color-ink)]">{title}</h3>
      <ul className="mt-2.5 flex flex-col gap-2">
        {items.map((item, i) => (
          <li key={i} className="flex items-start gap-2.5 text-[13.5px] leading-relaxed text-[var(--color-ink-secondary)]">
            <span className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${dot[tone]}`} />
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}
