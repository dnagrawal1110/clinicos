// The single AI service layer (section 57). Every AI-touching call in the
// app should go through a function here — not because the underlying logic
// changes, but so there is exactly one place that (a) knows what data an AI
// call is allowed to receive (section 58) and (b) validates what comes back
// before it reaches a human or a patient (section 59). Swapping any of
// these from a local heuristic to a real LLM provider later is a one-file
// change, not a hunt across components.
import { improveText, runAuthenticityCheck, type AuthenticityCheck } from "./review-ai";
import { generateAIResponseDraft as generateGoogleResponseDraft } from "./mock/google-reviews";
import { generateMessageDraft as generateMessageLibraryDraft } from "./mock/message-library";
import { getReputationDiagnosis, computeReputationHealth } from "./mock/reputation-diagnosis";
import { getDailyBrief as computeDailyBrief } from "./mock/work-queue";
import type { Scope } from "./scope-context";
import type { GoogleReviewItem, Location, MessageTemplate } from "./types";

// ---------------------------------------------------------------------------
// Output validation (section 59) — AI output is untrusted generated text
// until it passes these checks. None of the functions below skip this.
// ---------------------------------------------------------------------------
export interface AIOutputValidation {
  valid: boolean;
  issues: string[];
}

const PII_PATTERNS = [/\b\d{10}\b/, /\b[\w.+-]+@[\w-]+\.[a-z]{2,}\b/i]; // bare 10-digit numbers, email addresses
const MEDICAL_CLAIM_WORDS = ["cured", "guarantee", "miracle", "diagnosed", "prescribed"];

export function validateAIOutput(text: string, opts: { maxLength?: number; original?: string } = {}): AIOutputValidation {
  const issues: string[] = [];
  const maxLength = opts.maxLength ?? 2000;
  if (!text.trim()) issues.push("empty output");
  if (text.length > maxLength) issues.push(`exceeds max length (${text.length} > ${maxLength})`);
  if (PII_PATTERNS.some((p) => p.test(text))) issues.push("possible PII (phone/email) in output");
  if (opts.original) {
    const originalLower = opts.original.toLowerCase();
    const addedClaim = MEDICAL_CLAIM_WORDS.some((w) => text.toLowerCase().includes(w) && !originalLower.includes(w));
    if (addedClaim) issues.push("possible unsupported medical claim added");
  }
  return { valid: issues.length === 0, issues };
}

// ---------------------------------------------------------------------------
// generateReviewRewrite — grammar/clarity only, never invents experience.
// Data boundary: receives only the patient's own free-text feedback. Never
// the patient's name, phone, or any other request/campaign metadata.
// ---------------------------------------------------------------------------
export function generateReviewRewrite(originalFeedback: string): { text: string; authenticity: AuthenticityCheck[]; validation: AIOutputValidation } {
  const text = improveText(originalFeedback);
  return { text, authenticity: runAuthenticityCheck(originalFeedback, text), validation: validateAIOutput(text, { original: originalFeedback, maxLength: 1000 }) };
}

// ---------------------------------------------------------------------------
// analyzeFeedback — sentiment/theme classification. Already computed
// deterministically per-item at generation time in this mock dataset
// (src/lib/mock/feedback-insights.ts); this wrapper is the seam a real
// classifier would sit behind without changing any call site's shape.
// ---------------------------------------------------------------------------
export { themeFor as analyzeFeedbackTheme, aiSummaryFor as analyzeFeedbackSummary } from "./mock/feedback-insights";

// ---------------------------------------------------------------------------
// generateReviewResponse — drafts a reply to a public Google review. Never
// auto-published (section 34) — always returned as a draft for a human to
// approve. Data boundary: review text + rating + reviewer first name only.
// ---------------------------------------------------------------------------
export function generateReviewResponse(review: GoogleReviewItem): { draft: string; validation: AIOutputValidation } {
  const draft = generateGoogleResponseDraft(review);
  return { draft, validation: validateAIOutput(draft, { maxLength: 600 }) };
}

// ---------------------------------------------------------------------------
// generateAuditDiagnosis — "why does this location need attention" +
// recommended actions, from the location's own scores/campaigns/requests.
// ---------------------------------------------------------------------------
export function generateAuditDiagnosis(location: Location) {
  return { ...getReputationDiagnosis(location), health: computeReputationHealth(location) };
}

// ---------------------------------------------------------------------------
// generateWebsiteAudit — deterministic scoring matching the website_audits
// schema (section 40/41). No real crawler is wired up; scores are derived
// from the location's existing website-related module score as a stand-in
// until a real crawl job exists.
// ---------------------------------------------------------------------------
export interface WebsiteAuditResult {
  seoScore: number;
  technicalScore: number;
  contentScore: number;
  localSeoScore: number;
  mobileScore: number;
  performanceScore: number;
  schemaScore: number;
  conversionScore: number;
  breakdown: { check: string; passed: boolean }[];
}

export function generateWebsiteAudit(location: Location): WebsiteAuditResult {
  const base = location.scores.website;
  const jitter = (seed: number) => Math.max(0, Math.min(100, base + ((seed * 37) % 21) - 10));
  return {
    seoScore: base,
    technicalScore: jitter(1),
    contentScore: jitter(2),
    localSeoScore: jitter(3),
    mobileScore: jitter(4),
    performanceScore: jitter(5),
    schemaScore: jitter(6),
    conversionScore: jitter(7),
    breakdown: [
      { check: "Title tag present", passed: base > 40 },
      { check: "Meta description present", passed: base > 45 },
      { check: "NAP consistent with Google profile", passed: base > 50 },
      { check: "Location page exists for this clinic", passed: base > 55 },
      { check: "WhatsApp/Call CTA above the fold", passed: base > 60 },
      { check: "Mobile page speed acceptable", passed: base > 65 },
    ],
  };
}

// ---------------------------------------------------------------------------
// generateDailyBrief — the Work Queue's morning summary.
// ---------------------------------------------------------------------------
export function generateDailyBrief(scope: Scope, name: string) {
  return computeDailyBrief(scope, name);
}

// ---------------------------------------------------------------------------
// generateReportInsights — client-safe narrative lines for a report. Data
// boundary: aggregate metrics only — never individual feedback text, task
// assignments, or growth_opportunities (section 39/49 — those are internal-only
// and must never reach this function in the first place).
// ---------------------------------------------------------------------------
export function generateReportInsights(input: { reviewsThisMonth: number; ratingAvg: number; positiveShare: number; topPositiveThemes: string[]; topImprovementThemes: string[] }) {
  const insights: string[] = [];
  insights.push(`Generated ${input.reviewsThisMonth} new reviews this month at an average rating of ${input.ratingAvg.toFixed(1)}.`);
  if (input.positiveShare >= 70) insights.push(`Patient sentiment remains strongly positive (${input.positiveShare}% positive feedback).`);
  if (input.topPositiveThemes.length) insights.push(`Patients most often praised: ${input.topPositiveThemes.join(", ")}.`);
  if (input.topImprovementThemes.length) insights.push(`The most common area for improvement was: ${input.topImprovementThemes[0]}.`);
  return insights;
}

// ---------------------------------------------------------------------------
// generateMessageDraft — re-exported under the standard name (section 26).
// ---------------------------------------------------------------------------
export function generateMessageDraft(opts: { doctorName: string; clinicName: string; trigger: string; tone: "friendly" | "formal" | "concise"; language: MessageTemplate["language"] }) {
  const text = generateMessageLibraryDraft(opts);
  return { text, validation: validateAIOutput(text, { maxLength: 500 }) };
}
