// Webhook-ready architecture (section 30/7). No real webhook receiver/sender
// is wired up — this is the typed event surface a future integration
// (clinic PMS, invoicing system, WhatsApp provider) would emit into or
// consume from. `emitWebhook` is a no-op logger standing in for a real
// dispatcher so call sites don't need to change when one exists.
export type WebhookEventName =
  | "appointment.completed"
  | "treatment.completed"
  | "followup.completed"
  | "invoice.paid"
  | "patient.eligible"
  | "review.request.created"
  | "message.delivered"
  | "reviewflow.opened"
  | "feedback.submitted"
  | "review.completed"
  | "review.failed"
  | "patient.opted_out";

export interface WebhookEvent<T = Record<string, unknown>> {
  name: WebhookEventName;
  occurredAt: string;
  locationId?: string;
  campaignId?: string;
  payload: T;
}

export type AutomationTriggerCondition =
  | "Appointment completed" | "Treatment completed" | "Follow-up completed"
  | "Invoice paid" | "Patient marked eligible" | "Manual trigger"
  | "Webhook trigger" | "Import trigger";

export const AUTOMATION_TRIGGER_CONDITIONS: AutomationTriggerCondition[] = [
  "Appointment completed", "Treatment completed", "Follow-up completed",
  "Invoice paid", "Patient marked eligible", "Manual trigger",
  "Webhook trigger", "Import trigger",
];

export function emitWebhook<T>(event: WebhookEvent<T>) {
  if (process.env.NODE_ENV !== "production") {
    console.debug("[webhook:mock]", event.name, event);
  }
}
