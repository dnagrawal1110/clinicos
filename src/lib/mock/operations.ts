import type {
  Insight, Task, ApprovalItem, RankingKeyword, Competitor, ContentItem,
  ReviewCampaign, Lead, AdCampaign, Alert, Location, Client,
} from "../types";
import { rngFor, pick, randInt } from "./rng";
import { TEAM_MEMBERS, teamForModule } from "./pools";
import { ALL_CLIENTS, BULK_CLIENTS, drSharma, skinEthics, abcDental, drMehta, drKapoor, allLocations } from "./clients";

const locationsAll = allLocations();
const disconnectedCount = locationsAll.filter((l) => !l.googleConnected).length;
const totalLocations = locationsAll.length;

function clientOf(locationId: string): Client | undefined {
  return ALL_CLIENTS.find((c) => c.locations.some((l) => l.id === locationId));
}

function labelFor(location: Location): string {
  const client = clientOf(location.id);
  return `${client?.name ?? location.clientId} — ${location.name}`;
}

// ---------------------------------------------------------------------------
// AI Priority Insights (Command Center) — kept as a curated top-5, agency-wide
// ---------------------------------------------------------------------------

export const PRIORITY_INSIGHTS: Insight[] = [
  {
    id: "ins-1",
    severity: "critical",
    title: `${disconnectedCount} Google profiles disconnected`,
    description: `${totalLocations - disconnectedCount} of ${totalLocations} profiles are currently connected.`,
    actionLabel: "Review",
    module: "google",
  },
  {
    id: "ins-2",
    severity: "attention",
    title: "14 locations have declining review velocity",
    description: "Review requests are going out, but conversion to Google reviews has dropped sharply this month.",
    affected: [`${drSharma.name} — Kothrud`, `${abcDental.name} — Baner`, `${drMehta.name} — Mumbai`, `${skinEthics.name} — Kothrud`],
    affectedLocationIds: ["dr-ananya-sharma__kothrud", "abc-dental__baner", "dr-rahul-mehta__mumbai", "skinethics__kothrud"],
    actionLabel: "View locations",
    module: "reputation",
  },
  {
    id: "ins-3",
    severity: "opportunity",
    title: "21 clinics are ready for Google Ads",
    description: "Strong Google presence, good review scores, and optimized websites — but weak or no paid acquisition.",
    affected: [drSharma.name, "Radiance Skin & Hair", "Clearview Eye Care"],
    actionLabel: "View opportunities",
    module: "ads",
  },
  {
    id: "ins-4",
    severity: "attention",
    title: "9 clients have overdue content this week",
    description: "Scheduled Google posts and social content are past their publish window without agency approval.",
    affected: ["ABC Dental", "CarePoint Multispeciality"],
    actionLabel: "Open content queue",
    module: "content",
  },
  {
    id: "ins-5",
    severity: "opportunity",
    title: "Rankings improved for 32 tracked keywords",
    description: "Local pack visibility rose across SEO campaigns launched in the last 60 days.",
    actionLabel: "View rankings",
    module: "seo",
  },
];

// ---------------------------------------------------------------------------
// Location-level AI diagnosis + recommended actions (used on Location Overview)
// ---------------------------------------------------------------------------

export const LOCATION_DIAGNOSES: Record<string, { diagnosis: string[]; actions: { id: string; label: string }[] }> = {
  "skinethics__kothrud": {
    diagnosis: [
      "Review velocity has dropped 32% over the last 30 days.",
      "Google profile activity is lower than other SkinEthics locations.",
      "Competitor profiles have 2.1× more recent reviews.",
    ],
    actions: [
      { id: "a1", label: "Activate review campaign" },
      { id: "a2", label: "Schedule 7 Google posts" },
      { id: "a3", label: "Add 4 missing services" },
      { id: "a4", label: "Refresh location page" },
      { id: "a5", label: "Review competitor positioning" },
    ],
  },
  "dr-ananya-sharma__kothrud": {
    diagnosis: [
      "Review requests are being sent but conversion has fallen to 18%, down from 61%.",
      "No Google posts published in 19 days.",
      "Two high-intent services (Hair PRP, Chemical Peel) are missing from the profile.",
    ],
    actions: [
      { id: "a1", label: "Relaunch review campaign with WhatsApp trigger" },
      { id: "a2", label: "Schedule 5 Google posts" },
      { id: "a3", label: "Add missing services" },
      { id: "a4", label: "Audit response time on Google messages" },
    ],
  },
};

// ---------------------------------------------------------------------------
// Google — rankings & competitors (SkinEthics Kothrud is the flagship example)
// ---------------------------------------------------------------------------

export const RANKINGS: Record<string, RankingKeyword[]> = {
  "skinethics__kothrud": [
    { keyword: "dermatologist in Kothrud", position: 6, previous: 9, locationId: "skinethics__kothrud" },
    { keyword: "skin clinic Kothrud", position: 4, previous: 6, locationId: "skinethics__kothrud" },
    { keyword: "acne treatment Kothrud", position: 11, previous: 8, locationId: "skinethics__kothrud" },
    { keyword: "hair prp Kothrud", position: 14, previous: 17, locationId: "skinethics__kothrud" },
    { keyword: "best skin doctor Pune", position: 22, previous: 24, locationId: "skinethics__kothrud" },
    { keyword: "laser hair removal Kothrud", position: 9, previous: 9, locationId: "skinethics__kothrud" },
  ],
  "dr-ananya-sharma__baner": [
    { keyword: "dermatologist in Baner", position: 3, previous: 4, locationId: "dr-ananya-sharma__baner" },
    { keyword: "skin specialist Baner", position: 2, previous: 3, locationId: "dr-ananya-sharma__baner" },
    { keyword: "acne treatment Baner", position: 7, previous: 5, locationId: "dr-ananya-sharma__baner" },
  ],
};

export const COMPETITORS: Record<string, Competitor[]> = {
  "skinethics__kothrud": [
    { name: "SkinEthics — Kothrud (You)", reviews: 482, rating: 4.6, reviewVelocity: 22, services: 24, photos: 96, googleActivity: 2, websiteStrength: 71, localVisibility: 62 },
    { name: "Kaya Skin Clinic", reviews: 1140, rating: 4.5, reviewVelocity: 51, services: 31, photos: 210, googleActivity: 9, websiteStrength: 84, localVisibility: 88 },
    { name: "Oliva Skin & Hair", reviews: 890, rating: 4.7, reviewVelocity: 46, services: 28, photos: 178, googleActivity: 7, websiteStrength: 79, localVisibility: 81 },
    { name: "DermaCare Kothrud", reviews: 312, rating: 4.3, reviewVelocity: 18, services: 19, photos: 64, googleActivity: 3, websiteStrength: 58, localVisibility: 54 },
  ],
};

export const GOOGLE_AUDIT: Record<string, { overall: number; breakdown: { label: string; score: number }[] }> = {
  "skinethics__kothrud": {
    overall: 74,
    breakdown: [
      { label: "Profile completeness", score: 91 },
      { label: "Category relevance", score: 83 },
      { label: "Services", score: 62 },
      { label: "Reviews", score: 71 },
      { label: "Review velocity", score: 54 },
      { label: "Content activity", score: 48 },
      { label: "Photos", score: 81 },
      { label: "Local relevance", score: 69 },
      { label: "Website alignment", score: 73 },
    ],
  },
};

export const GOOGLE_BLOCKERS: Record<string, { id: string; title: string; description: string; severity: "critical" | "attention"; evidence: string; recommendation: string; assignee: string; status: Task["status"] }[]> = {
  "skinethics__kothrud": [
    {
      id: "blk-1",
      title: "Low review velocity",
      description: "Competitors are generating approximately 2.4× more recent reviews.",
      severity: "critical",
      evidence: "22 reviews in last 30 days vs. Kaya (51) and Oliva (46).",
      recommendation: "Launch a review campaign targeting the last 90 days of patients.",
      assignee: "Vikas Rao",
      status: "open",
    },
    {
      id: "blk-2",
      title: "Missing services",
      description: "7 high-intent services are missing or insufficiently represented.",
      severity: "attention",
      evidence: "Hair PRP, Chemical Peel, and Anti-Ageing are not listed on the Google profile.",
      recommendation: "Add missing services with descriptions and pricing where available.",
      assignee: "Aman Kulkarni",
      status: "in-progress",
    },
    {
      id: "blk-3",
      title: "Low activity",
      description: "No meaningful Google content published in 19 days.",
      severity: "attention",
      evidence: "Last published post: education carousel on Sept 12.",
      recommendation: "Resume 3x/week Google posting cadence.",
      assignee: "Neha Joshi",
      status: "open",
    },
    {
      id: "blk-4",
      title: "Local SEO gap",
      description: "Website does not strongly reinforce this location/service combination.",
      severity: "attention",
      evidence: "No dedicated Kothrud location page; acne treatment page has no local signals.",
      recommendation: "Create a dedicated Kothrud + Acne Treatment landing page.",
      assignee: "Isha Bhatt",
      status: "open",
    },
  ],
};

// ---------------------------------------------------------------------------
// Reputation — review campaigns (hand-authored flagships + generated at scale)
// ---------------------------------------------------------------------------

const SKINETHICS_DOCTOR_ID = "skinethics__doc-0";

const HAND_CAMPAIGNS: ReviewCampaign[] = [
  { id: "rc-1", name: "September Consultation Campaign", clientId: "skinethics", locationId: "skinethics__kothrud", doctorId: SKINETHICS_DOCTOR_ID, status: "active", trigger: "After consultation", audience: "All patients", language: "English + Marathi", channel: "WhatsApp", reviewDestination: "Google", destinationPlatform: "google", maxRequestsPerPatient: 2, frequencyDays: 3, eligiblePatients: 120, requestsSent: 86, opened: 74, feedbackReceived: 61, googleClicks: 43, reviewsGenerated: 24 },
  { id: "rc-1b", name: "Baner Post-Visit Campaign", clientId: "skinethics", locationId: "skinethics__baner", doctorId: SKINETHICS_DOCTOR_ID, status: "active", trigger: "After appointment", audience: "All patients", language: "English", channel: "WhatsApp", reviewDestination: "Google", destinationPlatform: "google", maxRequestsPerPatient: 2, frequencyDays: 3, eligiblePatients: 165, requestsSent: 120, opened: 108, feedbackReceived: 91, googleClicks: 85, reviewsGenerated: 82 },
  { id: "rc-1c", name: "Wakad Loyalty Campaign", clientId: "skinethics", locationId: "skinethics__wakad", doctorId: SKINETHICS_DOCTOR_ID, status: "active", trigger: "After appointment", audience: "Repeat patients", language: "English", channel: "WhatsApp", reviewDestination: "Google", destinationPlatform: "google", maxRequestsPerPatient: 2, frequencyDays: 3, eligiblePatients: 140, requestsSent: 102, opened: 89, feedbackReceived: 76, googleClicks: 61, reviewsGenerated: 55 },
  { id: "rc-2", name: "Baner Post-Visit Flow", clientId: "dr-ananya-sharma", locationId: "dr-ananya-sharma__baner", status: "active", trigger: "After appointment", audience: "All patients", language: "English", channel: "SMS + WhatsApp", reviewDestination: "Google", destinationPlatform: "google", maxRequestsPerPatient: 2, frequencyDays: 3, eligiblePatients: 460, requestsSent: 402, opened: 340, feedbackReceived: 289, googleClicks: 221, reviewsGenerated: 187 },
  { id: "rc-3", name: "Wakad Loyalty Review Push", clientId: "dr-ananya-sharma", locationId: "dr-ananya-sharma__wakad", status: "active", trigger: "After appointment", audience: "Repeat patients", language: "English", channel: "WhatsApp", reviewDestination: "Google", destinationPlatform: "google", maxRequestsPerPatient: 2, frequencyDays: 3, eligiblePatients: 290, requestsSent: 244, opened: 201, feedbackReceived: 163, googleClicks: 118, reviewsGenerated: 94 },
  { id: "rc-4", name: "ABC Dental Recovery Campaign", clientId: "abc-dental", locationId: "abc-dental__baner", status: "paused", trigger: "After consultation", audience: "All patients", language: "English + Hindi", channel: "SMS", reviewDestination: "Google", destinationPlatform: "google", maxRequestsPerPatient: 1, frequencyDays: 7, eligiblePatients: 120, requestsSent: 64, opened: 40, feedbackReceived: 21, googleClicks: 9, reviewsGenerated: 6 },
  { id: "rc-5", name: "Indiranagar Smile Journey Flow", clientId: "dr-priya-kapoor", locationId: "dr-priya-kapoor__indiranagar", status: "active", trigger: "After each visit milestone", audience: "Ongoing treatment patients", language: "English", channel: "WhatsApp", reviewDestination: "Google", destinationPlatform: "google", maxRequestsPerPatient: 3, frequencyDays: 5, eligiblePatients: 512, requestsSent: 498, opened: 431, feedbackReceived: 390, googleClicks: 340, reviewsGenerated: 288 },
  { id: "rc-6", name: "Kothrud Draft Flow (Dr. Sharma)", clientId: "dr-ananya-sharma", locationId: "dr-ananya-sharma__kothrud", status: "draft", trigger: "After consultation", audience: "All patients", language: "English", channel: "WhatsApp", reviewDestination: "Google", destinationPlatform: "google", maxRequestsPerPatient: 2, frequencyDays: 3, eligiblePatients: 0, requestsSent: 0, opened: 0, feedbackReceived: 0, googleClicks: 0, reviewsGenerated: 0 },
];

const CAMPAIGN_NAME_TEMPLATES = ["Post-Visit Review Flow", "Loyalty Review Push", "Consultation Follow-up Flow", "WhatsApp Review Journey", "Monthly Review Booster"];
const TRIGGERS = ["After consultation", "After appointment", "After procedure", "After follow-up", "Manual campaign"];
const AUDIENCES = ["All patients", "Repeat patients", "New patients only", "Ongoing treatment patients"];
const LANGUAGES = ["English", "English + Hindi", "English + Marathi", "English + Kannada", "English + Telugu"];
const CHANNELS: ReviewCampaign["channel"][] = ["WhatsApp", "SMS", "SMS + WhatsApp", "Email"];
const DESTINATIONS: ReviewCampaign["destinationPlatform"][] = ["google", "google", "google", "google", "facebook", "practo"];

const AUTOMATION_CAMPAIGN_NAMES = ["Always-On Post-Visit Flow", "Continuous Review Automation", "Standing WhatsApp Journey"];

function buildBulkCampaign(loc: Location, id: string, opts: { alwaysOn?: boolean; doctorIndex?: number } = {}): ReviewCampaign {
  const lrng = rngFor(`campaign-bulk-${id}`);
  const eligiblePatients = randInt(lrng, 60, 700);
  const sentRate = randInt(lrng, 70, 98) / 100;
  const requestsSent = Math.round(eligiblePatients * sentRate);
  const openRate = randInt(lrng, 65, 92) / 100;
  const opened = Math.round(requestsSent * openRate);
  const feedbackRate = loc.reviewDelta30d < -15 ? randInt(lrng, 25, 45) / 100 : randInt(lrng, 45, 75) / 100;
  const feedbackReceived = Math.round(opened * feedbackRate);
  const clickRate = randInt(lrng, 55, 85) / 100;
  const googleClicks = Math.round(feedbackReceived * clickRate);
  const genRate = randInt(lrng, 60, 90) / 100;
  const reviewsGenerated = Math.round(googleClicks * genRate);
  const destinationPlatform = pick(lrng, DESTINATIONS);
  const doctorId = loc.doctorIds[(opts.doctorIndex ?? 0) % Math.max(1, loc.doctorIds.length)];
  return {
    id: `rc-bulk-${id}`,
    name: opts.alwaysOn ? `${loc.name} ${pick(lrng, AUTOMATION_CAMPAIGN_NAMES)}` : `${loc.name} ${pick(lrng, CAMPAIGN_NAME_TEMPLATES)}`,
    clientId: loc.clientId,
    locationId: loc.id,
    doctorId,
    status: loc.status === "paused" ? "paused" : (lrng() > 0.12 ? "active" : "paused"),
    trigger: opts.alwaysOn ? "After appointment" : pick(lrng, TRIGGERS),
    audience: pick(lrng, AUDIENCES),
    language: pick(lrng, LANGUAGES),
    channel: pick(lrng, CHANNELS),
    reviewDestination: destinationPlatform === "google" ? "Google" : destinationPlatform === "facebook" ? "Facebook" : "Practo",
    destinationPlatform,
    maxRequestsPerPatient: pick(lrng, [1, 2, 2, 3]),
    frequencyDays: pick(lrng, [2, 3, 5, 7]),
    eligiblePatients, requestsSent, opened, feedbackReceived, googleClicks, reviewsGenerated,
  };
}

// A location can run more than one campaign at once (section 1/45) — a
// primary outreach campaign plus, for busier locations, a second always-on
// automation-linked flow. This is also what pushes the portfolio to the
// 500+ campaign scale called for in section 61.
function generateBulkCampaigns(): ReviewCampaign[] {
  const covered = new Set(HAND_CAMPAIGNS.map((c) => c.locationId));
  const campaigns: ReviewCampaign[] = [];
  const primaryEligible = locationsAll.filter((l) => !covered.has(l.id) && l.reviewCount > 25);
  primaryEligible.forEach((loc, i) => campaigns.push(buildBulkCampaign(loc, `p${i}`)));

  const secondaryEligible = locationsAll.filter((l) => l.reviewCount > 120);
  secondaryEligible.forEach((loc, i) => campaigns.push(buildBulkCampaign(loc, `a${i}`, { alwaysOn: true, doctorIndex: 1 })));

  return campaigns;
}

export const REVIEW_CAMPAIGNS: ReviewCampaign[] = [...HAND_CAMPAIGNS, ...generateBulkCampaigns()];

export function campaignConversionRate(c: ReviewCampaign): number {
  return c.requestsSent ? Math.round((c.reviewsGenerated / c.requestsSent) * 1000) / 10 : 0;
}

export interface PatientFeedback {
  id: string;
  patientInitial: string;
  clientId: string;
  locationId: string;
  rating: number;
  text: string;
  aiText?: string;
  status: "new" | "shared" | "declined-to-share" | "flagged";
  submittedAt: string;
}

export const PATIENT_FEEDBACK: PatientFeedback[] = [
  { id: "fb-1", patientInitial: "R. K.", clientId: "skinethics", locationId: "skinethics__kothrud", rating: 5, text: "dr was good explained everything nicely staff also helpful only waiting time was more like 40 min", aiText: "The doctor was excellent and explained everything clearly. The staff was helpful throughout. The only drawback was a longer-than-expected wait time of around 40 minutes.", status: "shared", submittedAt: "2026-08-29T10:14:00+05:30" },
  { id: "fb-2", patientInitial: "S. P.", clientId: "dr-ananya-sharma", locationId: "dr-ananya-sharma__baner", rating: 5, text: "very good experience clean clinic doctor listened patiently", aiText: "A very good experience overall — the clinic was clean, and the doctor listened patiently to all my concerns.", status: "shared", submittedAt: "2026-08-30T18:02:00+05:30" },
  { id: "fb-3", patientInitial: "A. M.", clientId: "abc-dental", locationId: "abc-dental__baner", rating: 3, text: "ok experience but reception took long to respond on calls", status: "new", submittedAt: "2026-08-31T09:40:00+05:30" },
  { id: "fb-4", patientInitial: "N. T.", clientId: "skinethics", locationId: "skinethics__kothrud", rating: 2, text: "waited too long almost an hour, doctor was fine but front desk needs improvement", status: "flagged", submittedAt: "2026-08-27T15:20:00+05:30" },
];

// ---------------------------------------------------------------------------
// Content
// ---------------------------------------------------------------------------

const CONTENT_TOPICS = [
  "Acne education", "Clinic image", "Treatment FAQ", "Doctor authority", "Skin education",
  "Patient education", "Clinic experience", "Before/after showcase", "Myth vs fact", "Meet the team",
];

function buildContentCalendar(clientId: string, locationId: string, channel: ContentItem["channel"], startOffsetDays: number): ContentItem[] {
  const rng = rngFor(`content-${clientId}-${locationId}-${channel}`);
  const items: ContentItem[] = [];
  const owner = teamForModule("Content", `${locationId}-${channel}`).name;
  for (let i = 0; i < 14; i++) {
    const d = new Date(2026, 8, 1 + startOffsetDays + i);
    const statusRoll = rng();
    const status: ContentItem["status"] = i < 3
      ? "published"
      : statusRoll > 0.85 ? "failed" : statusRoll > 0.65 ? "pending" : statusRoll > 0.3 ? "scheduled" : "approved";
    items.push({
      id: `${clientId}-${locationId}-${channel}-${i}`,
      title: pick(rng, CONTENT_TOPICS),
      clientId,
      locationId,
      channel,
      type: channel === "google" ? "Google Post" : channel === "reels" ? "Reel" : "Social Post",
      status,
      date: d.toISOString(),
      owner,
      caption: "Draft caption generated for review — see Content Studio for full copy.",
    });
  }
  return items;
}

const CHANNEL_ROTATION: ContentItem["channel"][] = ["google", "instagram", "facebook", "reels"];

function generateBulkContent(): ContentItem[] {
  const rng = rngFor("content-bulk");
  const covered = new Set(["skinethics__kothrud", "dr-ananya-sharma__baner", "dr-ananya-sharma__wakad", "dr-priya-kapoor__indiranagar", "abc-dental__baner"]);
  const candidates = locationsAll.filter((l) => !covered.has(l.id)).slice(0, 55);
  const items: ContentItem[] = [];
  candidates.forEach((loc, i) => {
    const lrng = rngFor(`content-bulk-loc-${loc.id}`);
    const channel = pick(lrng, CHANNEL_ROTATION);
    items.push(...buildContentCalendar(loc.clientId, loc.id, channel, randInt(rng, -3, 3)));
    if (i % 3 === 0) {
      const secondChannel = pick(lrng, CHANNEL_ROTATION.filter((c) => c !== channel));
      items.push(...buildContentCalendar(loc.clientId, loc.id, secondChannel, randInt(rng, -3, 3)));
    }
  });
  return items;
}

export const CONTENT_ITEMS: ContentItem[] = [
  ...buildContentCalendar("skinethics", "skinethics__kothrud", "google", 0),
  ...buildContentCalendar("dr-ananya-sharma", "dr-ananya-sharma__baner", "instagram", -2),
  ...buildContentCalendar("dr-ananya-sharma", "dr-ananya-sharma__wakad", "facebook", 1),
  ...buildContentCalendar("dr-priya-kapoor", "dr-priya-kapoor__indiranagar", "reels", -1),
  ...buildContentCalendar("abc-dental", "abc-dental__baner", "google", 2),
  ...generateBulkContent(),
];

// ---------------------------------------------------------------------------
// Auto-generated Tasks — derived from real conditions across the mock dataset
// ---------------------------------------------------------------------------

interface TaskCondition {
  test: (l: Location) => boolean;
  title: (l: Location) => string;
  module: string;
  priority: (l: Location) => Task["priority"];
}

const TASK_CONDITIONS: TaskCondition[] = [
  {
    test: (l) => !l.googleConnected,
    title: () => "Reconnect disconnected Google Business Profile",
    module: "Google",
    priority: () => "high",
  },
  {
    test: (l) => l.reviewDelta30d < -25,
    title: (l) => `Review velocity dropped ${Math.abs(l.reviewDelta30d)}% — relaunch review campaign`,
    module: "Reputation",
    priority: (l) => (l.reviewDelta30d < -40 ? "high" : "medium"),
  },
  {
    test: (l) => l.scores.google < 60,
    title: () => "Add missing services to Google profile",
    module: "Google",
    priority: (l) => (l.scores.google < 45 ? "high" : "medium"),
  },
  {
    test: (l) => !l.postsActive || l.scores.content < 45,
    title: () => "No Google post in 14+ days — resume posting cadence",
    module: "Content",
    priority: () => "medium",
  },
  {
    test: (l) => l.scores.website < 55,
    title: () => "Fix website SEO issue on location page",
    module: "Website & SEO",
    priority: (l) => (l.scores.website < 40 ? "high" : "medium"),
  },
  {
    test: (l) => l.hasAds && l.scores.ads < 45,
    title: () => "Investigate rising CPL in ad campaign",
    module: "Ads",
    priority: () => "high",
  },
  {
    test: (l) => l.scores.leads < 50,
    title: () => "Improve lead response time — SLA breaches detected",
    module: "Leads",
    priority: (l) => (l.scores.leads < 35 ? "high" : "medium"),
  },
  {
    test: (l) => l.rating < 4.2 && l.reviewCount > 40,
    title: () => "Respond to recent negative review",
    module: "Reputation",
    priority: () => "high",
  },
];

function generateAutoTasks(): Task[] {
  const tasks: Task[] = [];
  let n = 0;
  for (const loc of locationsAll) {
    const client = clientOf(loc.id);
    if (!client) continue;
    for (const cond of TASK_CONDITIONS) {
      if (!cond.test(loc)) continue;
      const rng = rngFor(`autotask-${loc.id}-${cond.module}`);
      const owner = teamForModule(cond.module, loc.id + cond.module);
      const dueOffset = randInt(rng, -2, 10);
      const statusRoll = rng();
      n += 1;
      tasks.push({
        id: `atask-${n}`,
        title: cond.title(loc),
        clientId: client.id,
        locationId: loc.id,
        doctorId: loc.doctorIds[0],
        module: cond.module,
        priority: cond.priority(loc),
        owner: owner.name,
        ownerTeam: owner.team,
        dueDate: new Date(2026, 8, 1 + dueOffset).toISOString(),
        status: statusRoll > 0.82 ? "blocked" : statusRoll > 0.55 ? "done" : statusRoll > 0.28 ? "in-progress" : "open",
        aiRecommended: true,
        source: "ai-audit",
      });
    }
  }
  return tasks;
}

function generateReportDueTasks(): Task[] {
  const rng = rngFor("report-due-tasks");
  return ALL_CLIENTS.filter(() => rng() > 0.75).slice(0, 18).map((client, i) => {
    const owner = teamForModule("Reporting", client.id);
    return {
      id: `rtask-${i}`,
      title: `Prepare monthly report for ${client.name}`,
      clientId: client.id,
      module: "Reporting",
      priority: "medium",
      owner: owner.name,
      ownerTeam: owner.team,
      dueDate: new Date(2026, 8, randInt(rng, 1, 10)).toISOString(),
      status: rng() > 0.5 ? "open" : "in-progress",
      aiRecommended: false,
      source: "system",
    } satisfies Task;
  });
}

export const TASKS: Task[] = [...generateAutoTasks(), ...generateReportDueTasks()];

// ---------------------------------------------------------------------------
// Approvals
// ---------------------------------------------------------------------------

function generateApprovals(): ApprovalItem[] {
  const rng = rngFor("approvals-seed");
  const pool = [drSharma, skinEthics, abcDental, drMehta, drKapoor, ...BULK_CLIENTS.slice(0, 25)];
  const types: ApprovalItem["type"][] = ["google-post", "social-post", "review-response", "website-change", "ad-creative", "report"];
  const statuses: ApprovalItem["status"][] = ["draft", "pending", "approved", "scheduled", "published", "rejected"];
  const titles: Record<ApprovalItem["type"], string[]> = {
    "google-post": ["Weekly education post — Acne care", "Doctor spotlight post", "Festive greetings post"],
    "social-post": ["Instagram carousel — Before & After", "Reel: 5 skin myths busted", "Facebook clinic tour"],
    "review-response": ["Response to 2-star review (waiting time)", "Response to 5-star review — thank you"],
    "website-change": ["Add Kothrud location page", "Update service pricing table"],
    "ad-creative": ["Meta ad — Acne Treatment Offer", "Google ad copy — Hair PRP"],
    "report": ["September Monthly Report — Dr. Sharma", "September Monthly Report — SkinEthics"],
  };
  const items: ApprovalItem[] = [];
  for (let i = 0; i < 40; i++) {
    const client = pick(rng, pool);
    if (!client.locations.length) continue;
    const loc = pick(rng, client.locations);
    const type = pick(rng, types);
    items.push({
      id: `appr-${i}`,
      type,
      title: pick(rng, titles[type]),
      clientId: client.id,
      locationId: loc.id,
      status: pick(rng, statuses),
      owner: pick(rng, TEAM_MEMBERS).name,
      submittedAt: new Date(2026, 7, randInt(rng, 20, 31)).toISOString(),
      dueDate: new Date(2026, 8, randInt(rng, 1, 15)).toISOString(),
    });
  }
  return items;
}

export const APPROVALS: ApprovalItem[] = generateApprovals();

// ---------------------------------------------------------------------------
// Ads & Leads
// ---------------------------------------------------------------------------

const HAND_AD_CAMPAIGNS: AdCampaign[] = [
  { id: "ad-1", name: "Acne Treatment — Wakad", clientId: "dr-ananya-sharma", locationId: "dr-ananya-sharma__wakad", platform: "meta", service: "Acne Treatment", landingPage: "/lp/acne-wakad", status: "active", spend: 31000, leads: 94, cpl: 330, appointments: 41, cpa: 756, conversionRate: 43.6 },
  { id: "ad-2", name: "Hair PRP — Baner", clientId: "dr-ananya-sharma", locationId: "dr-ananya-sharma__baner", platform: "google", service: "Hair PRP", landingPage: "/lp/hair-prp-baner", status: "active", spend: 42000, leads: 118, cpl: 356, appointments: 55, cpa: 763, conversionRate: 46.6 },
  { id: "ad-3", name: "Smile Makeover — Indiranagar", clientId: "dr-priya-kapoor", locationId: "dr-priya-kapoor__indiranagar", platform: "meta", service: "Invisalign", landingPage: "/lp/invisalign-indiranagar", status: "active", spend: 58000, leads: 143, cpl: 405, appointments: 71, cpa: 817, conversionRate: 49.7 },
  { id: "ad-4", name: "Knee Care — Pune", clientId: "dr-rahul-mehta", locationId: "dr-rahul-mehta__pune", platform: "google", service: "Knee Replacement", landingPage: "/lp/knee-pune", status: "active", spend: 36000, leads: 88, cpl: 409, appointments: 34, cpa: 1059, conversionRate: 38.6 },
  { id: "ad-5", name: "Kothrud Derma Push", clientId: "skinethics", locationId: "skinethics__kothrud", platform: "meta", service: "Skin Brightening", landingPage: "/lp/skin-kothrud", status: "paused", spend: 44000, leads: 87, cpl: 506, appointments: 29, cpa: 1517, conversionRate: 33.3 },
];

function generateBulkAdCampaigns(): AdCampaign[] {
  const covered = new Set(HAND_AD_CAMPAIGNS.map((c) => c.locationId));
  const eligible = locationsAll.filter((l) => l.hasAds && !covered.has(l.id));
  return eligible.slice(0, 140).map((loc, i) => {
    const lrng = rngFor(`ads-bulk-${loc.id}`);
    const client = clientOf(loc.id);
    const service = pick(lrng, ["General Consultation", "Signature Treatment", "New Patient Offer", "Seasonal Promotion"]);
    const platform: AdCampaign["platform"] = lrng() > 0.5 ? "google" : "meta";
    const spend = loc.adSpendThisMonth || randInt(lrng, 8000, 90000);
    const cpl = Math.round(spend / Math.max(1, Math.round(loc.leadsThisMonth * randFloatLocal(lrng, 0.3, 0.7))));
    const leads = Math.max(5, Math.round(spend / Math.max(120, cpl)));
    const appointments = Math.round(leads * randFloatLocal(lrng, 0.3, 0.55));
    const cpa = Math.round(spend / Math.max(1, appointments));
    return {
      id: `ad-bulk-${i}`,
      name: `${service} — ${loc.name}`,
      clientId: client?.id ?? loc.clientId,
      locationId: loc.id,
      platform,
      service,
      landingPage: `/lp/${service.toLowerCase().replace(/\s+/g, "-")}-${loc.name.toLowerCase().replace(/\s+/g, "-")}`,
      status: loc.status === "paused" ? "paused" : "active",
      spend, leads, cpl, appointments, cpa,
      conversionRate: Math.round((appointments / Math.max(1, leads)) * 1000) / 10,
    };
  });
}

function randFloatLocal(rng: () => number, min: number, max: number) {
  return rng() * (max - min) + min;
}

export const AD_CAMPAIGNS: AdCampaign[] = [...HAND_AD_CAMPAIGNS, ...generateBulkAdCampaigns()];

const LEAD_NAMES = ["Priya Nair", "Rahul Shah", "Ananya Verma", "Kunal Bhatia", "Sneha Rao", "Arjun Menon", "Divya Kapoor", "Sameer Khan", "Ritu Agarwal", "Varun Kulkarni", "Ishaan Gupta", "Pooja Reddy", "Rohit Malhotra", "Kavya Iyer", "Nikhil Deshpande", "Aisha Sheikh"];
const LEAD_SOURCES = ["Google Ads", "Meta Ads", "Google Business Profile", "Organic Website", "WhatsApp", "Referral"];

function generateLeads(): Lead[] {
  const rng = rngFor("leads-seed");
  const statuses: Lead["status"][] = ["new", "contacted", "qualified", "appointment", "completed", "lost", "reactivation"];
  const qualities: Lead["quality"][] = ["hot", "warm", "cold"];
  const weightedLocations = locationsAll.filter((l) => l.leadsThisMonth > 15);
  const leads: Lead[] = [];
  for (let i = 0; i < 320; i++) {
    const loc = pick(rng, weightedLocations.length ? weightedLocations : locationsAll);
    const client = clientOf(loc.id);
    if (!client) continue;
    const doctor = loc.doctorIds.length ? pick(rng, loc.doctorIds) : undefined;
    const responseTime = randInt(rng, 2, 220);
    leads.push({
      id: `lead-${i}`,
      name: pick(rng, LEAD_NAMES),
      clientId: client.id,
      locationId: loc.id,
      doctorId: doctor,
      source: pick(rng, LEAD_SOURCES),
      campaign: rng() > 0.4 ? pick(rng, AD_CAMPAIGNS).name : undefined,
      service: pick(rng, ["General Consultation", "Follow-up Visit", "New Patient Enquiry"]),
      value: randInt(rng, 800, 18000),
      quality: responseTime > 60 ? pick(rng, ["warm", "cold"]) : pick(rng, qualities),
      responseTimeMinutes: responseTime,
      status: pick(rng, statuses),
      createdAt: new Date(2026, 7, randInt(rng, 1, 31)).toISOString(),
    });
  }
  return leads;
}

export const LEADS: Lead[] = generateLeads();

// ---------------------------------------------------------------------------
// Auto-generated Alerts — derived from real conditions, click-through ready
// ---------------------------------------------------------------------------

function generateAlerts(): Alert[] {
  const alerts: Alert[] = [];
  let n = 0;
  const push = (a: Omit<Alert, "id">) => { n += 1; alerts.push({ id: `alert-${n}`, ...a }); };

  for (const loc of locationsAll) {
    const client = clientOf(loc.id);
    if (!client) continue;
    const daysAgoSeed = rngFor(`alert-time-${loc.id}`);
    const minutesAgo = randInt(daysAgoSeed, 5, 2600);
    const createdAt = new Date(Date.now() - minutesAgo * 60000).toISOString();

    if (!loc.googleConnected) {
      push({ tone: "critical", title: "Google profile disconnected", detail: `${client.name} — ${loc.name} lost its Google connection.`, clientId: client.id, locationId: loc.id, module: "google", createdAt });
    }
    if (loc.rating < 4.1 && loc.reviewCount > 30) {
      push({ tone: "critical", title: "Rating dropped below threshold", detail: `${client.name} — ${loc.name} is at ${loc.rating.toFixed(1)}★, below the 4.2 alert threshold.`, clientId: client.id, locationId: loc.id, module: "reputation", createdAt });
    }
    if (loc.reviewDelta30d < -30) {
      push({ tone: "attention", title: "Review velocity declining", detail: `${client.name} — ${loc.name} review velocity is down ${Math.abs(loc.reviewDelta30d)}%.`, clientId: client.id, locationId: loc.id, module: "reputation", createdAt });
    }
    if (loc.hasAds && loc.scores.ads < 45) {
      push({ tone: "attention", title: "Ad CPL increased", detail: `${client.name} — ${loc.name} campaign efficiency has fallen below target.`, clientId: client.id, locationId: loc.id, module: "ads", createdAt });
    }
    if (loc.scores.google > 78 && loc.scores.reputation > 68 && !loc.hasAds) {
      push({ tone: "opportunity", title: "Client is ready for Google Ads", detail: `${client.name} — ${loc.name} has strong organic visibility but no paid acquisition.`, clientId: client.id, locationId: loc.id, module: "ads", createdAt });
    }
  }

  for (const [locId, rankings] of Object.entries(RANKINGS)) {
    const loc = locationsAll.find((l) => l.id === locId);
    const client = loc ? clientOf(loc.id) : undefined;
    const improved = rankings.find((r) => r.previous - r.position > 0);
    if (improved && loc && client) {
      push({ tone: "success", title: "Google ranking improved", detail: `"${improved.keyword}" moved from #${improved.previous} to #${improved.position} for ${client.name} — ${loc.name}.`, clientId: client.id, locationId: loc.id, module: "seo", createdAt: new Date(Date.now() - 3 * 3600000).toISOString() });
    }
  }

  const onboardingClients = ALL_CLIENTS.filter((c) => c.status === "onboarding");
  onboardingClients.forEach((c) => {
    push({ tone: "info", title: "Onboarding milestone", detail: `${c.name} completed Google profile setup.`, clientId: c.id, module: "onboarding", createdAt: new Date(Date.now() - 26 * 3600000).toISOString() });
  });

  return alerts.sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
}

export const ALERTS: Alert[] = generateAlerts();

export const disconnectedProfilesCount = disconnectedCount;
export const totalLocationsCount = totalLocations;
export { clientOf, labelFor };

