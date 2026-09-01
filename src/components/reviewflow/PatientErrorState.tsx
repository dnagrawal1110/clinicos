import { Link as LinkIcon, Clock, PauseCircle, MapPinOff, ExternalLink as ExternalLinkIcon, WifiOff, AlertTriangle, Sparkles } from "lucide-react";

export type PatientErrorKind =
  | "invalid-link" | "expired" | "paused" | "location-unavailable"
  | "destination-unavailable" | "network-error" | "submission-failed" | "ai-unavailable";

const CONTENT: Record<PatientErrorKind, { icon: typeof LinkIcon; title: string; message: string; action?: string }> = {
  "invalid-link": { icon: LinkIcon, title: "This link isn't valid", message: "The review link you followed doesn't match an active clinic location. Please check the link or QR code and try again.", action: undefined },
  "expired": { icon: Clock, title: "This link has expired", message: "This review request is no longer active. Please ask the clinic for a fresh link.", action: undefined },
  "paused": { icon: PauseCircle, title: "This campaign is paused", message: "The clinic has temporarily paused this review request. Your feedback still matters — please try again later.", action: undefined },
  "location-unavailable": { icon: MapPinOff, title: "This location isn't available", message: "We couldn't find details for this clinic location right now.", action: undefined },
  "destination-unavailable": { icon: ExternalLinkIcon, title: "We couldn't open the review destination", message: "Your feedback has been saved. You can try opening Google again in a moment.", action: "Try again" },
  "network-error": { icon: WifiOff, title: "Connection issue", message: "We couldn't reach the server. Please check your connection and try again.", action: "Try again" },
  "submission-failed": { icon: AlertTriangle, title: "We couldn't submit your feedback", message: "Nothing was lost — your response is still here. Please try submitting again.", action: "Try again" },
  "ai-unavailable": { icon: Sparkles, title: "AI assist is unavailable right now", message: "No problem — your original words work just fine. You can continue with what you wrote.", action: "Continue with your original text" },
};

export function PatientErrorState({ kind, onRetry }: { kind: PatientErrorKind; onRetry?: () => void }) {
  const c = CONTENT[kind];
  const Icon = c.icon;
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-4 py-16 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[var(--color-surface-sunken)]">
        <Icon className="h-6 w-6 text-[var(--color-ink-tertiary)]" />
      </div>
      <h1 className="mt-5 text-[18px] font-semibold text-[var(--color-ink)]">{c.title}</h1>
      <p className="mt-2 max-w-xs text-[13.5px] leading-relaxed text-[var(--color-ink-tertiary)]">{c.message}</p>
      {c.action && onRetry && (
        <button onClick={onRetry} className="mt-6 rounded-[var(--radius-md)] bg-[var(--color-primary)] px-5 py-3 text-[13.5px] font-semibold text-white">
          {c.action}
        </button>
      )}
    </div>
  );
}

export function PatientLoadingState({ label }: { label: string }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 px-4 py-20 text-center">
      <div className="h-9 w-9 animate-spin rounded-full border-[3px] border-[var(--color-border)] border-t-[var(--color-primary)]" />
      <p className="text-[13.5px] text-[var(--color-ink-tertiary)]">{label}</p>
    </div>
  );
}
