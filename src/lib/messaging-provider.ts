// MessagingProvider abstraction (section 29). No real WhatsApp/SMS/Email
// provider is connected — this interface is the seam a real one (WhatsApp
// Business API, Twilio, SendGrid, etc.) would implement later without any
// call-site changes elsewhere in the app.
export type MessagingChannel = "whatsapp" | "sms" | "email" | "qr" | "link";
export type DeliveryStatus = "queued" | "sent" | "delivered" | "failed";

export interface MessagingProvider {
  name: string;
  sendMessage(to: string, body: string, channel: MessagingChannel): Promise<{ id: string; status: DeliveryStatus }>;
  getDeliveryStatus(messageId: string): Promise<DeliveryStatus>;
  handleIncoming(payload: unknown): void;
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
  async getDeliveryStatus(messageId) {
    debugLog("status check", messageId);
    return "delivered";
  },
  handleIncoming(payload) {
    debugLog("incoming", payload);
  },
  optOut(patientMasked) {
    debugLog("opt-out recorded", patientMasked);
  },
};
