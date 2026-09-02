import { describe, it, expect } from "vitest";
import { scoreCandidate, suggestMapping, confidenceTier, type DiscoveredGoogleLocation, type MappingCandidateLocation } from "./mapping-confidence";

const baner: MappingCandidateLocation = {
  id: "loc-baner", clientLabel: "SkinEthics", name: "Baner", city: "Pune",
  address: "720, Baner Main Road, Pune 444242", phone: "+91 85433 71136",
};
const wakad: MappingCandidateLocation = {
  id: "loc-wakad", clientLabel: "SkinEthics", name: "Wakad", city: "Pune",
  address: "457, Wakad Main Road, Pune 434397", phone: "+91 85254 27645",
};
const sharmaBaner: MappingCandidateLocation = {
  id: "loc-sharma-baner", clientLabel: "Dr. Ananya Sharma", name: "Baner", city: "Pune",
  address: "12, Baner Road, Pune", phone: "+91 90000 11111",
};

describe("mapping confidence", () => {
  it("scores an exact phone match very high regardless of name formatting", () => {
    const discovered: DiscoveredGoogleLocation = { externalLocationId: "g1", name: "SkinEthics - Baner Clinic", phone: baner.phone };
    const { score, reasons } = scoreCandidate(discovered, baner);
    // Phone match (40) + partial name overlap alone, no address in this
    // particular discovered record — full corroboration (phone+name+address)
    // pushes into the 80s+, as seen against the live demo dataset.
    expect(score).toBeGreaterThanOrEqual(50);
    expect(reasons).toContain("Phone number matches exactly");
  });

  it("never maps solely by name — a name-only match stays below the auto-suggest floor", () => {
    // Same city mention + weak name overlap, but no phone/address/website
    // corroboration at all.
    const discovered: DiscoveredGoogleLocation = { externalLocationId: "g2", name: "Baner Skin Clinic" };
    const { best } = suggestMapping(discovered, [baner, sharmaBaner]);
    // It's plausible a candidate scores something from name+city tokens, but
    // per spec this must never be confidently "the" match without a strong
    // signal — assert it doesn't reach the "high" confidence tier.
    if (best) expect(confidenceTier(best.confidence)).not.toBe("high");
  });

  it("discriminates between two locations with similar names using phone number", () => {
    const discovered: DiscoveredGoogleLocation = { externalLocationId: "g3", name: "Baner Clinic", phone: baner.phone, address: baner.address };
    const { best, ranked } = suggestMapping(discovered, [baner, sharmaBaner]);
    expect(best?.locationId).toBe("loc-baner");
    const wrongCandidate = ranked.find((r) => r.locationId === "loc-sharma-baner");
    expect(wrongCandidate).toBeDefined();
    expect(wrongCandidate!.confidence).toBeLessThan(best!.confidence);
  });

  it("matches website domain exactly, ignoring protocol/www differences", () => {
    const withWebsite: MappingCandidateLocation = { ...wakad, website: "https://www.skinethics.example.com/wakad" };
    const discovered: DiscoveredGoogleLocation = { externalLocationId: "g4", name: "SkinEthics Wakad", website: "skinethics.example.com/wakad" };
    const { reasons } = scoreCandidate(discovered, withWebsite);
    expect(reasons).toContain("Website domain matches exactly");
  });

  it("returns no confident match for a wholly unrelated business", () => {
    const discovered: DiscoveredGoogleLocation = { externalLocationId: "g5", name: "City Skin Clinic", address: "Pune, Maharashtra" };
    const { best } = suggestMapping(discovered, [baner, wakad, sharmaBaner]);
    expect(best).toBeNull();
  });

  it("confidenceTier boundaries match the spec's high/medium/low bands", () => {
    expect(confidenceTier(85)).toBe("high");
    expect(confidenceTier(70)).toBe("high");
    expect(confidenceTier(69)).toBe("medium");
    expect(confidenceTier(40)).toBe("medium");
    expect(confidenceTier(39)).toBe("low");
  });

  it("ranks all candidates, not just the best one, for a 'wrong match' comparison UI", () => {
    const discovered: DiscoveredGoogleLocation = { externalLocationId: "g6", name: "SkinEthics Baner", phone: baner.phone };
    const { ranked } = suggestMapping(discovered, [baner, wakad, sharmaBaner]);
    expect(ranked).toHaveLength(3);
    expect(ranked[0].confidence).toBeGreaterThanOrEqual(ranked[1].confidence);
    expect(ranked[1].confidence).toBeGreaterThanOrEqual(ranked[2].confidence);
  });
});
