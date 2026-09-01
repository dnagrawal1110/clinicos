// Simulated Google Business Profile discovery results (Demo Workspace
// only) — stands in for what the real Google Business Information API
// would return after OAuth + "list accessible accounts/locations". Fields
// deliberately include realistic real-world messiness (slightly different
// name formatting, suite numbers, a truncated phone) so the confidence
// algorithm in mapping-confidence.ts has something non-trivial to score,
// and one entry is a genuinely ambiguous/no-good-match case to prove low
// confidence surfaces honestly instead of forcing a guess.
import { skinEthics, drSharma } from "@/lib/mock/clients";
import type { DiscoveredGoogleLocation } from "./mapping-confidence";

export function getMockDiscoveredLocations(): DiscoveredGoogleLocation[] {
  const [baner, wakad, kothrud] = skinEthics.locations;
  const [sharmaBaner] = drSharma.locations;

  return [
    {
      externalLocationId: "accounts/1/locations/101",
      name: "SkinEthics - Baner Clinic",
      address: `${baner.address}`,
      phone: baner.phone,
      website: "skinethics.example.com/baner",
    },
    {
      externalLocationId: "accounts/1/locations/102",
      name: "SkinEthics Wakad",
      address: `${wakad.address}, near main signal`,
      phone: wakad.phone,
    },
    {
      externalLocationId: "accounts/1/locations/103",
      name: "SkinEthics Skin & Hair Clinic, Kothrud",
      address: kothrud.address,
      phone: kothrud.phone.replace(/\s/g, ""),
      website: "skinethics.example.com",
    },
    {
      externalLocationId: "accounts/2/locations/201",
      name: "Dr. Ananya Sharma Dermatology Clinic",
      address: sharmaBaner.address,
      phone: sharmaBaner.phone,
    },
    // Deliberately ambiguous — a generic name/address that shouldn't
    // confidently match anything, to prove the review queue surfaces low
    // confidence instead of a false-positive suggestion.
    {
      externalLocationId: "accounts/3/locations/301",
      name: "City Skin Clinic",
      address: "Pune, Maharashtra",
    },
  ];
}
