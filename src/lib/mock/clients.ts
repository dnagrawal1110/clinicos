import type { Client, Location, ModuleScores, Doctor, ServiceKey } from "../types";
import { SERVICE_CATALOG } from "../types";
import { rngFor, pick, pickMany, randInt, randFloat } from "./rng";
import {
  DOCTOR_FIRST_NAMES, DOCTOR_LAST_NAMES, SPECIALTIES, STANDALONE_BRANDS,
  CITY_AREAS, CITIES, ACCOUNT_MANAGERS, SERVICE_POOL,
} from "./pools";

function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

function servicesFor(specialty: string): number {
  return (SERVICE_POOL[specialty] ?? SERVICE_POOL["Multi-Specialty"]).length + randInt(rngFor(specialty), 0, 6);
}

const HOURS_OPTIONS = ["Mon–Sat, 10:00 AM – 8:00 PM", "Mon–Sat, 9:30 AM – 7:30 PM", "Mon–Sun, 11:00 AM – 9:00 PM", "Tue–Sun, 10:00 AM – 6:00 PM"];

interface LocationSeed {
  name: string;
  city: string;
  rating: number;
  reviewCount: number;
  reviewsThisMonth: number;
  reviewDelta30d: number;
  scores: ModuleScores;
  googleConnected?: boolean;
  hasAds?: boolean;
  leadsThisMonth?: number;
  adSpendThisMonth?: number;
  status?: Location["status"];
}

function buildLocation(clientId: string, specialty: string, seed: LocationSeed): Location {
  const rng = rngFor(`${clientId}-${seed.name}-loc`);
  const healthOverall = Math.round(
    (seed.scores.google * 0.22 + seed.scores.reputation * 0.18 + seed.scores.website * 0.16 +
      seed.scores.content * 0.12 + seed.scores.social * 0.12 + seed.scores.ads * 0.1 + seed.scores.leads * 0.1)
  );
  const lastActivityDays = seed.scores.content < 50 ? randInt(rng, 12, 26) : randInt(rng, 0, 6);
  return {
    id: `${clientId}__${slugify(seed.name)}`,
    clientId,
    doctorIds: [],
    slug: `${clientId}-${slugify(seed.name)}`,
    name: seed.name,
    city: seed.city,
    address: `${randInt(rng, 1, 999)}, ${seed.name} Main Road, ${seed.city} ${randInt(rng, 400001, 452001)}`,
    phone: `+91 ${randInt(rng, 70000, 99999)} ${randInt(rng, 10000, 99999)}`,
    hours: pick(rng, HOURS_OPTIONS),
    status: seed.status ?? "active",
    googleConnected: seed.googleConnected ?? true,
    rating: seed.rating,
    reviewCount: seed.reviewCount,
    reviewsThisMonth: seed.reviewsThisMonth,
    reviewDelta30d: seed.reviewDelta30d,
    scores: seed.scores,
    healthOverall,
    services: servicesFor(specialty),
    photos: randInt(rng, 40, 220),
    postsActive: rng() > 0.25,
    leadsThisMonth: seed.leadsThisMonth ?? randInt(rng, 20, 140),
    adSpendThisMonth: seed.adSpendThisMonth ?? 0,
    hasAds: seed.hasAds ?? false,
    lastActivity: new Date(2026, 7, 31 - lastActivityDays).toISOString(),
  };
}

// Assigns doctors to a set of already-built locations, mutating each location's doctorIds.
function assignDoctors(clientId: string, locations: Location[], specialty: string, explicit?: { name: string; locationNames: string[] }[]): Doctor[] {
  if (explicit && explicit.length) {
    return explicit.map((d, i) => {
      const locIds = locations.filter((l) => d.locationNames.includes(l.name)).map((l) => l.id);
      const doctor: Doctor = { id: `${clientId}__doc-${i}`, clientId, name: d.name, specialty, locationIds: locIds };
      locIds.forEach((locId) => {
        const loc = locations.find((l) => l.id === locId)!;
        loc.doctorIds.push(doctor.id);
      });
      return doctor;
    });
  }

  const rng = rngFor(clientId + "-doctors");
  const doctorCount = locations.length <= 1 ? 1 : locations.length <= 2 ? randInt(rng, 1, 2) : Math.min(locations.length, randInt(rng, 2, 4));
  const names = pickMany(rng, DOCTOR_FIRST_NAMES, doctorCount).map((first) => `Dr. ${first} ${pick(rng, DOCTOR_LAST_NAMES)}`);
  const doctors: Doctor[] = names.map((name, i) => ({ id: `${clientId}__doc-${i}`, clientId, name, specialty, locationIds: [] }));

  locations.forEach((loc, i) => {
    const primary = doctors[i % doctors.length];
    primary.locationIds.push(loc.id);
    loc.doctorIds.push(primary.id);
    if (doctors.length > 1 && rng() > 0.8) {
      const visiting = doctors[(i + 1) % doctors.length];
      if (!loc.doctorIds.includes(visiting.id)) {
        visiting.locationIds.push(loc.id);
        loc.doctorIds.push(visiting.id);
      }
    }
  });

  return doctors;
}

function activeServicesFor(clientId: string, healthOverall: number, hasAds: boolean): ServiceKey[] {
  const rng = rngFor(clientId + "-services");
  const core: ServiceKey[] = ["Google Profile Management", "Reputation Management"];
  const pool: ServiceKey[] = ["Website SEO", "Instagram Management", "Facebook Management", "WhatsApp CRM"];
  const adsServices: ServiceKey[] = hasAds ? (rng() > 0.4 ? ["Meta Ads", "Google Ads"] : [pick(rng, ["Meta Ads", "Google Ads"] as ServiceKey[])]) : [];
  const extra = pool.filter(() => rng() > (healthOverall > 70 ? 0.35 : 0.55));
  const devOptIn = rng() > 0.85 ? (["Website Development"] as ServiceKey[]) : [];
  return [...core, ...extra, ...adsServices, ...devOptIn];
}

function aggregate(clientId: string, name: string, brand: string | undefined, specialty: string, city: string, status: Client["status"], accountManager: string, locations: Location[], createdAt: string, explicitDoctors?: { name: string; locationNames: string[] }[]): Client {
  const avg = (key: keyof ModuleScores) => Math.round(locations.reduce((a, l) => a + l.scores[key], 0) / locations.length);
  const scores: ModuleScores = {
    google: avg("google"), reputation: avg("reputation"), website: avg("website"),
    content: avg("content"), social: avg("social"), ads: avg("ads"), leads: avg("leads"),
  };
  const healthOverall = Math.round(locations.reduce((a, l) => a + l.healthOverall, 0) / locations.length);
  const rng = rngFor(clientId + "-agg");
  const doctors = assignDoctors(clientId, locations, specialty, explicitDoctors);
  return {
    id: clientId,
    name,
    brand,
    specialty,
    city,
    status,
    accountManager,
    doctors,
    locations,
    activeServices: activeServicesFor(clientId, healthOverall, locations.some((l) => l.hasAds)),
    scores,
    healthOverall,
    healthTrend: randInt(rng, -4, 12),
    reviewsTotal: locations.reduce((a, l) => a + l.reviewCount, 0),
    ratingAvg: Math.round((locations.reduce((a, l) => a + l.rating, 0) / locations.length) * 10) / 10,
    leadsTotal: locations.reduce((a, l) => a + l.leadsThisMonth, 0),
    appointmentsTotal: Math.round(locations.reduce((a, l) => a + l.leadsThisMonth, 0) * randFloat(rng, 0.35, 0.55)),
    adSpendTotal: locations.reduce((a, l) => a + l.adSpendThisMonth, 0),
    websiteHealth: scores.website,
    createdAt,
  };
}

// ---------------------------------------------------------------------------
// Hero clients — hand-authored, deeply detailed. Used across drill-down screens.
// ---------------------------------------------------------------------------

export const drSharma = aggregate(
  "dr-ananya-sharma", "Dr. Ananya Sharma", undefined, "Dermatology", "Pune", "active", "Ritika Deshmukh",
  [
    buildLocation("dr-ananya-sharma", "Dermatology", { name: "Baner", city: "Pune", rating: 4.7, reviewCount: 598, reviewsThisMonth: 64, reviewDelta30d: 12, scores: { google: 89, reputation: 87, website: 76, content: 79, social: 82, ads: 58, leads: 74 }, hasAds: true, adSpendThisMonth: 42000, leadsThisMonth: 118 }),
    buildLocation("dr-ananya-sharma", "Dermatology", { name: "Wakad", city: "Pune", rating: 4.6, reviewCount: 469, reviewsThisMonth: 52, reviewDelta30d: 7, scores: { google: 85, reputation: 82, website: 72, content: 75, social: 78, ads: 55, leads: 69 }, hasAds: true, adSpendThisMonth: 31000, leadsThisMonth: 94 }),
    buildLocation("dr-ananya-sharma", "Dermatology", { name: "Kothrud", city: "Pune", rating: 4.4, reviewCount: 258, reviewsThisMonth: 16, reviewDelta30d: -45, scores: { google: 78, reputation: 61, website: 68, content: 41, social: 73, ads: 0, leads: 55 }, hasAds: false, leadsThisMonth: 41 }),
    buildLocation("dr-ananya-sharma", "Dermatology", { name: "Mumbai", city: "Mumbai", rating: 4.5, reviewCount: 214, reviewsThisMonth: 19, reviewDelta30d: -18, scores: { google: 92, reputation: 82, website: 79, content: 61, social: 88, ads: 66, leads: 76 }, hasAds: true, adSpendThisMonth: 38000, leadsThisMonth: 68 }),
  ],
  "2023-02-14",
  [{ name: "Dr. Ananya Sharma", locationNames: ["Baner", "Wakad", "Kothrud", "Mumbai"] }]
);

// Canonical ReviewFlow demo client — numbers below are the fixture used
// throughout the ReviewFlow test scenario (kept exact per spec).
export const skinEthics = aggregate(
  "skinethics", "SkinEthics", undefined, "Dermatology", "Pune", "active", "Neha Joshi",
  [
    buildLocation("skinethics", "Dermatology", { name: "Baner", city: "Pune", rating: 4.8, reviewCount: 821, reviewsThisMonth: 82, reviewDelta30d: 21, scores: { google: 95, reputation: 93, website: 85, content: 88, social: 92, ads: 87, leads: 82 }, hasAds: true, adSpendThisMonth: 61000, leadsThisMonth: 162 }),
    buildLocation("skinethics", "Dermatology", { name: "Wakad", city: "Pune", rating: 4.7, reviewCount: 612, reviewsThisMonth: 71, reviewDelta30d: 11, scores: { google: 93, reputation: 88, website: 81, content: 84, social: 90, ads: 84, leads: 80 }, hasAds: true, adSpendThisMonth: 52000, leadsThisMonth: 131 }),
    buildLocation("skinethics", "Dermatology", { name: "Kothrud", city: "Pune", rating: 4.6, reviewCount: 341, reviewsThisMonth: 24, reviewDelta30d: -38, scores: { google: 62, reputation: 58, website: 71, content: 44, social: 74, ads: 81, leads: 73 }, hasAds: true, adSpendThisMonth: 44000, leadsThisMonth: 87 }),
  ],
  "2022-08-01",
  [
    { name: "Dr. Pallavi Ahire-Shelke", locationNames: ["Baner", "Wakad", "Kothrud"] },
  ]
);

export const abcDental = aggregate(
  "abc-dental", "ABC Dental", "ABC Dental Studio", "Dentistry", "Pune", "at-risk", "Aman Kulkarni",
  [
    buildLocation("abc-dental", "Dentistry", { name: "Baner", city: "Pune", rating: 4.2, reviewCount: 318, reviewsThisMonth: 11, reviewDelta30d: -41, scores: { google: 66, reputation: 55, website: 74, content: 39, social: 71, ads: 0, leads: 49 }, hasAds: false, leadsThisMonth: 22 }),
    buildLocation("abc-dental", "Dentistry", { name: "Hinjewadi", city: "Pune", rating: 4.0, reviewCount: 176, reviewsThisMonth: 6, reviewDelta30d: -52, scores: { google: 60, reputation: 61, website: 68, content: 33, social: 77, ads: 0, leads: 55 }, hasAds: false, leadsThisMonth: 18 }),
  ],
  "2021-11-20",
  [
    { name: "Dr. Abhinav Rao", locationNames: ["Baner"] },
    { name: "Dr. Sneha Iyer", locationNames: ["Hinjewadi"] },
  ]
);

export const drMehta = aggregate(
  "dr-rahul-mehta", "Dr. Rahul Mehta", undefined, "Orthopedics", "Pune", "active", "Suhas Patil",
  [
    buildLocation("dr-rahul-mehta", "Orthopedics", { name: "Pune", city: "Pune", rating: 4.6, reviewCount: 528, reviewsThisMonth: 41, reviewDelta30d: 6, scores: { google: 84, reputation: 79, website: 76, content: 70, social: 68, ads: 72, leads: 74 }, hasAds: true, adSpendThisMonth: 36000, leadsThisMonth: 88 }),
    buildLocation("dr-rahul-mehta", "Orthopedics", { name: "Mumbai", city: "Mumbai", rating: 4.4, reviewCount: 289, reviewsThisMonth: 14, reviewDelta30d: -29, scores: { google: 79, reputation: 63, website: 76, content: 52, social: 65, ads: 69, leads: 61 }, hasAds: true, adSpendThisMonth: 27000, leadsThisMonth: 52 }),
  ],
  "2023-05-09",
  [{ name: "Dr. Rahul Mehta", locationNames: ["Pune", "Mumbai"] }]
);

export const drKapoor = aggregate(
  "dr-priya-kapoor", "Dr. Priya Kapoor", "TrueSmile Orthodontics", "Orthodontics", "Bengaluru", "active", "Meera Nair",
  [
    buildLocation("dr-priya-kapoor", "Orthodontics", { name: "Indiranagar", city: "Bengaluru", rating: 4.9, reviewCount: 967, reviewsThisMonth: 88, reviewDelta30d: 24, scores: { google: 96, reputation: 94, website: 88, content: 85, social: 91, ads: 0, leads: 84 }, hasAds: false, leadsThisMonth: 143 }),
    buildLocation("dr-priya-kapoor", "Orthodontics", { name: "Koramangala", city: "Bengaluru", rating: 4.8, reviewCount: 703, reviewsThisMonth: 61, reviewDelta30d: 17, scores: { google: 94, reputation: 91, website: 86, content: 80, social: 89, ads: 0, leads: 81 }, hasAds: false, leadsThisMonth: 119 }),
    buildLocation("dr-priya-kapoor", "Orthodontics", { name: "Whitefield", city: "Bengaluru", rating: 4.7, reviewCount: 412, reviewsThisMonth: 47, reviewDelta30d: 19, scores: { google: 90, reputation: 87, website: 82, content: 75, social: 85, ads: 0, leads: 77 }, hasAds: false, leadsThisMonth: 96 }),
  ],
  "2022-01-17",
  [{ name: "Dr. Priya Kapoor", locationNames: ["Indiranagar", "Koramangala", "Whitefield"] }]
);

export const carePoint = aggregate(
  "carepoint", "CarePoint Multispeciality", undefined, "Multi-Specialty", "Hyderabad", "onboarding", "Vikas Rao",
  [
    buildLocation("carepoint", "Multi-Specialty", { name: "Gachibowli", city: "Hyderabad", rating: 4.3, reviewCount: 58, reviewsThisMonth: 9, reviewDelta30d: 4, scores: { google: 41, reputation: 52, website: 38, content: 24, social: 29, ads: 0, leads: 22 }, hasAds: false, leadsThisMonth: 14, googleConnected: true, status: "onboarding" }),
  ],
  "2026-07-30",
  [{ name: "Dr. Vikram Nair", locationNames: ["Gachibowli"] }]
);

export const HERO_CLIENTS: Client[] = [drSharma, skinEthics, abcDental, drMehta, drKapoor, carePoint];

// ---------------------------------------------------------------------------
// Bulk-generated clients — for portfolio scale (All Clients table, KPI totals)
// ---------------------------------------------------------------------------

function generateBulkClient(index: number): Client {
  const rng = rngFor(`bulk-client-${index}`);
  const specialty = pick(rng, SPECIALTIES);
  const city = pick(rng, CITIES);
  const useDoctorName = rng() > 0.4;
  const first = pick(rng, DOCTOR_FIRST_NAMES);
  const last = pick(rng, DOCTOR_LAST_NAMES);
  const name = useDoctorName ? `Dr. ${first} ${last}` : pick(rng, STANDALONE_BRANDS) + (rng() > 0.7 ? ` ${pick(rng, CITY_AREAS[city])}` : "");
  const id = `${slugify(name)}-${index}`;
  const locationCount = pick(rng, [1, 2, 2, 3, 3, 3, 4, 4, 4]);
  const areas = pickMany(rng, CITY_AREAS[city], Math.min(locationCount, CITY_AREAS[city].length));
  const statusRoll = rng();
  const status: Client["status"] = statusRoll > 0.94 ? "onboarding" : statusRoll > 0.86 ? "at-risk" : statusRoll > 0.83 ? "paused" : "active";
  const baseHealth = randInt(rng, 54, 95);

  const locations: Location[] = areas.map((area, i) => {
    const lrng = rngFor(`bulk-loc-${index}-${i}`);
    const drift = randInt(lrng, -12, 12);
    const g = Math.min(99, Math.max(20, baseHealth + drift));
    const rep = Math.min(99, Math.max(15, baseHealth + randInt(lrng, -16, 10)));
    const web = Math.min(99, Math.max(20, baseHealth + randInt(lrng, -10, 8)));
    const cnt = Math.min(99, Math.max(10, baseHealth + randInt(lrng, -22, 8)));
    const soc = Math.min(99, Math.max(10, baseHealth + randInt(lrng, -20, 8)));
    const hasAds = lrng() > 0.32;
    const ads = hasAds ? Math.min(99, Math.max(15, baseHealth + randInt(lrng, -18, 12))) : 0;
    const leads = Math.min(99, Math.max(15, baseHealth + randInt(lrng, -14, 10)));
    const connected = lrng() > 0.08;
    return buildLocation(id, specialty, {
      name: area,
      city,
      rating: randFloat(lrng, 3.6, 5.0, 1),
      reviewCount: randInt(lrng, 24, 1400),
      reviewsThisMonth: randInt(lrng, 2, 110),
      reviewDelta30d: randInt(lrng, -55, 40),
      scores: { google: g, reputation: rep, website: web, content: cnt, social: soc, ads, leads },
      googleConnected: connected,
      hasAds,
      adSpendThisMonth: hasAds ? randInt(lrng, 8000, 95000) : 0,
      leadsThisMonth: randInt(lrng, 5, 180),
    });
  });

  const createdYear = pick(rng, [2021, 2022, 2022, 2023, 2023, 2024, 2025]);
  const createdMonth = String(randInt(rng, 1, 12)).padStart(2, "0");
  const createdDay = String(randInt(rng, 1, 28)).padStart(2, "0");

  return aggregate(
    id, name, undefined, specialty, city, status, pick(rng, ACCOUNT_MANAGERS).name,
    locations, `${createdYear}-${createdMonth}-${createdDay}`
  );
}

const BULK_COUNT = 95;
export const BULK_CLIENTS: Client[] = Array.from({ length: BULK_COUNT }, (_, i) => generateBulkClient(i));

export const ALL_CLIENTS: Client[] = [...HERO_CLIENTS, ...BULK_CLIENTS];

export function getClient(id: string): Client | undefined {
  return ALL_CLIENTS.find((c) => c.id === id);
}

export function getLocation(id: string): Location | undefined {
  for (const c of ALL_CLIENTS) {
    const loc = c.locations.find((l) => l.id === id);
    if (loc) return loc;
  }
  return undefined;
}

export function getLocationBySlug(slug: string): Location | undefined {
  for (const c of ALL_CLIENTS) {
    const loc = c.locations.find((l) => l.slug === slug);
    if (loc) return loc;
  }
  return undefined;
}

export function getDoctor(id: string) {
  for (const c of ALL_CLIENTS) {
    const doc = c.doctors.find((d) => d.id === id);
    if (doc) return doc;
  }
  return undefined;
}

export function allLocations(): Location[] {
  return ALL_CLIENTS.flatMap((c) => c.locations);
}

export function allDoctors() {
  return ALL_CLIENTS.flatMap((c) => c.doctors);
}

export function serviceCatalog(): typeof SERVICE_CATALOG {
  return SERVICE_CATALOG;
}
