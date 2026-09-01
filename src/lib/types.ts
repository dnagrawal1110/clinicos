export type HealthStatus = "excellent" | "good" | "fair" | "poor" | "critical";

export function healthStatus(score: number): HealthStatus {
  if (score >= 85) return "excellent";
  if (score >= 70) return "good";
  if (score >= 55) return "fair";
  if (score >= 35) return "poor";
  return "critical";
}

export type Severity = "critical" | "attention" | "opportunity" | "info";

// ---------------------------------------------------------------------------
// Scores
// ---------------------------------------------------------------------------

export interface ModuleScores {
  google: number;
  reputation: number;
  website: number;
  content: number;
  social: number;
  ads: number;
  leads: number;
}

// ---------------------------------------------------------------------------
// Org hierarchy: Agency -> Client -> Doctor -> Location -> Channel/Asset
// ---------------------------------------------------------------------------

export interface Agency {
  id: string;
  name: string;
  tagline: string;
}

export type TeamRole = "Admin" | "Account Manager" | "SEO" | "Content" | "Social" | "Performance" | "Reputation" | "Web/Tech" | "Creative" | "Read Only";

export interface TeamMember {
  id: string;
  name: string;
  role: TeamRole;
  team: string;
}

export const SERVICE_CATALOG = [
  "Google Profile Management",
  "Reputation Management",
  "Website SEO",
  "Instagram Management",
  "Facebook Management",
  "Meta Ads",
  "Google Ads",
  "Website Development",
  "WhatsApp CRM",
] as const;
export type ServiceKey = (typeof SERVICE_CATALOG)[number];

export interface Doctor {
  id: string;
  clientId: string;
  name: string;
  specialty: string;
  locationIds: string[];
}

export interface Location {
  id: string;
  clientId: string;
  doctorIds: string[];
  slug: string; // public-facing ReviewFlow URL segment, e.g. "skinethics-kothrud"
  name: string; // area/neighbourhood, e.g. "Baner"
  city: string;
  address: string;
  phone: string;
  hours: string;
  status: "active" | "onboarding" | "paused";
  googleConnected: boolean;
  rating: number;
  reviewCount: number;
  reviewsThisMonth: number;
  reviewDelta30d: number; // % change in velocity
  scores: ModuleScores;
  healthOverall: number;
  services: number;
  photos: number;
  postsActive: boolean;
  leadsThisMonth: number;
  adSpendThisMonth: number;
  hasAds: boolean;
  lastActivity: string; // ISO date of last meaningful agency action
}

export interface Client {
  id: string;
  name: string; // Dr. Ananya Sharma / SkinEthics / ABC Dental
  brand?: string; // secondary brand line
  specialty: string;
  city: string;
  status: "active" | "onboarding" | "at-risk" | "paused";
  accountManager: string;
  doctors: Doctor[];
  locations: Location[];
  activeServices: ServiceKey[];
  scores: ModuleScores;
  healthOverall: number;
  healthTrend: number; // vs last month, pct points
  reviewsTotal: number;
  ratingAvg: number;
  leadsTotal: number;
  appointmentsTotal: number;
  adSpendTotal: number;
  websiteHealth: number;
  createdAt: string;
}

// ---------------------------------------------------------------------------
// Digital assets
// ---------------------------------------------------------------------------

export interface GoogleProfile {
  locationId: string;
  connected: boolean;
  completeness: number;
  category: string;
  servicesListed: number;
  photosCount: number;
  postsActive: boolean;
  websiteLinked: boolean;
  phoneLinked: boolean;
  hoursComplete: boolean;
}

export interface Website {
  clientId: string;
  domain: string;
  hasLocationPages: boolean;
  technicalSeo: number;
  localSeo: number;
  contentScore: number;
  conversionScore: number;
}

export interface SocialAccountEntity {
  clientId: string;
  platform: "instagram" | "facebook" | "youtube" | "linkedin";
  handle: string;
  connected: boolean;
  followers: number;
  engagementRate: number;
}

export interface AdAccount {
  clientId: string;
  platform: "google" | "meta";
  connected: boolean;
}

export interface Review {
  id: string;
  clientId: string;
  locationId: string;
  patientInitial: string;
  rating: number;
  text: string;
  aiText?: string;
  source: "reviewflow" | "organic" | "google";
  status: "new" | "shared" | "declined-to-share" | "flagged";
  submittedAt: string;
}

// Full request lifecycle (section 11). Terminal-exception statuses
// (expired/failed/opted-out/suppressed) can occur at any point in the chain.
export type RequestStatus =
  | "created" | "queued" | "sent" | "delivered" | "opened" | "started"
  | "rating-selected" | "feedback-submitted" | "ai-assisted" | "final-approved"
  | "public-clicked" | "completed" | "expired" | "failed" | "opted-out" | "suppressed";

export type FeedbackSentiment = "positive" | "neutral" | "negative" | "needs-attention";

export type EligibilityReason =
  | "opted-out" | "recent-duplicate" | "duplicate-appointment" | "campaign-inactive"
  | "location-inactive" | "destination-disconnected" | "quiet-hours" | "frequency-cap";

export interface RequestTimelineEvent {
  at: string; // ISO
  label: string;
  detail?: string;
}

export interface ReviewRequest {
  id: string;
  clientId: string;
  locationId: string;
  doctorId?: string;
  campaignId: string;
  patientMasked: string; // e.g. "Patient #4821" — never a full name or phone number
  channel: "whatsapp" | "sms" | "qr" | "link";
  trigger: string;
  status: RequestStatus;
  eligibility: "eligible" | "suppressed";
  suppressionReason?: EligibilityReason;
  ratingGiven?: number;
  feedbackText?: string;
  sentiment?: FeedbackSentiment;
  publicReviewClicked: boolean;
  createdAt: string;
  expiresAt?: string;
  respondedAt?: string;
  timeline: RequestTimelineEvent[];
}

// ---------------------------------------------------------------------------
// Ops
// ---------------------------------------------------------------------------

export interface Insight {
  id: string;
  severity: Severity;
  title: string;
  description: string;
  clientId?: string;
  locationId?: string;
  affected?: string[];
  affectedLocationIds?: string[];
  actionLabel: string;
  module: string;
}

export type TaskSource = "ai-audit" | "manual" | "client-request" | "system";

export interface Task {
  id: string;
  title: string;
  clientId: string;
  locationId?: string;
  doctorId?: string;
  module: string;
  priority: "high" | "medium" | "low";
  owner: string;
  ownerTeam: string;
  dueDate: string;
  status: "open" | "in-progress" | "done" | "blocked";
  aiRecommended: boolean;
  source: TaskSource;
}

export interface ApprovalItem {
  id: string;
  type: "google-post" | "social-post" | "review-response" | "website-change" | "ad-creative" | "report";
  title: string;
  clientId: string;
  locationId?: string;
  status: "draft" | "pending" | "approved" | "scheduled" | "published" | "rejected";
  owner: string;
  submittedAt: string;
  dueDate: string;
  preview?: string;
}

export interface RankingKeyword {
  keyword: string;
  position: number;
  previous: number;
  locationId: string;
}

export interface Competitor {
  name: string;
  reviews: number;
  rating: number;
  reviewVelocity: number;
  services: number;
  photos: number;
  googleActivity: number; // posts/month
  websiteStrength: number;
  localVisibility: number;
}

export interface ContentItem {
  id: string;
  title: string;
  clientId: string;
  locationId: string;
  channel: "google" | "instagram" | "facebook" | "youtube" | "reels";
  type: string;
  status: "idea" | "draft" | "pending" | "approved" | "scheduled" | "published" | "failed";
  date: string;
  owner: string;
  caption?: string;
}

export interface ReviewCampaign {
  id: string;
  name: string;
  clientId: string;
  locationId: string;
  doctorId?: string;
  status: "active" | "paused" | "draft" | "completed";
  trigger: string;
  audience: string;
  language: string;
  channel: string;
  reviewDestination: string;
  destinationPlatform: "google" | "facebook" | "practo" | "clinic-only";
  maxRequestsPerPatient: number;
  frequencyDays: number;
  eligiblePatients: number;
  requestsSent: number;
  opened: number;
  feedbackReceived: number;
  googleClicks: number;
  reviewsGenerated: number;
}

export interface Lead {
  id: string;
  name: string;
  clientId: string;
  locationId: string;
  doctorId?: string;
  source: string;
  campaign?: string;
  service: string;
  value: number;
  quality: "hot" | "warm" | "cold";
  responseTimeMinutes: number;
  status: "new" | "contacted" | "qualified" | "appointment" | "completed" | "lost" | "reactivation";
  createdAt: string;
}

export interface AdCampaign {
  id: string;
  name: string;
  clientId: string;
  locationId: string;
  platform: "google" | "meta";
  service: string;
  landingPage: string;
  status: "active" | "paused" | "ended";
  spend: number;
  leads: number;
  cpl: number;
  appointments: number;
  cpa: number;
  conversionRate: number;
}

export interface Integration {
  id: string;
  name: string;
  category: string;
  status: "connected" | "attention" | "disconnected" | "not-connected";
  description: string;
  connectedAccounts?: number;
}

export interface AIInsight {
  id: string;
  module: string;
  text: string;
  clientId?: string;
  locationId?: string;
}

export interface Alert {
  id: string;
  tone: "critical" | "attention" | "opportunity" | "info" | "success";
  title: string;
  detail: string;
  clientId?: string;
  locationId?: string;
  module?: string;
  createdAt: string;
}

export interface Opportunity {
  id: string;
  clientId: string;
  locationId?: string;
  module: string;
  title: string;
  description: string;
  priority: "high" | "medium" | "low";
}

export interface OnboardingStepState {
  key: string;
  label: string;
  done: boolean;
}

// ---------------------------------------------------------------------------
// ReviewFlow — public Google reviews, AI response, automation, white-label
// ---------------------------------------------------------------------------

export interface GoogleReviewItem {
  id: string;
  clientId: string;
  locationId: string;
  reviewer: string;
  rating: number;
  text: string;
  date: string;
  responseStatus: "responded" | "pending" | "drafted";
  sentiment: "positive" | "neutral" | "negative";
  aiResponseDraft?: string;
  publishedResponse?: string;
}

export interface AutomationStep {
  label: string;
  detail: string;
}

export type AutomationConditionKey =
  | "opted-out" | "recent-duplicate" | "campaign-active" | "location-active"
  | "destination-connected" | "quiet-hours";

export interface AutomationRule {
  id: string;
  name: string;
  trigger: string;
  action: string;
  enabled: boolean;
  steps: AutomationStep[];
  // Configurable, always-on behaviour (section 6/7/9/10) — display-only for now,
  // the shape a real scheduler/eligibility engine would consume later.
  waitHours?: number;
  channel?: "whatsapp" | "sms" | "email" | "qr";
  reminderAfterHours?: number;
  maxAttempts?: number;
  frequencyCapDays?: number;
  quietHoursStart?: string;
  quietHoursEnd?: string;
  timezone?: string;
  conditions?: AutomationConditionKey[];
}

// ---------------------------------------------------------------------------
// Review Program — the higher-level object a location's ReviewFlow setup
// belongs to: one destination + one or more campaigns + automation state.
// ---------------------------------------------------------------------------

export type ProgramStatus = "setup-required" | "active" | "paused" | "needs-attention" | "disconnected" | "archived";

export interface ProgramHealthBreakdown {
  destination: number;
  campaignActivity: number;
  requestDelivery: number;
  feedbackConversion: number;
  reviewConversion: number;
  reviewVelocity: number;
  responseRate: number;
}

export interface ReviewProgram {
  id: string;
  clientId: string;
  locationId: string;
  name: string;
  status: ProgramStatus;
  destinationId: string;
  campaignIds: string[];
  automationEnabled: boolean;
  createdAt: string;
}

export type DestinationType = "google" | "facebook" | "other" | "internal";
export type DestinationStatus = "connected" | "disconnected" | "invalid" | "not-configured" | "unavailable";

export interface ReviewDestination {
  id: string;
  clientId: string;
  locationId: string;
  type: DestinationType;
  name: string;
  url: string;
  status: DestinationStatus;
  priority: number;
  enabled: boolean;
}

// ---------------------------------------------------------------------------
// Message library
// ---------------------------------------------------------------------------

export type MessageCategory = "Consultation" | "Follow-up" | "Procedure" | "Dental" | "Dermatology" | "Orthopedic" | "General";

export interface MessageTemplate {
  id: string;
  name: string;
  category: MessageCategory;
  language: ReviewFlowLanguage;
  trigger: string;
  channel: "whatsapp" | "sms" | "email" | "qr";
  body: string;
  status: "active" | "archived";
  updatedAt: string;
}

// ---------------------------------------------------------------------------
// Audit log + permission architecture (sections 54/55) — UI-facing only,
// no real backend/auth wired up yet.
// ---------------------------------------------------------------------------

export type AuditAction =
  | "campaign.created" | "campaign.paused" | "campaign.resumed" | "campaign.deployed"
  | "message.edited" | "review-response.generated" | "review-response.approved"
  | "review-response.published" | "destination.changed" | "automation.changed"
  | "qr.generated" | "report.generated" | "task.created";

export interface AuditLogEntry {
  id: string;
  at: string;
  actor: string;
  action: AuditAction;
  entityType: string;
  entityId: string;
  clientId?: string;
  locationId?: string;
  detail: string;
}

export type PermissionRole = "Admin" | "Account Manager" | "Reputation Manager" | "Content Manager" | "Read Only";

export type ReviewFlowLanguage = "en" | "hi" | "mr";

export interface ReviewFlowConfig {
  locationId: string;
  clientId: string;
  slug: string;
  clinicDisplayName: string;
  doctorDisplayName?: string;
  locationDisplayName: string;
  logoInitial: string;
  accentColor: string;
  welcomeText: string;
  thankYouText: string;
  supportContact: string;
  googleReviewUrl: string;
  language: ReviewFlowLanguage;
  campaignId: string;
  campaignStatus: "active" | "paused" | "draft" | "completed";
}

// Typed analytics event names — no real analytics wired up yet, this is the
// abstraction a real analytics provider would plug into later.
export type ReviewFlowEventName =
  | "review_page_opened"
  | "rating_selected"
  | "feedback_started"
  | "feedback_submitted"
  | "ai_assist_opened"
  | "ai_version_selected"
  | "original_version_selected"
  | "feedback_edited"
  | "final_review_approved"
  | "public_review_clicked"
  | "flow_completed"
  | "campaign_request_sent"
  | "campaign_opened"
  | "campaign_failed"
  | "task_created_from_feedback"
  | "bulk_campaign_deployed"
  | "review_response_published";

export interface ReviewFlowEvent {
  name: ReviewFlowEventName;
  locationId?: string;
  campaignId?: string;
  properties?: Record<string, string | number | boolean | undefined>;
  timestamp: string;
}
