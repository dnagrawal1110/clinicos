import type { MessageCategory, MessageTemplate } from "../types";

const seed = (id: string, name: string, category: MessageCategory, language: MessageTemplate["language"], trigger: string, channel: MessageTemplate["channel"], body: string, updatedAt: string): MessageTemplate => ({
  id, name, category, language, trigger, channel, body, status: "active", updatedAt,
});

// Centralized message library (section 25) — categorized by consultation
// stage, specialty, and language, reused across campaigns.
export const MESSAGE_TEMPLATES: MessageTemplate[] = [
  seed("msg-1", "Standard Consultation Follow-up", "Consultation", "en", "After consultation", "whatsapp",
    "Hi {{patient_name}}, thank you for visiting {{doctor_name}} at {{clinic_name}} ({{location}}). We'd love to hear about your experience: {{review_link}}", "2026-08-12"),
  seed("msg-2", "Post-Procedure Check-in", "Procedure", "en", "After procedure", "whatsapp",
    "Hi {{patient_name}}, we hope your recovery is going well after your visit to {{clinic_name}}. If you have a moment, please share your experience: {{review_link}}", "2026-08-18"),
  seed("msg-3", "Follow-up Visit Thank You", "Follow-up", "en", "After follow-up", "whatsapp",
    "Thank you for your follow-up visit with {{doctor_name}}, {{patient_name}}. Your feedback helps other patients at {{clinic_name}} — {{review_link}}", "2026-08-05"),
  seed("msg-4", "Dermatology Consultation (Hindi)", "Dermatology", "hi", "After consultation", "whatsapp",
    "नमस्ते {{patient_name}}, {{clinic_name}} ({{location}}) में डॉ. {{doctor_name}} से मिलने के लिए धन्यवाद। कृपया अपना अनुभव साझा करें: {{review_link}}", "2026-07-29"),
  seed("msg-5", "Dermatology Consultation (Marathi)", "Dermatology", "mr", "After consultation", "whatsapp",
    "नमस्कार {{patient_name}}, {{clinic_name}} ({{location}}) येथे डॉ. {{doctor_name}} यांना भेट दिल्याबद्दल धन्यवाद. कृपया आपला अनुभव शेअर करा: {{review_link}}", "2026-07-29"),
  seed("msg-6", "Dental Procedure Follow-up", "Dental", "en", "After procedure", "whatsapp",
    "Hi {{patient_name}}, thank you for trusting {{clinic_name}} with your dental care. We'd appreciate your feedback: {{review_link}}", "2026-08-02"),
  seed("msg-7", "Orthopedic Post-Visit SMS", "Orthopedic", "en", "After appointment", "sms",
    "{{clinic_name}}: Thank you for visiting, {{patient_name}}. Share your experience with {{doctor_name}}: {{review_link}}", "2026-06-21"),
  seed("msg-8", "General Practice Reminder", "General", "en", "Manual campaign", "sms",
    "Hi {{patient_name}}, a quick reminder to share your feedback about your recent visit to {{clinic_name}}: {{review_link}}", "2026-06-14"),
  seed("msg-9", "Reception QR Prompt", "General", "en", "Manual campaign", "qr",
    "Scan to share your experience at {{clinic_name}}, {{location}}.", "2026-05-30"),
  seed("msg-10", "Consultation Follow-up (Email)", "Consultation", "en", "After consultation", "email",
    "Dear {{patient_name}}, thank you for visiting {{doctor_name}} at {{clinic_name}}. We would be grateful if you could share your experience here: {{review_link}}", "2026-08-20"),
  seed("msg-11", "Procedure Follow-up (Hindi)", "Procedure", "hi", "After procedure", "whatsapp",
    "नमस्ते {{patient_name}}, {{clinic_name}} में आपकी प्रक्रिया के बाद कैसा महसूस हो रहा है? कृपया अपना अनुभव साझा करें: {{review_link}}", "2026-07-11"),
  seed("msg-12", "Loyalty / Repeat Patient Flow", "General", "en", "After appointment", "whatsapp",
    "Hi {{patient_name}}, thank you for continuing to choose {{clinic_name}} for your care. A quick review would mean a lot: {{review_link}}", "2026-08-27"),
];

export function templatesByCategory(category: MessageCategory): MessageTemplate[] {
  return MESSAGE_TEMPLATES.filter((t) => t.category === category);
}

export const MESSAGE_CATEGORIES: MessageCategory[] = ["Consultation", "Follow-up", "Procedure", "Dental", "Dermatology", "Orthopedic", "General"];

// AI Message Generator (section 26) — conservative, non-prescriptive drafting.
// Never invents outcomes or makes claims; it only assembles a short, polite
// request using the inputs given.
export function generateMessageDraft(opts: { doctorName: string; clinicName: string; trigger: string; tone: "friendly" | "formal" | "concise"; language: MessageTemplate["language"] }): string {
  const closings: Record<typeof opts.tone, string> = {
    friendly: "We'd really appreciate hearing about your experience",
    formal: "We would be grateful if you could share your feedback",
    concise: "Please share your feedback",
  };
  if (opts.language === "hi") {
    return `नमस्ते {{patient_name}}, ${opts.clinicName} में डॉ. ${opts.doctorName} से मिलने के लिए धन्यवाद। कृपया अपना अनुभव साझा करें: {{review_link}}`;
  }
  if (opts.language === "mr") {
    return `नमस्कार {{patient_name}}, ${opts.clinicName} येथे डॉ. ${opts.doctorName} यांना भेट दिल्याबद्दल धन्यवाद. कृपया आपला अनुभव शेअर करा: {{review_link}}`;
  }
  return `Hi {{patient_name}}, thank you for visiting Dr. ${opts.doctorName} at ${opts.clinicName}. ${closings[opts.tone]}: {{review_link}}`;
}
