import type { GoogleReviewItem } from "../types";
import { rngFor, pick, randInt } from "./rng";
import { allLocations, getClient } from "./clients";

const REVIEWER_NAMES = ["Rohan K.", "Priya S.", "Ananya M.", "Kunal B.", "Sneha R.", "Arjun P.", "Divya K.", "Sameer K.", "Ritu A.", "Varun D.", "Ishaan G.", "Pooja R.", "Neha T.", "Aarav J.", "Meera N."];

const POSITIVE_REVIEWS = [
  "Excellent experience! The doctor was thorough and explained every step of the treatment.",
  "Very professional clinic, clean and well organized. Highly recommend.",
  "Staff was courteous and the consultation felt unrushed. Great results so far.",
  "One of the best clinics I've visited — friendly staff and skilled doctor.",
];
const NEUTRAL_REVIEWS = [
  "Decent experience overall. Consultation was fine, nothing exceptional.",
  "Doctor was helpful, though the clinic could improve on ambience.",
];
const NEGATIVE_REVIEWS = [
  "Waited almost an hour past my appointment time, which was frustrating.",
  "Doctor was good but front desk communication needs improvement.",
  "Had to follow up multiple times to get my reports.",
];

function reviewFor(rating: number, rng: () => number): string {
  if (rating >= 4) return pick(rng, POSITIVE_REVIEWS);
  if (rating === 3) return pick(rng, NEUTRAL_REVIEWS);
  return pick(rng, NEGATIVE_REVIEWS);
}

function generate(): GoogleReviewItem[] {
  const locations = allLocations().filter((l) => l.reviewCount > 20);
  const items: GoogleReviewItem[] = [];
  let n = 0;
  for (const loc of locations) {
    const rng = rngFor(`gr-${loc.id}`);
    const count = Math.max(3, Math.min(45, Math.round(loc.reviewCount / 18)));
    for (let i = 0; i < count; i++) {
      n += 1;
      const ratingRoll = rng();
      const rating = loc.reviewDelta30d < -20
        ? (ratingRoll > 0.55 ? randInt(rng, 1, 3) : randInt(rng, 4, 5))
        : (ratingRoll > 0.82 ? randInt(rng, 2, 3) : randInt(rng, 4, 5));
      const sentiment: GoogleReviewItem["sentiment"] = rating >= 4 ? "positive" : rating === 3 ? "neutral" : "negative";
      const statusRoll = rng();
      const responseStatus: GoogleReviewItem["responseStatus"] = statusRoll > 0.6 ? "responded" : statusRoll > 0.3 ? "drafted" : "pending";
      items.push({
        id: `gr-${n}`,
        clientId: loc.clientId,
        locationId: loc.id,
        reviewer: pick(rng, REVIEWER_NAMES),
        rating,
        text: reviewFor(rating, rng),
        date: new Date(Date.now() - randInt(rng, 0, 45) * 86400000).toISOString(),
        responseStatus,
        sentiment,
        publishedResponse: responseStatus === "responded" ? "Thank you so much for your feedback — we're glad you had a great experience with us!" : undefined,
      });
    }
  }
  return items.sort((a, b) => +new Date(b.date) - +new Date(a.date));
}

export const GOOGLE_REVIEWS: GoogleReviewItem[] = generate();

const RESPONSE_OPENERS = {
  positive: ["Thank you so much for the wonderful feedback", "We're so glad to hear this", "Thank you for taking the time to share this"],
  neutral: ["Thank you for your feedback", "We appreciate you sharing your experience"],
  negative: ["Thank you for letting us know, and we're sorry to hear about this", "We appreciate your honest feedback and apologize for the inconvenience"],
};

export function generateAIResponseDraft(review: GoogleReviewItem): string {
  const opener = pick(rngFor(review.id + "-resp"), RESPONSE_OPENERS[review.sentiment]);
  if (review.sentiment === "positive") {
    return `${opener}, ${review.reviewer.split(" ")[0]}! We're delighted the visit went well and look forward to welcoming you back.`;
  }
  if (review.sentiment === "neutral") {
    return `${opener}, ${review.reviewer.split(" ")[0]}. We'd love to hear more about how we can make your next visit even better.`;
  }
  return `${opener}, ${review.reviewer.split(" ")[0]}. We'd like to make this right — please reach out to our clinic team directly so we can address this promptly.`;
}

export function getReviewsForLocation(locationId: string) {
  return GOOGLE_REVIEWS.filter((r) => r.locationId === locationId);
}

export function clientName(clientId: string): string {
  return getClient(clientId)?.name ?? clientId;
}

