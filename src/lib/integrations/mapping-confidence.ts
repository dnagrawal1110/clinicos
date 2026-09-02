// The Data Mapping Review confidence algorithm (Part 4/13). Real,
// fully-testable logic — it needs no live Google API to run, only a
// "discovered asset" shape (whatever a provider's discovery API returns)
// and the ClinicOS locations to compare against. Provider-neutral and
// data-source-neutral: callers pass plain candidate records, so this same
// function scores mock demo data and real Supabase rows identically.
//
// Explicit design constraint from the spec: never map by name alone. Phone
// and website are exact-match signals and dominate the score; name and
// address are fuzzy signals that refine among candidates that already
// plausibly match on the strong signals.
export interface DiscoveredGoogleLocation {
  externalLocationId: string;
  name: string;
  address?: string;
  phone?: string;
  website?: string;
}

export interface MappingCandidateLocation {
  id: string;
  clientLabel: string;
  name: string;
  city: string;
  address?: string;
  phone?: string;
  website?: string;
}

export interface MappingSuggestion {
  locationId: string;
  confidence: number; // 0-100
  reasons: string[];
}

function normalizePhone(phone: string): string {
  return phone.replace(/[^\d]/g, "").replace(/^91/, ""); // strip formatting + India country code
}

function normalizeDomain(url: string): string {
  return url.toLowerCase().replace(/^https?:\/\//, "").replace(/^www\./, "").replace(/\/.*$/, "");
}

function tokenize(text: string): Set<string> {
  return new Set(text.toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter((t) => t.length > 1));
}

// Jaccard token overlap — cheap, dependency-free, good enough for
// "SkinEthics Kothrud" vs "SkinEthics - Kothrud Clinic" style variance.
function tokenOverlapScore(a: string, b: string): number {
  const ta = tokenize(a);
  const tb = tokenize(b);
  if (ta.size === 0 || tb.size === 0) return 0;
  let intersection = 0;
  for (const t of ta) if (tb.has(t)) intersection += 1;
  const union = new Set([...ta, ...tb]).size;
  return union === 0 ? 0 : intersection / union;
}

export function scoreCandidate(discovered: DiscoveredGoogleLocation, location: MappingCandidateLocation): { score: number; reasons: string[] } {
  const locationLabel = `${location.clientLabel} ${location.name}`;

  let score = 0;
  const reasons: string[] = [];

  if (discovered.phone && location.phone) {
    if (normalizePhone(discovered.phone) === normalizePhone(location.phone)) {
      score += 40;
      reasons.push("Phone number matches exactly");
    }
  }

  if (discovered.website && location.website) {
    if (normalizeDomain(discovered.website) === normalizeDomain(location.website)) {
      score += 35;
      reasons.push("Website domain matches exactly");
    }
  }

  const nameScore = tokenOverlapScore(discovered.name, locationLabel);
  if (nameScore > 0) {
    score += Math.round(nameScore * 25);
    if (nameScore > 0.5) reasons.push(`Business name closely matches "${locationLabel}"`);
    else if (nameScore > 0.2) reasons.push(`Business name partially matches "${locationLabel}"`);
  }

  if (discovered.address) {
    const addressScore = tokenOverlapScore(discovered.address, `${location.address ?? ""} ${location.city}`);
    if (addressScore > 0) {
      score += Math.round(addressScore * 25);
      if (addressScore > 0.4) reasons.push("Address closely matches");
    }
  }

  if (discovered.name.toLowerCase().includes(location.city.toLowerCase())) {
    score += 10;
    reasons.push(`Mentions city "${location.city}"`);
  }

  return { score: Math.min(100, score), reasons };
}

// Ranks every candidate location and returns the best match (if any scored
// above a sane floor) plus the full ranked list for a "not this one?" UI.
export function suggestMapping(discovered: DiscoveredGoogleLocation, candidateLocations: MappingCandidateLocation[]): { best: MappingSuggestion | null; ranked: MappingSuggestion[] } {
  const ranked = candidateLocations
    .map((loc) => {
      const { score, reasons } = scoreCandidate(discovered, loc);
      return { locationId: loc.id, confidence: score, reasons };
    })
    .sort((a, b) => b.confidence - a.confidence);

  const best = ranked[0] && ranked[0].confidence >= 30 ? ranked[0] : null;
  return { best, ranked };
}

export function confidenceTier(confidence: number): "high" | "medium" | "low" {
  if (confidence >= 70) return "high";
  if (confidence >= 40) return "medium";
  return "low";
}
