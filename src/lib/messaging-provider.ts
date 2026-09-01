// MessagingProvider abstraction (section 23). No real WhatsApp/SMS/Email
// provider is connected — this interface is the seam a real one (WhatsApp
// Business Platform, Twilio, SendGrid, etc.) would implement later without
// any call-site changes elsewhere in the app. Method names match the spec
// exactly (sendMessage/getMessageStatus/handleWebhook/validateNumber/optOut).
export type MessagingChannel = "whatsapp" | "sms" | "email" | "qr" | "link";
export type DeliveryStatus = "queued" | "sent" | "delivered" | "read" | "failed";

// Mirrors the `messages` table (section 24) — this is the shape a provider
// call site persists after sendMessage()/handleWebhook() update its status.
export interface MessageDeliveryRecord {
  id: string;
  provider: string;
  channel: MessagingChannel;
  recipientMasked: string;
  templateName?: string;
  variables?: Record<string, string>;
  status: DeliveryStatus;
  providerMessageId?: string;
  sentAt?: string;
  deliveredAt?: string;
  readAt?: string;
  failedAt?: string;
  errorCode?: string;
}

export interface MessagingProvider {
  name: string;
  sendMessage(to: string, body: string, channel: MessagingChannel): Promise<{ id: string; status: DeliveryStatus }>;
  getMessageStatus(messageId: string): Promise<DeliveryStatus>;
  // Webhook payload shape is provider-specific — validated/normalized by
  // the caller before this is invoked. Must be idempotent (section 25):
  // the same delivery/read/failed event replayed twice must not re-fire
  // side effects. See src/lib/idempotency.ts for the shared guard.
  handleWebhook(payload: unknown): void;
  validateNumber(phone: string): boolean;
  optOut(patientMasked: string): void;
}

function debugLog(...args: unknown[]) {
  if (process.env.NODE_ENV !== "production") console.debug("[messaging:mock]", ...args);
}

let seq = 0;
export const mockMessagingProvider: MessagingProvider = {
  name: "Mock Messaging Provider (no real channel connected)",
  async sendMessage(to, body, channel) {
    seq += 1;
    debugLog("send", { to, body, channel });
    return { id: `mock-msg-${seq}`, status: "sent" };
  },
  async getMessageStatus(messageId) {
    debugLog("status check", messageId);
    return "delivered";
  },
  handleWebhook(payload) {
    debugLog("webhook", payload);
  },
  validateNumber(phone) {
    // Loose E.164-ish check — real validation belongs to the provider.
    return /^\+?[1-9]\d{7,14}$/.test(phone.replace(/[\s-]/g, ""));
  },
  optOut(patientMasked) {
    debugLog("opt-out recorded", patientMasked);
  },
};
