// Typed analytics event abstraction. No real analytics provider is wired up —
// this exists so a real one (Segment, PostHog, GA4, etc.) can be plugged in
// later without touching call sites.
import type { ReviewFlowEvent, ReviewFlowEventName } from "./types";

type Listener = (event: ReviewFlowEvent) => void;
const listeners = new Set<Listener>();

export function track(
  name: ReviewFlowEventName,
  opts?: { locationId?: string; campaignId?: string; properties?: ReviewFlowEvent["properties"] }
) {
  const event: ReviewFlowEvent = {
    name,
    locationId: opts?.locationId,
    campaignId: opts?.campaignId,
    properties: opts?.properties,
    timestamp: new Date().toISOString(),
  };
  if (process.env.NODE_ENV !== "production") {
    console.debug("[ReviewFlow event]", event.name, event);
  }
  listeners.forEach((l) => l(event));
}

export function onReviewFlowEvent(cb: Listener): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}
