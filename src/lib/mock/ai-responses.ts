import type { Scope } from "../scope-context";
import { ALL_CLIENTS, allLocations, getClient, getLocation } from "./clients";
import { getDiagnosis } from "./location-detail";
import type { Location } from "../types";

export interface AffectedLocation {
  label: string;
  clientId: string;
  locationId?: string;
  href: string;
}

export interface AIResponse {
  answer: string;
  evidence: string[];
  actions: string[];
  affected: AffectedLocation[];
}

function locName(l: Location): string {
  const client = getClient(l.clientId);
  return `${client?.name ?? l.clientId} — ${l.name}`;
}

function toAffected(l: Location): AffectedLocation {
  return { label: locName(l), clientId: l.clientId, locationId: l.id, href: `/clients/${l.clientId}/locations/${l.id}` };
}

function clientAffected(id: string): AffectedLocation {
  const c = getClient(id);
  return { label: c?.name ?? id, clientId: id, href: `/clients/${id}` };
}

// Finds a specific location mentioned by name in free text, optionally
// disambiguated by the operator's current scope.
function findLocationMention(query: string, scope?: Scope): Location | undefined {
  const q = query.toLowerCase();
  if (scope?.type === "location") {
    const loc = getLocation(scope.locationId);
    if (loc && q.includes(loc.name.toLowerCase())) return loc;
  }
  const all = allLocations();
  for (const loc of all) {
    const client = getClient(loc.clientId);
    if (!client) continue;
    const clientMatch = q.includes(client.name.toLowerCase()) || (client.brand ? q.includes(client.brand.toLowerCase()) : false);
    if (clientMatch && q.includes(loc.name.toLowerCase())) return loc;
  }
  if (scope && scope.type !== "all") {
    const client = getClient(scope.clientId);
    const loc = client?.locations.find((l) => q.includes(l.name.toLowerCase()));
    if (loc) return loc;
  }
  const byNameOnly = all.filter((l) => q.includes(l.name.toLowerCase()));
  if (byNameOnly.length) return [...byNameOnly].sort((a, b) => a.healthOverall - b.healthOverall)[0];
  return undefined;
}

function findTwoLocationMentions(query: string): [Location, Location] | undefined {
  const q = query.toLowerCase();
  const all = allLocations();
  const found: Location[] = [];
  for (const loc of all) {
    const client = getClient(loc.clientId);
    if (!client) continue;
    const clientMatch = q.includes(client.name.toLowerCase()) || (client.brand ? q.includes(client.brand.toLowerCase()) : false);
    if (clientMatch && q.includes(loc.name.toLowerCase()) && !found.includes(loc)) {
      found.push(loc);
      if (found.length === 2) return [found[0], found[1]];
    }
  }
  return undefined;
}

const disconnected = allLocations().filter((l) => !l.googleConnected);
const decliningVelocity = allLocations().filter((l) => l.reviewDelta30d < -15);
const lowReviewsThisMonth = allLocations().filter((l) => l.reviewsThisMonth < 20);
const adsOpportunity = ALL_CLIENTS.filter((c) => c.scores.google > 75 && c.scores.reputation > 70 && c.scores.website > 65 && c.scores.ads < 40)
  .sort((a, b) => b.scores.google + b.scores.reputation - (a.scores.google + a.scores.reputation));
const atRisk = ALL_CLIENTS.filter((c) => c.status === "at-risk" || c.healthOverall < 55).sort((a, b) => a.healthOverall - b.healthOverall);

type Rule = { test: (q: string) => boolean; build: (q: string, scope?: Scope) => AIResponse };

const RULES: Rule[] = [
  {
    test: (q) => /why.*(underperform|not perform|declin|struggl)/.test(q),
    build: (q, scope) => {
      const loc = findLocationMention(q, scope);
      if (!loc) {
        return {
          answer: "I couldn't identify a specific location in that question — try naming both the client and location, e.g. \"Why is SkinEthics Kothrud underperforming?\"",
          evidence: [], actions: [], affected: [],
        };
      }
      const client = getClient(loc.clientId)!;
      const diag = getDiagnosis(loc);
      return {
        answer: `${client.name} — ${loc.name} is underperforming mainly due to declining review velocity and reduced Google activity relative to its other locations.`,
        evidence: [
          `Health score: ${loc.healthOverall}/100`,
          `Review velocity: ${loc.reviewDelta30d >= 0 ? "+" : ""}${loc.reviewDelta30d}% over 30 days`,
          `Google score: ${loc.scores.google}/100, Reputation: ${loc.scores.reputation}/100`,
          `Content score: ${loc.scores.content}/100 · Posts active: ${loc.postsActive ? "yes" : "no"}`,
          ...diag.diagnosis.slice(0, 1),
        ],
        actions: diag.actions.map((a) => a.label),
        affected: [toAffected(loc)],
      };
    },
  },
  {
    test: (q) => /disconnect/.test(q),
    build: () => ({
      answer: `${disconnected.length} Google profiles are currently disconnected across the portfolio.`,
      evidence: [
        `${disconnected.length} of ${allLocations().length} tracked locations are disconnected`,
        `Largest affected client: ${getClient(disconnected[0]?.clientId ?? "")?.name ?? "—"}`,
        "Disconnected profiles stop syncing reviews, posts, and rankings",
      ],
      actions: ["Reconnect each profile from Integrations → Google Business Profile", "Assign a Web/Tech owner to each reconnect task", "Re-run the Google audit once reconnected"],
      affected: disconnected.slice(0, 8).map(toAffected),
    }),
  },
  {
    test: (q) => /declin|velocity/.test(q),
    build: () => ({
      answer: `${decliningVelocity.length} locations have review velocity down more than 15% over the last 30 days.`,
      evidence: decliningVelocity.slice(0, 4).map((l) => `${locName(l)}: ${l.reviewDelta30d}%`),
      actions: ["Launch or relaunch a review campaign for each affected location", "Check front-desk review-request compliance", "Escalate the worst 3 locations to the Reputation team"],
      affected: decliningVelocity.slice(0, 8).map(toAffected),
    }),
  },
  {
    test: (q) => /attention|need.*today|priorit/.test(q),
    build: () => ({
      answer: `${atRisk.length} clients need attention today, ranked by urgency and revenue impact.`,
      evidence: atRisk.slice(0, 5).map((c) => `${c.name}: ${c.status === "at-risk" ? "at-risk status" : "health score"} ${c.healthOverall}/100`),
      actions: ["Review each client's worst-performing location first", "Confirm account manager ownership for at-risk clients", "Schedule a check-in call this week for the bottom 3"],
      affected: atRisk.slice(0, 8).map((c) => clientAffected(c.id)),
    }),
  },
  {
    test: (q) => /upsell|ready.*ads|ads.*opportunit/.test(q),
    build: () => ({
      answer: `${adsOpportunity.length} clients are ranked as ready for Google Ads — strong organic presence, weak paid acquisition.`,
      evidence: adsOpportunity.slice(0, 5).map((c) => `${c.name}: Google ${c.scores.google}, Reputation ${c.scores.reputation}, Ads ${c.scores.ads}`),
      actions: ["Prioritize outreach to the top 3 ranked clients", "Prepare a Google Ads pilot proposal using the Baner playbook", "Loop in the Performance team for budget planning"],
      affected: adsOpportunity.slice(0, 8).map((c) => clientAffected(c.id)),
    }),
  },
  {
    test: (q) => /fewer than 20 reviews|fewer than 10 reviews|low review/.test(q),
    build: () => ({
      answer: `${lowReviewsThisMonth.length} locations generated fewer than 20 reviews this month.`,
      evidence: lowReviewsThisMonth.slice(0, 5).map((l) => `${locName(l)}: ${l.reviewsThisMonth} reviews this month`),
      actions: ["Launch a review campaign for each location below threshold", "Check if the Google profile is connected and active", "Review front-desk request compliance"],
      affected: lowReviewsThisMonth.slice(0, 8).map(toAffected),
    }),
  },
  {
    test: (q) => /review campaign/.test(q),
    build: () => {
      const noCampaign = allLocations().filter((l) => l.reviewCount > 80).slice(0, 5);
      return {
        answer: "Several clients would benefit from a new or relaunched review campaign based on recent visit volume.",
        evidence: noCampaign.map((l) => `${locName(l)}: ${l.reviewsThisMonth} reviews this month, velocity ${l.reviewDelta30d}%`),
        actions: ["Open ReviewFlow → Campaigns and create a new campaign", "Set trigger to 24h after appointment for fastest response", "Use WhatsApp as the primary channel for highest conversion"],
        affected: noCampaign.map(toAffected),
      };
    },
  },
  {
    test: (q) => /no posts scheduled|content overdue/.test(q),
    build: () => {
      const stale = allLocations().filter((l) => !l.postsActive || l.scores.content < 45).slice(0, 6);
      return {
        answer: `${stale.length} locations have no meaningful content scheduled in the next 7 days.`,
        evidence: stale.slice(0, 4).map((l) => `${locName(l)}: content score ${l.scores.content}/100`),
        actions: ["Generate a 30-day calendar for each stale location", "Assign a Content owner to each gap", "Prioritize Google posts over social for local SEO impact"],
        affected: stale.map(toAffected),
      };
    },
  },
  {
    test: (q) => /compare/.test(q),
    build: (q) => {
      const pair = findTwoLocationMentions(q);
      if (pair) {
        const [a, b] = pair;
        const clientA = getClient(a.clientId)!, clientB = getClient(b.clientId)!;
        return {
          answer: `${clientA.name} — ${a.name} is ${a.healthOverall >= b.healthOverall ? "outperforming" : "trailing"} ${clientB.name} — ${b.name} on overall health (${a.healthOverall} vs ${b.healthOverall}).`,
          evidence: [
            `Reviews: ${a.reviewCount} (+${a.reviewsThisMonth} mo) vs ${b.reviewCount} (+${b.reviewsThisMonth} mo)`,
            `Google Health: ${a.scores.google} vs ${b.scores.google}`,
            `Reputation: ${a.scores.reputation} vs ${b.scores.reputation}`,
            `Ads: ${a.hasAds ? a.scores.ads : "—"} vs ${b.hasAds ? b.scores.ads : "—"}`,
          ],
          actions: ["Apply the stronger location's review-campaign cadence to the weaker one", "Match Google posting frequency across both locations"],
          affected: [toAffected(a), toAffected(b)],
        };
      }
      return {
        answer: "SkinEthics — Baner is outperforming Wakad on review velocity (+21% vs +11%) and ad efficiency (CPL ₹356 vs ₹412), but Wakad has stronger Google post cadence this month.",
        evidence: ["Reviews: Baner 1,042 (+96 mo) vs Wakad 754 (+68 mo)", "Google Health: Baner 95 vs Wakad 93", "Ads: Baner CPL ₹356 vs Wakad CPL ₹412"],
        actions: ["Apply Baner's review-campaign cadence to Wakad"],
        affected: [toAffected(getLocation("skinethics__baner")!), toAffected(getLocation("skinethics__wakad")!)],
      };
    },
  },
  {
    test: (q) => /generate.*report|monthly report/.test(q),
    build: (q, scope) => {
      const loc = findLocationMention(q, scope);
      const client = loc ? getClient(loc.clientId) : (scope && scope.type !== "all" ? getClient(scope.clientId) : undefined);
      const target = client ?? ALL_CLIENTS[0];
      return {
        answer: `Drafting the September 2026 growth report for ${target.name}${loc ? ` — ${loc.name}` : ""}.`,
        evidence: ["Google visibility ↑ 18%", "Reviews +196 across locations", "Website traffic ↑ 24%", "Ad CPA ↓ 11%"],
        actions: ["Open Report Preview to review before sending", "Confirm the date range and included modules", "Send to client once approved"],
        affected: loc ? [toAffected(loc)] : [clientAffected(target.id)],
      };
    },
  },
];

const FALLBACK: AIResponse = {
  answer: "Here's what I found across the portfolio for that query.",
  evidence: [
    `${ALL_CLIENTS.length} clients, ${allLocations().length} locations tracked`,
    `${allLocations().filter((l) => l.googleConnected).length} of ${allLocations().length} Google profiles connected`,
  ],
  actions: ["Try asking about a specific client or location by name", "Try: \"Which clients need attention today?\""],
  affected: [],
};

export function askClinicOS(query: string, scope?: Scope): AIResponse {
  const q = query.toLowerCase();
  const rule = RULES.find((r) => r.test(q));
  return rule ? rule.build(q, scope) : FALLBACK;
}

export const AI_EXAMPLE_QUERIES = [
  "Show me clinics with declining review velocity",
  "Which clients have disconnected Google profiles?",
  "Which clinics should we upsell Google Ads?",
  "Show me locations with fewer than 20 reviews this month",
  "Why is SkinEthics Kothrud underperforming?",
  "Which clients need attention today?",
  "Which locations have no posts scheduled?",
  "Compare SkinEthics Baner and Wakad",
  "Generate this month's report for Dr Sharma",
];
