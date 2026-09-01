"use client";

import { useState } from "react";
import type React from "react";
import { Copy, Archive, ArchiveRestore, Sparkles, Pencil } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { WhatsAppPreview, renderMessageTemplate } from "./WhatsAppPreview";
import { getScopedMessageTemplates } from "@/lib/scope-selectors";
import { MESSAGE_CATEGORIES } from "@/lib/mock/message-library";
import { generateMessageDraft } from "@/lib/ai-service";
import { addCustomMessageTemplate, toggleTemplateArchived, logAuditAction } from "@/lib/runtime-store";
import type { MessageCategory, MessageTemplate, ReviewFlowLanguage } from "@/lib/types";

const LANGUAGE_LABEL: Record<ReviewFlowLanguage, string> = { en: "English", hi: "Hindi", mr: "Marathi" };
const VARIABLES = ["{{patient_name}}", "{{doctor_name}}", "{{clinic_name}}", "{{location_name}}", "{{appointment_type}}", "{{review_link}}", "{{reviewflow_link}}", "{{support_phone}}"];

let templateSeq = 0;
function nextTemplateId(): string {
  templateSeq += 1;
  return `msg-custom-${Date.now()}-${templateSeq}`;
}

export function ReputationMessageLibraryTab() {
  const [categoryFilter, setCategoryFilter] = useState<MessageCategory | "all">("all");
  const [showArchived, setShowArchived] = useState(false);
  const [generatorOpen, setGeneratorOpen] = useState(false);
  const [previewing, setPreviewing] = useState<MessageTemplate | null>(null);
  const templates = getScopedMessageTemplates().filter((t) =>
    (categoryFilter === "all" || t.category === categoryFilter) && (showArchived || t.status === "active")
  );

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <div>
            <CardTitle>Message Library</CardTitle>
            <CardDescription>{templates.length} template{templates.length !== 1 ? "s" : ""} · reused across campaigns and automations</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value as MessageCategory | "all")}
              className="h-8 rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-surface-sunken)] px-2.5 text-[12.5px] outline-none"
            >
              <option value="all">All categories</option>
              {MESSAGE_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <button onClick={() => setShowArchived((v) => !v)} className={`rounded-full px-3 py-1 text-[12px] font-medium ${showArchived ? "bg-[var(--color-primary)] text-white" : "bg-[var(--color-surface-sunken)] text-[var(--color-ink-secondary)]"}`}>Archived</button>
            <Button variant="primary" size="sm" onClick={() => setGeneratorOpen(true)}><Sparkles className="h-3.5 w-3.5" /> AI Generate</Button>
          </div>
        </CardHeader>
        <div className="flex flex-col gap-3 px-5 pb-5 pt-2">
          {templates.length === 0 ? (
            <p className="py-8 text-center text-[13px] text-[var(--color-ink-tertiary)]">No templates in this filter yet.</p>
          ) : templates.map((t) => (
            <div key={t.id} className="rounded-[var(--radius-md)] border border-[var(--color-border)] p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-[13.5px] font-semibold text-[var(--color-ink)]">{t.name}</h4>
                    {t.status === "archived" && <Badge variant="neutral">Archived</Badge>}
                  </div>
                  <p className="mt-0.5 text-[11.5px] text-[var(--color-ink-tertiary)]">{t.category} · {LANGUAGE_LABEL[t.language]} · {t.trigger} · <span className="capitalize">{t.channel}</span></p>
                </div>
                <div className="flex shrink-0 gap-1.5">
                  <Button variant="ghost" size="sm" onClick={() => setPreviewing(t)}><Pencil className="h-3.5 w-3.5" /> Preview</Button>
                  <Button variant="ghost" size="sm" onClick={() => {
                    addCustomMessageTemplate({ ...t, id: nextTemplateId(), name: `${t.name} (Copy)`, status: "active", updatedAt: new Date().toISOString() });
                    logAuditAction("message.edited", "message-template", t.id, `Duplicated "${t.name}"`);
                  }}><Copy className="h-3.5 w-3.5" /> Duplicate</Button>
                  <Button variant="ghost" size="sm" onClick={() => toggleTemplateArchived(t.id, t.status !== "archived")}>
                    {t.status === "archived" ? <><ArchiveRestore className="h-3.5 w-3.5" /> Restore</> : <><Archive className="h-3.5 w-3.5" /> Archive</>}
                  </Button>
                </div>
              </div>
              <p className="mt-2.5 rounded-[var(--radius-sm)] bg-[var(--color-surface-sunken)] px-3 py-2 text-[12.5px] text-[var(--color-ink-secondary)]">{t.body}</p>
            </div>
          ))}
        </div>
      </Card>

      <Card className="p-4">
        <div className="mb-1.5 text-[12px] font-semibold uppercase tracking-wide text-[var(--color-ink-tertiary)]">Variable picker</div>
        <div className="flex flex-wrap gap-1.5">
          {VARIABLES.map((v) => <code key={v} className="rounded-[var(--radius-sm)] bg-[var(--color-surface-sunken)] px-2 py-1 text-[11.5px] text-[var(--color-ink-secondary)]">{v}</code>)}
        </div>
      </Card>

      <PreviewDialog template={previewing} onClose={() => setPreviewing(null)} />
      <GeneratorDialog open={generatorOpen} onClose={() => setGeneratorOpen(false)} />
    </div>
  );
}

function PreviewDialog({ template, onClose }: { template: MessageTemplate | null; onClose: () => void }) {
  const rendered = template
    ? renderMessageTemplate(template.body, { patientName: "Riya", doctorName: "the doctor", clinicName: "the clinic", location: "Kothrud", reviewLink: "clinicos.link/kothrud" })
    : "";
  return (
    <Dialog open={!!template} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-sm">
        {template && (
          <>
            <DialogTitle>{template.name}</DialogTitle>
            <DialogDescription>Preview as the patient would see it on {template.channel}</DialogDescription>
            <div className="mt-3">
              {template.channel === "whatsapp" || template.channel === "sms" ? <WhatsAppPreview message={rendered} /> : (
                <div className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-sunken)] p-4 text-[13px] text-[var(--color-ink)]">{rendered}</div>
              )}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function GeneratorDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [doctorName, setDoctorName] = useState("Sharma");
  const [clinicName, setClinicName] = useState("the clinic");
  const [trigger, setTrigger] = useState("After consultation");
  const [tone, setTone] = useState<"friendly" | "formal" | "concise">("friendly");
  const [language, setLanguage] = useState<ReviewFlowLanguage>("en");
  const [draft, setDraft] = useState<string | null>(null);

  function generate() {
    setDraft(generateMessageDraft({ doctorName, clinicName, trigger, tone, language }).text);
  }

  function save() {
    if (!draft) return;
    addCustomMessageTemplate({
      id: nextTemplateId(), name: `AI Draft — ${trigger}`, category: "General", language, trigger,
      channel: "whatsapp", body: draft, status: "active", updatedAt: new Date().toISOString(),
    });
    logAuditAction("message.edited", "message-template", "ai-draft", `AI-generated template created for ${trigger}`);
    onClose();
    setDraft(null);
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogTitle className="flex items-center gap-2"><Sparkles className="h-4 w-4 text-[var(--color-ai)]" /> AI Message Generator</DialogTitle>
        <DialogDescription>Drafts a short, polite review request — never invents claims or outcomes.</DialogDescription>
        <div className="mt-3 flex flex-col gap-3">
          <Field label="Doctor name"><input value={doctorName} onChange={(e) => setDoctorName(e.target.value)} className="w-full rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-surface-sunken)] px-3 py-2 text-[13px] outline-none" /></Field>
          <Field label="Clinic name"><input value={clinicName} onChange={(e) => setClinicName(e.target.value)} className="w-full rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-surface-sunken)] px-3 py-2 text-[13px] outline-none" /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Trigger">
              <select value={trigger} onChange={(e) => setTrigger(e.target.value)} className="w-full rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-surface-sunken)] px-3 py-2 text-[13px] outline-none">
                {["After consultation", "After appointment", "After procedure", "After follow-up"].map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </Field>
            <Field label="Tone">
              <select value={tone} onChange={(e) => setTone(e.target.value as typeof tone)} className="w-full rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-surface-sunken)] px-3 py-2 text-[13px] outline-none">
                <option value="friendly">Friendly</option>
                <option value="formal">Formal</option>
                <option value="concise">Concise</option>
              </select>
            </Field>
          </div>
          <Field label="Language">
            <div className="flex gap-1.5">
              {(["en", "hi", "mr"] as ReviewFlowLanguage[]).map((l) => (
                <button key={l} onClick={() => setLanguage(l)} className={`rounded-full border px-3 py-1.5 text-[12.5px] font-medium ${language === l ? "border-[var(--color-primary)] bg-[var(--color-primary-soft)] text-[var(--color-primary-strong)]" : "border-[var(--color-border)] text-[var(--color-ink)]"}`}>{LANGUAGE_LABEL[l]}</button>
              ))}
            </div>
          </Field>
          <Button variant="outline" size="sm" onClick={generate}><Sparkles className="h-3.5 w-3.5" /> Generate draft</Button>
          {draft && (
            <div className="mt-1">
              <WhatsAppPreview message={renderMessageTemplate(draft, { patientName: "Riya", doctorName, clinicName, location: "", reviewLink: "clinicos.link/review" })} />
              <div className="mt-2 flex justify-end gap-2">
                <Button variant="outline" size="sm" onClick={() => setDraft(null)}>Discard</Button>
                <Button variant="primary" size="sm" onClick={save}>Save to Library</Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-1 text-[11.5px] font-medium text-[var(--color-ink-tertiary)]">{label}</div>
      {children}
    </div>
  );
}
