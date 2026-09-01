import type { ReviewRequest, RequestStatus, FeedbackSentiment, RequestTimelineEvent, EligibilityReason } from "../types";
import { rngFor, pick, randInt } from "./rng";
import { REVIEW_CAMPAIGNS } from "./operations";
import { getLocation } from "./clients";
import { SUPPRESSION_REASONS, eligibilityReasonLabel } from "../eligibility";

const CHANNEL_MAP: Record<string, ReviewRequest["channel"]> = {
  WhatsApp: "whatsapp", SMS: "sms", "SMS + WhatsApp": "whatsapp", Email: "sms", QR: "qr", Link: "link",
};

const CHANNEL_SENT_LABEL: Record<ReviewRequest["channel"], string> = {
  whatsapp: "WhatsApp message sent", sms: "SMS sent", qr: "QR code scanned", link: "Link opened",
};

const POSITIVE_SNIPPETS = [
  "Doctor explained everything clearly and the staff was helpful throughout.",
  "Very clean clinic and the consultation felt unhurried.",
  "Great experience overall, would recommend to family.",
  "Reception was quick and the doctor was patient with my questions.",
];
const NEUTRAL_SNIPPETS = [
  "Consultation was fine, nothing particularly stood out either way.",
  "Doctor was okay, average wait time.",
];
const NEGATIVE_SNIPPETS = [
  "Doctor was good but the waiting time was almost 45 minutes.",
  "Reception took a long time to respond, please improve front desk coordination.",
  "Had to wait quite long past my appointment slot.",
];

const EXPIRY_DAYS = 7;

// Bounded per-campaign sample size for individual drill-down rows — KPI sums
// on the campaign object itself carry the real (much larger) portfolio totals.
function sampleSizeFor(sent: number): number {
  if (sent <= 0) return 0;
  return Math.max(5, Math.min(40, Math.round(sent / 6)));
}

type FunnelStatus = Exclude<RequestStatus, "created" | "queued" | "suppressed">;

// Distributes the sample proportionally across the campaign's real funnel
// counts, landing each sampled request on a terminal lifecycle status.
function statusForIndex(i: number, n: number, campaign: (typeof REVIEW_CAMPAIGNS)[number], rng: () => number): FunnelStatus {
  const sentRate = campaign.requestsSent ? campaign.opened / campaign.requestsSent : 0;
  const feedbackRate = campaign.opened ? campaign.feedbackReceived / campaign.opened : 0;
  const clickRate = campaign.feedbackReceived ? campaign.googleClicks / campaign.feedbackReceived : 0;
  const completeRate = campaign.googleClicks ? campaign.reviewsGenerated / campaign.googleClicks : 0;
  const t = i / n;

  if (t < 0.05) return "failed";
  if (t < 0.08) return rng() > 0.5 ? "expired" : "opted-out";
  if (t < 0.08 + (1 - sentRate) * 0.4) return rng() > 0.5 ? "sent" : "delivered";
  if (t < 0.5 && (1 - feedbackRate) > 0.25) return rng() > 0.4 ? "opened" : "started";
  if (t < 0.55 + (1 - clickRate) * 0.15) return "final-approved";
  if (t < 0.85 && completeRate < 0.92) return "public-clicked";
  return "completed";
}

const HAS_FEEDBACK_STATUSES: RequestStatus[] = ["feedback-submitted", "ai-assisted", "final-approved", "public-clicked", "completed"];

function sentimentFor(rating: number | undefined): FeedbackSentiment | undefined {
  if (rating === undefined) return undefined;
  if (rating >= 4) return "positive";
  if (rating === 3) return "neutral";
  return "needs-attention"; // 1-2 stars
}

const LIFECYCLE_ORDER: RequestStatus[] = [
  "created", "queued", "sent", "delivered", "opened", "started",
  "rating-selected", "feedback-submitted", "ai-assisted", "final-approved",
  "public-clicked", "completed",
];

function buildTimeline(finalStatus: RequestStatus, channel: ReviewRequest["channel"], createdAt: Date, suppressionReason: EligibilityReason | undefined, rng: () => number): RequestTimelineEvent[] {
  const events: RequestTimelineEvent[] = [];
  let cursor = createdAt.getTime();
  const push = (label: string, detail?: string) => events.push({ at: new Date(cursor).toISOString(), label, detail });

  if (finalStatus === "suppressed") {
    push("Request blocked before send", suppressionReason ? eligibilityReasonLabel(suppressionReason) : undefined);
    return events;
  }

  push("Request created");
  cursor += randInt(rng, 0, 1) * 60000;
  push("Request queued");

  if (finalStatus === "failed") {
    cursor += randInt(rng, 1, 3) * 60000;
    push("Delivery attempted");
    cursor += randInt(rng, 1, 5) * 60000;
    push("Delivery failed", "Channel provider returned an error");
    return events;
  }

  cursor += randInt(rng, 1, 3) * 60000;
  push(CHANNEL_SENT_LABEL[channel]);
  cursor += randInt(rng, 1, 4) * 60000;
  push("Delivered");

  if (finalStatus === "opted-out") {
    cursor += randInt(rng, 5, 120) * 60000;
    push("Patient opted out", "No further requests will be sent to this patient");
    return events;
  }
  if (finalStatus === "expired") {
    push("Review request expired", `No response within ${EXPIRY_DAYS} days`);
    return events;
  }

  const idx = LIFECYCLE_ORDER.indexOf(finalStatus);
  const gaps: Record<string, [number, number]> = {
    opened: [5, 90], started: [1, 3], "rating-selected": [1, 2], "feedback-submitted": [2, 6],
    "ai-assisted": [1, 3], "final-approved": [1, 2], "public-clicked": [1, 5], completed: [2, 15],
  };
  const labels: Record<string, string> = {
    opened: "Opened", started: "ReviewFlow started", "rating-selected": "Rating selected",
    "feedback-submitted": "Feedback submitted", "ai-assisted": "AI-assisted version selected",
    "final-approved": "Final review approved", "public-clicked": "Public review destination clicked",
    completed: "Review completed",
  };
  for (let stepIdx = LIFECYCLE_ORDER.indexOf("opened"); stepIdx <= idx; stepIdx++) {
    const status = LIFECYCLE_ORDER[stepIdx];
    const gap = gaps[status];
    if (!gap) continue;
    cursor += randInt(rng, gap[0], gap[1]) * 60000;
    push(labels[status]);
  }
  return events;
}

function suppressionReasonForIndex(campaign: (typeof REVIEW_CAMPAIGNS)[number], rng: () => number): EligibilityReason {
  if (campaign.status !== "active") return "campaign-inactive";
  return pick(rng, SUPPRESSION_REASONS);
}

function generate(): ReviewRequest[] {
  const requests: ReviewRequest[] = [];
  let seq = 0;
  for (const campaign of REVIEW_CAMPAIGNS) {
    const location = getLocation(campaign.locationId);
    if (!location) continue;
    const n = sampleSizeFor(campaign.requestsSent);
    const rng = rngFor(`reqs-${campaign.id}`);
    // A small additional slice of suppressed (never-sent) requests, on top of
    // the funnel sample above — these never consumed a "sent" slot at all.
    const suppressedCount = Math.max(0, Math.round(n * 0.06));

    for (let i = 0; i < n; i++) {
      seq += 1;
      const channel = CHANNEL_MAP[campaign.channel] ?? "whatsapp";
      const status: RequestStatus = statusForIndex(i, n, campaign, rng);
      const hasFeedback = HAS_FEEDBACK_STATUSES.includes(status);
      const rating = hasFeedback ? (rng() > 0.72 ? randInt(rng, 1, 3) : randInt(rng, 4, 5)) : undefined;
      const feedbackText = hasFeedback
        ? (rating && rating >= 4 ? pick(rng, POSITIVE_SNIPPETS) : rating === 3 ? pick(rng, NEUTRAL_SNIPPETS) : pick(rng, NEGATIVE_SNIPPETS))
        : undefined;
      const daysAgo = randInt(rng, 0, 34);
      const createdAt = new Date(Date.now() - daysAgo * 86400000 - randInt(rng, 0, 82800000));
      const timeline = buildTimeline(status, channel, createdAt, undefined, rng);
      requests.push({
        id: `req-${seq}`,
        clientId: campaign.clientId,
        locationId: campaign.locationId,
        doctorId: campaign.doctorId ?? location.doctorIds[0],
        campaignId: campaign.id,
        patientMasked: `Patient #${randInt(rng, 1000, 9999)}`,
        channel,
        trigger: campaign.trigger,
        status,
        eligibility: "eligible",
        ratingGiven: rating,
        feedbackText,
        sentiment: sentimentFor(rating),
        publicReviewClicked: status === "public-clicked" || status === "completed",
        createdAt: createdAt.toISOString(),
        expiresAt: new Date(createdAt.getTime() + EXPIRY_DAYS * 86400000).toISOString(),
        respondedAt: hasFeedback ? new Date(createdAt.getTime() + randInt(rng, 600000, 21600000)).toISOString() : undefined,
        timeline,
      });
    }

    for (let s = 0; s < suppressedCount; s++) {
      seq += 1;
      const channel = CHANNEL_MAP[campaign.channel] ?? "whatsapp";
      const reason = suppressionReasonForIndex(campaign, rng);
      const daysAgo = randInt(rng, 0, 34);
      const createdAt = new Date(Date.now() - daysAgo * 86400000 - randInt(rng, 0, 82800000));
      requests.push({
        id: `req-${seq}`,
        clientId: campaign.clientId,
        locationId: campaign.locationId,
        doctorId: campaign.doctorId ?? location.doctorIds[0],
        campaignId: campaign.id,
        patientMasked: `Patient #${randInt(rng, 1000, 9999)}`,
        channel,
        trigger: campaign.trigger,
        status: "suppressed",
        eligibility: "suppressed",
        suppressionReason: reason,
        publicReviewClicked: false,
        createdAt: createdAt.toISOString(),
        timeline: buildTimeline("suppressed", channel, createdAt, reason, rng),
      });
    }
  }
  return requests.sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
}

export const REVIEW_REQUESTS: ReviewRequest[] = generate();

export function fullFunnelTotals() {
  return {
    requests: REVIEW_CAMPAIGNS.reduce((a, c) => a + c.requestsSent, 0),
    started: REVIEW_CAMPAIGNS.reduce((a, c) => a + c.opened, 0),
    completed: REVIEW_CAMPAIGNS.reduce((a, c) => a + c.feedbackReceived, 0),
    clicks: REVIEW_CAMPAIGNS.reduce((a, c) => a + c.googleClicks, 0),
    reviews: REVIEW_CAMPAIGNS.reduce((a, c) => a + c.reviewsGenerated, 0),
  };
}

export function getRequestById(id: string): ReviewRequest | undefined {
  return REVIEW_REQUESTS.find((r) => r.id === id);
}

