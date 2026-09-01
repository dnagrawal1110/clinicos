"use client";

import { useState } from "react";
import type React from "react";
import { Plus, ArrowLeft, ArrowRight, Check } from "lucide-react";
import { Dialog, DialogContent, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ALL_CLIENTS } from "@/lib/mock/clients";
import { addCustomCampaign } from "@/lib/runtime-store";
import { WhatsAppPreview, DEFAULT_MESSAGE_TEMPLATE, renderMessageTemplate } from "./WhatsAppPreview";
import type { Scope } from "@/lib/scope-context";
import type { ReviewCampaign } from "@/lib/types";

const TRIGGERS = ["After consultation", "After appointment", "After procedure", "After follow-up", "Manual campaign"];
const CHANNELS: ReviewCampaign["channel"][] = ["WhatsApp", "SMS", "QR", "Link"];
const LANGUAGES = ["English", "Hindi", "Marathi"];

const STEPS = ["Client", "Location", "Trigger", "Channel", "Language", "Message", "Launch"] as const;

let campaignSeq = 0;
function nextCampaignId(): string {
  campaignSeq += 1;
  return `custom-${Date.now()}-${campaignSeq}`;
}

export function CreateCampaignDialog({ scope, trigger }: { scope: Scope; trigger?: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const initialClientId = scope.type !== "all" ? scope.clientId : ALL_CLIENTS[0].id;
  const [clientId, setClientId] = useState(initialClientId);
  const client = ALL_CLIENTS.find((c) => c.id === clientId) ?? ALL_CLIENTS[0];
  const [locationId, setLocationId] = useState(scope.type === "location" ? scope.locationId : client.locations[0]?.id ?? "");
  const location = client.locations.find((l) => l.id === locationId) ?? client.locations[0];
  const [reviewTrigger, setReviewTrigger] = useState(TRIGGERS[0]);
  const [channel, setChannel] = useState<ReviewCampaign["channel"]>(CHANNELS[0]);
  const [language, setLanguage] = useState(LANGUAGES[0]);
  const [message, setMessage] = useState(DEFAULT_MESSAGE_TEMPLATE);
  const [launched, setLaunched] = useState(false);

  const doctor = client.doctors.find((d) => d.locationIds.includes(location?.id ?? ""));

  function reset() {
    setStep(0);
    setLaunched(false);
    setMessage(DEFAULT_MESSAGE_TEMPLATE);
  }

  function submit(activate: boolean) {
    if (!location) return;
    const campaign: ReviewCampaign = {
      id: nextCampaignId(),
      name: `${location.name} ${reviewTrigger} Campaign`,
      clientId: client.id,
      locationId: location.id,
      doctorId: doctor?.id,
      status: activate ? "active" : "draft",
      trigger: reviewTrigger,
      audience: "All patients",
      language,
      channel,
      reviewDestination: "Google",
      destinationPlatform: "google",
      maxRequestsPerPatient: 2,
      frequencyDays: 3,
      eligiblePatients: 0,
      requestsSent: 0,
      opened: 0,
      feedbackReceived: 0,
      googleClicks: 0,
      reviewsGenerated: 0,
    };
    addCustomCampaign(campaign);
    setLaunched(true);
  }

  const previewMessage = renderMessageTemplate(message, {
    patientName: "Riya",
    doctorName: doctor?.name ?? client.name,
    clinicName: client.brand ?? client.name,
    location: location?.name ?? "",
    reviewLink: `clinicos.link/${location?.slug ?? "review"}`,
  });

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) reset(); }}>
      <DialogTrigger asChild>{trigger ?? <Button variant="primary" size="md"><Plus className="h-3.5 w-3.5" /> Create Review Campaign</Button>}</DialogTrigger>
      <DialogContent className="max-w-lg">
        {launched ? (
          <div className="flex flex-col items-center gap-3 py-4 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--color-success-soft)]">
              <Check className="h-6 w-6 text-[var(--color-success-strong)]" />
            </div>
            <DialogTitle>Campaign created</DialogTitle>
            <DialogDescription>{location?.name} · {reviewTrigger} · {channel} — it now appears in Review Campaigns.</DialogDescription>
            <Button variant="secondary" size="md" onClick={() => setOpen(false)}>Done</Button>
          </div>
        ) : (
          <>
            <DialogTitle>Create Review Campaign</DialogTitle>
            <DialogDescription>Step {step + 1} of {STEPS.length} — {STEPS[step]}</DialogDescription>
            <div className="mt-3 flex items-center gap-1">
              {STEPS.map((s, i) => (
                <span key={s} className={`h-1 flex-1 rounded-full ${i <= step ? "bg-[var(--color-primary)]" : "bg-[var(--color-border)]"}`} />
              ))}
            </div>

            <div className="mt-5 min-h-[220px]">
              {step === 0 && (
                <StepBlock label="Select Client">
                  <select value={clientId} onChange={(e) => { setClientId(e.target.value); const c = ALL_CLIENTS.find((cl) => cl.id === e.target.value); setLocationId(c?.locations[0]?.id ?? ""); }} className="w-full rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-surface-sunken)] px-3 py-2.5 text-[13.5px] outline-none">
                    {ALL_CLIENTS.slice(0, 60).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </StepBlock>
              )}
              {step === 1 && (
                <StepBlock label="Select Location">
                  <div className="flex flex-col gap-2">
                    {client.locations.map((l) => (
                      <button
                        key={l.id}
                        onClick={() => setLocationId(l.id)}
                        className={`flex items-center justify-between rounded-[var(--radius-sm)] border px-3 py-2.5 text-left text-[13.5px] ${locationId === l.id ? "border-[var(--color-primary)] bg-[var(--color-primary-soft)] text-[var(--color-primary-strong)]" : "border-[var(--color-border)] text-[var(--color-ink)]"}`}
                      >
                        {l.name}, {l.city}
                        {locationId === l.id && <Check className="h-4 w-4" />}
                      </button>
                    ))}
                  </div>
                </StepBlock>
              )}
              {step === 2 && (
                <StepBlock label="Select Trigger">
                  <div className="flex flex-col gap-2">
                    {TRIGGERS.map((t) => (
                      <button key={t} onClick={() => setReviewTrigger(t)} className={`flex items-center justify-between rounded-[var(--radius-sm)] border px-3 py-2.5 text-left text-[13.5px] ${reviewTrigger === t ? "border-[var(--color-primary)] bg-[var(--color-primary-soft)] text-[var(--color-primary-strong)]" : "border-[var(--color-border)] text-[var(--color-ink)]"}`}>
                        {t}
                        {reviewTrigger === t && <Check className="h-4 w-4" />}
                      </button>
                    ))}
                  </div>
                </StepBlock>
              )}
              {step === 3 && (
                <StepBlock label="Select Channel">
                  <div className="grid grid-cols-2 gap-2">
                    {CHANNELS.map((c) => (
                      <button key={c} onClick={() => setChannel(c)} className={`rounded-[var(--radius-sm)] border px-3 py-3 text-[13.5px] font-medium ${channel === c ? "border-[var(--color-primary)] bg-[var(--color-primary-soft)] text-[var(--color-primary-strong)]" : "border-[var(--color-border)] text-[var(--color-ink)]"}`}>
                        {c}
                      </button>
                    ))}
                  </div>
                </StepBlock>
              )}
              {step === 4 && (
                <StepBlock label="Choose Language">
                  <div className="flex flex-wrap gap-2">
                    {LANGUAGES.map((l) => (
                      <button key={l} onClick={() => setLanguage(l)} className={`rounded-full border px-4 py-2 text-[13px] font-medium ${language === l ? "border-[var(--color-primary)] bg-[var(--color-primary-soft)] text-[var(--color-primary-strong)]" : "border-[var(--color-border)] text-[var(--color-ink)]"}`}>
                        {l}
                      </button>
                    ))}
                  </div>
                  <p className="mt-2.5 text-[11.5px] text-[var(--color-ink-tertiary)]">More languages can be added later.</p>
                </StepBlock>
              )}
              {step === 5 && (
                <StepBlock label="Review message">
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    rows={4}
                    className="w-full resize-none rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-surface-sunken)] px-3 py-2.5 text-[12.5px] outline-none focus:border-[var(--color-primary)]"
                  />
                  <p className="mt-1.5 text-[11px] text-[var(--color-ink-tertiary)]">Variables: {"{{patient_name}}"}, {"{{doctor_name}}"}, {"{{clinic_name}}"}, {"{{location}}"}, {"{{review_link}}"}</p>
                  <div className="mt-3">
                    <WhatsAppPreview message={previewMessage} />
                  </div>
                </StepBlock>
              )}
              {step === 6 && (
                <StepBlock label="Launch">
                  <div className="flex flex-col gap-1.5 rounded-[var(--radius-md)] border border-[var(--color-border)] p-4 text-[13px]">
                    <Row label="Client" value={client.name} />
                    <Row label="Location" value={`${location?.name}, ${location?.city}`} />
                    {doctor && <Row label="Doctor" value={doctor.name} />}
                    <Row label="Trigger" value={reviewTrigger} />
                    <Row label="Channel" value={channel} />
                    <Row label="Language" value={language} />
                    <Row label="Destination" value="Google" />
                  </div>
                </StepBlock>
              )}
            </div>

            <div className="mt-5 flex items-center justify-between border-t border-[var(--color-border)] pt-4">
              <Button variant="ghost" size="sm" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0}>
                <ArrowLeft className="h-3.5 w-3.5" /> Back
              </Button>
              {step < STEPS.length - 1 ? (
                <Button variant="primary" size="sm" onClick={() => setStep((s) => Math.min(STEPS.length - 1, s + 1))}>
                  Next <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              ) : (
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => submit(false)}>Save as Draft</Button>
                  <Button variant="primary" size="sm" onClick={() => submit(true)}>Launch Campaign</Button>
                </div>
              )}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function StepBlock({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <h4 className="mb-3 text-[12px] font-semibold uppercase tracking-wide text-[var(--color-ink-tertiary)]">{label}</h4>
      {children}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[var(--color-ink-tertiary)]">{label}</span>
      <span className="font-medium text-[var(--color-ink)]">{value}</span>
    </div>
  );
}
