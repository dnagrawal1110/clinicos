"use client";

import { useEffect, useMemo, useState } from "react";
import { Star, Sparkles, ShieldCheck, Pencil, ExternalLink, CheckCircle2, Phone, ChevronDown } from "lucide-react";
import { improveText, runAuthenticityCheck } from "@/lib/review-ai";
import { recordReviewCompletion } from "@/lib/runtime-store";
import { track } from "@/lib/analytics";
import { PatientErrorState, PatientLoadingState, type PatientErrorKind } from "./PatientErrorState";
import type { ReviewFlowConfig } from "@/lib/types";
import { cn } from "@/lib/utils";

type Step = "welcome" | "feedback" | "ai-processing" | "ai-assist" | "edit" | "final" | "submitting" | "completion";

const RATING_MESSAGES: Record<number, string> = {
  5: "That's wonderful. We'd love to hear what stood out.",
  4: "Thank you. Tell us what went well.",
  3: "Thank you for your feedback.",
  2: "We'd like to understand what we could improve.",
  1: "We're sorry your experience wasn't what you expected.",
};

const GUIDANCE_CHIPS = ["Doctor / consultation", "Staff", "Clinic experience", "Waiting time", "Overall experience"];
const ASPECTS = ["Doctor", "Staff", "Clinic", "Waiting time", "Overall experience"] as const;

const MIN_FEEDBACK_LENGTH = 10;

export function ReviewFlowExperience({ config, simulate }: { config: ReviewFlowConfig; simulate?: string }) {
  const [step, setStep] = useState<Step>("welcome");
  const [rating, setRating] = useState(0);
  const [original, setOriginal] = useState("");
  const [feedbackStarted, setFeedbackStarted] = useState(false);
  const [showAspects, setShowAspects] = useState(false);
  const [aspectRatings, setAspectRatings] = useState<Record<string, number>>({});
  const [selectedVersion, setSelectedVersion] = useState<"ai" | "original">("ai");
  const [editedText, setEditedText] = useState("");
  const [aiFailed, setAiFailed] = useState(false);
  const [error, setError] = useState<PatientErrorKind | null>(null);

  useEffect(() => {
    track("review_page_opened", { locationId: config.locationId, campaignId: config.campaignId });
    track("campaign_opened", { locationId: config.locationId, campaignId: config.campaignId });
  }, [config.locationId, config.campaignId]);

  const aiVersion = useMemo(() => improveText(original), [original]);
  const authenticity = useMemo(() => runAuthenticityCheck(original, aiVersion), [original, aiVersion]);
  const finalText = editedText || (selectedVersion === "ai" && !aiFailed ? aiVersion : original);

  function selectRating(n: number) {
    setRating(n);
    track("rating_selected", { locationId: config.locationId, campaignId: config.campaignId, properties: { rating: n } });
  }

  function onFeedbackChange(v: string) {
    setOriginal(v);
    if (!feedbackStarted && v.length > 0) {
      setFeedbackStarted(true);
      track("feedback_started", { locationId: config.locationId, campaignId: config.campaignId });
    }
  }

  function submitFeedback() {
    if (simulate === "network-error" || simulate === "submission-failed") {
      setError(simulate as PatientErrorKind);
      track("campaign_failed", { locationId: config.locationId, campaignId: config.campaignId, properties: { reason: simulate } });
      return;
    }
    track("feedback_submitted", { locationId: config.locationId, campaignId: config.campaignId, properties: { rating, length: original.length } });
    setStep("ai-processing");
    setTimeout(() => {
      if (simulate === "ai-unavailable") {
        setAiFailed(true);
        setSelectedVersion("original");
        setStep("final");
        return;
      }
      setStep("ai-assist");
      track("ai_assist_opened", { locationId: config.locationId, campaignId: config.campaignId });
    }, 900);
  }

  function useAiVersion() {
    setSelectedVersion("ai");
    setEditedText("");
    track("ai_version_selected", { locationId: config.locationId, campaignId: config.campaignId });
    setStep("final");
  }

  function keepOriginal() {
    setSelectedVersion("original");
    setEditedText("");
    track("original_version_selected", { locationId: config.locationId, campaignId: config.campaignId });
    setStep("final");
  }

  function openEdit() {
    setEditedText(finalText);
    setStep("edit");
  }

  function saveEdit() {
    track("feedback_edited", { locationId: config.locationId, campaignId: config.campaignId });
    setStep("final");
  }

  function shareToDestination() {
    track("final_review_approved", { locationId: config.locationId, campaignId: config.campaignId, properties: { rating } });
    if (simulate === "destination-unavailable") {
      setError("destination-unavailable");
      return;
    }
    if (typeof window !== "undefined") {
      window.open(config.googleReviewUrl, "_blank", "noopener,noreferrer");
    }
    track("public_review_clicked", { locationId: config.locationId, campaignId: config.campaignId });
    recordReviewCompletion(config.locationId, { rating, shared: true });
    setStep("submitting");
    setTimeout(() => {
      track("flow_completed", { locationId: config.locationId, campaignId: config.campaignId, properties: { rating } });
      setStep("completion");
    }, 700);
  }

  if (error) {
    return <PatientErrorState kind={error} onRetry={() => setError(null)} />;
  }

  return (
    <div className="flex flex-1 flex-col">
      <div className="mb-8 flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[var(--color-primary)] text-[15px] font-semibold text-white">
          {config.logoInitial}
        </div>
        <div>
          <div className="text-[13px] font-semibold text-[var(--color-ink)]">{config.clinicDisplayName}</div>
          <div className="text-[11.5px] text-[var(--color-ink-tertiary)]">{config.locationDisplayName}{config.doctorDisplayName ? ` · ${config.doctorDisplayName}` : ""}</div>
        </div>
      </div>

      <StepDots step={step} />

      {step === "welcome" && (
        <div className="mt-8 flex flex-1 flex-col items-center text-center">
          <h1 className="text-[19px] font-semibold text-[var(--color-ink)]">How was your experience?</h1>
          <p className="mt-2 max-w-xs text-[13.5px] text-[var(--color-ink-tertiary)]">
            Your feedback helps us understand what we&rsquo;re doing well and where we can improve.
          </p>
          <div
            className="mt-8 flex gap-2"
            role="radiogroup"
            aria-label="Rate your experience from 1 to 5 stars"
          >
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                role="radio"
                aria-checked={rating === n}
                aria-label={`${n} star${n > 1 ? "s" : ""}`}
                onClick={() => selectRating(n)}
                className="rounded-full p-1 transition-transform focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--color-primary)] active:scale-90"
              >
                <Star className={cn("h-10 w-10", n <= rating ? "fill-[var(--color-warning)] text-[var(--color-warning)]" : "text-[var(--color-border-strong)]")} />
              </button>
            ))}
          </div>
          {rating > 0 && (
            <p className="mt-4 min-h-[20px] text-[13px] font-medium text-[var(--color-ink-secondary)] animate-fade-in">{RATING_MESSAGES[rating]}</p>
          )}
          <button
            disabled={rating === 0}
            onClick={() => setStep("feedback")}
            className="mt-8 w-full rounded-[var(--radius-md)] bg-[var(--color-primary)] py-3.5 text-[14.5px] font-semibold text-white disabled:opacity-30"
          >
            Continue
          </button>
        </div>
      )}

      {step === "feedback" && (
        <div className="mt-8 flex flex-1 flex-col">
          <h1 className="text-[19px] font-semibold text-[var(--color-ink)]">Tell us about your experience</h1>
          <p className="mt-1.5 text-[13.5px] text-[var(--color-ink-tertiary)]">Write it in your own words. Even a sentence or two helps.</p>
          <label htmlFor="feedback-text" className="sr-only">Your feedback</label>
          <textarea
            id="feedback-text"
            value={original}
            onChange={(e) => onFeedbackChange(e.target.value)}
            placeholder="Tell us what you liked about your visit, your consultation, the clinic, or anything you'd like us to know..."
            rows={7}
            className="mt-5 resize-none rounded-[var(--radius-md)] border border-[var(--color-border)] bg-white p-4 text-[14.5px] leading-relaxed text-[var(--color-ink)] outline-none placeholder:text-[var(--color-ink-tertiary)] focus:border-[var(--color-primary)]"
          />
          <div className="mt-1.5 flex items-center justify-between text-[11px] text-[var(--color-ink-tertiary)]">
            <span>{original.length < MIN_FEEDBACK_LENGTH ? `${MIN_FEEDBACK_LENGTH - original.length} more characters to continue` : "Looks good"}</span>
            <span>{original.length} characters</span>
          </div>

          <div className="mt-4">
            <p className="text-[11.5px] font-medium text-[var(--color-ink-tertiary)]">You can mention:</p>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {GUIDANCE_CHIPS.map((c) => (
                <span key={c} className="rounded-full bg-[var(--color-surface-sunken)] px-2.5 py-1 text-[11.5px] text-[var(--color-ink-secondary)]">{c}</span>
              ))}
            </div>
          </div>

          <button
            onClick={() => setShowAspects((v) => !v)}
            className="mt-4 flex items-center gap-1 self-start text-[12.5px] font-medium text-[var(--color-primary-strong)]"
          >
            <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", showAspects && "rotate-180")} />
            {showAspects ? "Hide" : "Add"} more detail (optional)
          </button>
          {showAspects && (
            <div className="mt-2 flex flex-col gap-2 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-white p-3">
              {ASPECTS.map((aspect) => (
                <div key={aspect} className="flex items-center justify-between">
                  <span className="text-[12.5px] text-[var(--color-ink-secondary)]">{aspect}</span>
                  <div className="flex gap-0.5">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <button key={n} aria-label={`${aspect} ${n} star`} onClick={() => setAspectRatings((r) => ({ ...r, [aspect]: n }))}>
                        <Star className={cn("h-4 w-4", (aspectRatings[aspect] ?? 0) >= n ? "fill-[var(--color-warning)] text-[var(--color-warning)]" : "text-[var(--color-border-strong)]")} />
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="mt-6 flex gap-2">
            <button onClick={() => setStep("welcome")} className="rounded-[var(--radius-md)] border border-[var(--color-border-strong)] px-5 py-3 text-[13.5px] font-medium text-[var(--color-ink)]">
              Back
            </button>
            <button
              disabled={original.trim().length < MIN_FEEDBACK_LENGTH}
              onClick={submitFeedback}
              className="flex-1 rounded-[var(--radius-md)] bg-[var(--color-primary)] py-3 text-[14.5px] font-semibold text-white disabled:opacity-30"
            >
              Continue
            </button>
          </div>
        </div>
      )}

      {step === "ai-processing" && <PatientLoadingState label="Improving your feedback..." />}

      {step === "ai-assist" && (
        <div className="mt-8 flex flex-1 flex-col">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-[var(--color-ai)]" />
            <h1 className="text-[17px] font-semibold text-[var(--color-ink)]">Here&rsquo;s a clearer version of your feedback</h1>
          </div>
          <p className="mt-1.5 text-[13px] text-[var(--color-ink-tertiary)]">We&rsquo;ve only improved the wording and readability. You can edit it or keep your original.</p>

          <div className="mt-5 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-white p-4">
            <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-[var(--color-ink-tertiary)]">Your words</div>
            <p className="text-[13.5px] leading-relaxed text-[var(--color-ink-secondary)]">{original}</p>
          </div>

          <div className="mt-3 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-ai-soft)]/40 p-4">
            <div className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-[var(--color-ai-strong)]">
              <Sparkles className="h-3 w-3" /> AI-assisted version based on your feedback
            </div>
            <p className="text-[13.5px] leading-relaxed text-[var(--color-ink)]">{aiVersion}</p>
          </div>

          <div className="mt-3 rounded-[var(--radius-sm)] bg-[var(--color-success-soft)] px-3 py-2.5">
            <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-[var(--color-success-strong)] flex items-center gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5" /> Authenticity Check
            </div>
            <ul className="flex flex-col gap-0.5">
              {authenticity.map((c) => (
                <li key={c.label} className={cn("text-[12px] font-medium", c.passed ? "text-[var(--color-success-strong)]" : "text-[var(--color-warning-strong)]")}>
                  {c.passed ? "🟢" : "🟡"} {c.label}
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-6 flex flex-col gap-2">
            <button onClick={useAiVersion} className="w-full rounded-[var(--radius-md)] bg-[var(--color-primary)] py-3.5 text-[14.5px] font-semibold text-white">
              Use AI Version
            </button>
            <div className="flex gap-2">
              <button onClick={keepOriginal} className="flex-1 rounded-[var(--radius-md)] border border-[var(--color-border-strong)] py-3 text-[13.5px] font-medium text-[var(--color-ink)]">
                Keep Original
              </button>
              <button onClick={openEdit} className="flex flex-1 items-center justify-center gap-1.5 rounded-[var(--radius-md)] border border-[var(--color-border-strong)] py-3 text-[13.5px] font-medium text-[var(--color-ink)]">
                <Pencil className="h-3.5 w-3.5" /> Edit
              </button>
            </div>
          </div>
        </div>
      )}

      {step === "edit" && (
        <div className="mt-8 flex flex-1 flex-col">
          <h1 className="text-[17px] font-semibold text-[var(--color-ink)]">Edit your feedback</h1>
          <p className="mt-1.5 text-[13px] text-[var(--color-ink-tertiary)]">Change anything you&rsquo;d like — this will be the version you share.</p>
          <textarea
            value={editedText}
            onChange={(e) => setEditedText(e.target.value)}
            rows={8}
            className="mt-4 flex-1 resize-none rounded-[var(--radius-md)] border border-[var(--color-border)] bg-white p-4 text-[14.5px] leading-relaxed text-[var(--color-ink)] outline-none focus:border-[var(--color-primary)]"
          />
          <button onClick={saveEdit} disabled={editedText.trim().length < MIN_FEEDBACK_LENGTH} className="mt-5 w-full rounded-[var(--radius-md)] bg-[var(--color-primary)] py-3.5 text-[14.5px] font-semibold text-white disabled:opacity-30">
            Continue
          </button>
        </div>
      )}

      {step === "final" && (
        <div className="mt-8 flex flex-1 flex-col">
          <h1 className="text-[19px] font-semibold text-[var(--color-ink)]">Your feedback</h1>
          {aiFailed && (
            <p className="mt-1.5 rounded-[var(--radius-sm)] bg-[var(--color-warning-soft)] px-3 py-2 text-[12px] text-[var(--color-warning-strong)]">
              AI assist was unavailable, so we&rsquo;ve kept your original words.
            </p>
          )}
          <p className="mt-1.5 text-[13.5px] text-[var(--color-ink-tertiary)]">Please review this before sharing.</p>

          <div className="mt-5 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-white p-4">
            <div className="flex items-center gap-1 text-[var(--color-warning)]" aria-label={`${rating} out of 5 stars`}>
              {"★".repeat(rating)}{"☆".repeat(5 - rating)}
            </div>
            <p className="mt-2 text-[14.5px] leading-relaxed text-[var(--color-ink)]">{finalText}</p>
          </div>

          <div className="mt-6 flex flex-col gap-2">
            <button onClick={shareToDestination} className="flex w-full items-center justify-center gap-2 rounded-[var(--radius-md)] bg-[var(--color-primary)] py-3.5 text-[14.5px] font-semibold text-white">
              Share on Google <ExternalLink className="h-4 w-4" />
            </button>
            <button onClick={openEdit} className="w-full rounded-[var(--radius-md)] border border-[var(--color-border-strong)] py-3 text-[13.5px] font-medium text-[var(--color-ink)]">
              Edit
            </button>
          </div>
        </div>
      )}

      {step === "submitting" && <PatientLoadingState label="Submitting your feedback..." />}

      {step === "completion" && (
        <div className="mt-16 flex flex-1 flex-col items-center text-center">
          <CheckCircle2 className="h-14 w-14 text-[var(--color-success)]" />
          {rating >= 4 ? (
            <>
              <h1 className="mt-5 text-[19px] font-semibold text-[var(--color-ink)]">Thank you for sharing your experience.</h1>
              <p className="mt-2 max-w-xs text-[13.5px] text-[var(--color-ink-tertiary)]">Your feedback means a lot to us.</p>
              <p className="mt-1 max-w-xs text-[12px] text-[var(--color-ink-tertiary)]">Your feedback also helps other patients make informed decisions.</p>
            </>
          ) : (
            <>
              <h1 className="mt-5 text-[19px] font-semibold text-[var(--color-ink)]">Thank you for telling us.</h1>
              <p className="mt-2 max-w-xs text-[13.5px] text-[var(--color-ink-tertiary)]">
                We&rsquo;re sorry your experience wasn&rsquo;t what you expected. Your feedback has been shared with the clinic team.
              </p>
              <a
                href={`tel:${config.supportContact}`}
                className="mt-5 flex items-center gap-2 rounded-[var(--radius-md)] border border-[var(--color-border-strong)] px-5 py-3 text-[13.5px] font-medium text-[var(--color-ink)]"
              >
                <Phone className="h-4 w-4" /> Contact the clinic
              </a>
            </>
          )}
        </div>
      )}

      <p className="mt-10 text-center text-[11px] text-[var(--color-ink-tertiary)]">Powered by ClinicOS ReviewFlow</p>
    </div>
  );
}

function StepDots({ step }: { step: Step }) {
  const majorSteps: Step[] = ["welcome", "feedback", "ai-assist", "final"];
  const effective = step === "ai-processing" ? "ai-assist" : step === "edit" ? "ai-assist" : step === "submitting" ? "final" : step;
  const idx = majorSteps.indexOf(effective as Step);
  if (step === "completion" || idx === -1) return null;
  return (
    <div className="flex items-center gap-1.5">
      {majorSteps.map((s, i) => (
        <span key={s} className={cn("h-1 flex-1 rounded-full", i <= idx ? "bg-[var(--color-primary)]" : "bg-[var(--color-border)]")} />
      ))}
    </div>
  );
}
