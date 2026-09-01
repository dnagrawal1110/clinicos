import { Phone, Check } from "lucide-react";

export interface MessageVariables {
  patientName: string;
  doctorName: string;
  clinicName: string;
  location: string;
  reviewLink: string;
}

export function renderMessageTemplate(template: string, vars: MessageVariables): string {
  return template
    .replace(/\{\{patient_name\}\}/g, vars.patientName)
    .replace(/\{\{doctor_name\}\}/g, vars.doctorName)
    .replace(/\{\{clinic_name\}\}/g, vars.clinicName)
    .replace(/\{\{location\}\}/g, vars.location)
    .replace(/\{\{review_link\}\}/g, vars.reviewLink);
}

export const DEFAULT_MESSAGE_TEMPLATE =
  "Hi {{patient_name}}, thank you for visiting {{doctor_name}} at {{clinic_name}}.\nWe'd love to hear about your experience.\nIt takes less than a minute.\n{{review_link}}";

export function WhatsAppPreview({ message }: { message: string }) {
  const time = new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
  return (
    <div className="mx-auto w-full max-w-[300px] overflow-hidden rounded-[20px] border border-[var(--color-border)] bg-[#e5ddd5] shadow-[var(--shadow-sm)]">
      <div className="flex items-center gap-2 bg-[#075e54] px-3 py-2.5">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20 text-[13px] font-semibold text-white">
          <Phone className="h-4 w-4" />
        </div>
        <div className="text-[13px] font-medium text-white">ClinicOS Reminders</div>
      </div>
      <div className="min-h-[140px] px-3 py-4">
        <div className="ml-auto max-w-[85%] rounded-[10px] rounded-tr-none bg-[#dcf8c6] px-3 py-2 text-[12.5px] leading-relaxed text-[#111] shadow-sm">
          <p className="whitespace-pre-line">{message}</p>
          <div className="mt-1 flex items-center justify-end gap-1 text-[10px] text-[#5f7a68]">
            {time} <Check className="h-3 w-3" />
          </div>
        </div>
      </div>
    </div>
  );
}
