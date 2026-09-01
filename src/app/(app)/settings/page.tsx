"use client";

import { useState } from "react";
import { PageHeader } from "@/components/shell/PageHeader";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

function Field({ label, defaultValue }: { label: string; defaultValue?: string }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[12px] font-medium text-[var(--color-ink-secondary)]">{label}</span>
      <input defaultValue={defaultValue} className="rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-[13.5px] outline-none focus:border-[var(--color-primary)]" />
    </label>
  );
}

function Toggle({ label, description, defaultChecked }: { label: string; description: string; defaultChecked?: boolean }) {
  const [on, setOn] = useState(!!defaultChecked);
  return (
    <div className="flex items-center justify-between border-b border-[var(--color-border)] py-3.5 last:border-0">
      <div>
        <div className="text-[13.5px] font-medium text-[var(--color-ink)]">{label}</div>
        <div className="text-[12px] text-[var(--color-ink-tertiary)]">{description}</div>
      </div>
      <button
        onClick={() => setOn((v) => !v)}
        className={`h-6 w-10 shrink-0 rounded-full transition-colors ${on ? "bg-[var(--color-primary)]" : "bg-[var(--color-border-strong)]"}`}
      >
        <span className={`block h-5 w-5 translate-y-0.5 rounded-full bg-white shadow-sm transition-transform ${on ? "translate-x-[19px]" : "translate-x-0.5"}`} />
      </button>
    </div>
  );
}

export default function SettingsPage() {
  return (
    <div className="animate-fade-in">
      <PageHeader title="Settings" subtitle="Agency configuration, AI behavior, notifications, billing, and brand templates." />

      <Card>
        <Tabs defaultValue="general">
          <div className="px-5 pt-2">
            <TabsList>
              <TabsTrigger value="general">General</TabsTrigger>
              <TabsTrigger value="ai">AI</TabsTrigger>
              <TabsTrigger value="notifications">Notifications</TabsTrigger>
              <TabsTrigger value="billing">Billing</TabsTrigger>
              <TabsTrigger value="templates">Templates</TabsTrigger>
              <TabsTrigger value="brand">Brand</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="general" className="p-5">
            <CardHeader className="px-0 pt-0"><CardTitle>Agency profile</CardTitle></CardHeader>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Agency name" defaultValue="MixMedia" />
              <Field label="Primary contact email" defaultValue="deepak.mixmedia@gmail.com" />
              <Field label="Support phone" defaultValue="+91 98200 12345" />
              <Field label="Time zone" defaultValue="Asia/Kolkata (IST)" />
            </div>
            <Button variant="primary" size="md" className="mt-5">Save changes</Button>
          </TabsContent>

          <TabsContent value="ai" className="p-5">
            <CardHeader className="px-0 pt-0">
              <div>
                <CardTitle>AI behavior</CardTitle>
                <CardDescription>Control how ClinicOS Intelligence surfaces insights and recommendations.</CardDescription>
              </div>
            </CardHeader>
            <Toggle label="Proactive insights" description="Surface AI findings on the Command Center automatically." defaultChecked />
            <Toggle label="Auto-draft review responses" description="Let AI draft replies to new Google reviews for approval." defaultChecked />
            <Toggle label="Auto-generate content ideas" description="Weekly AI-generated content suggestions per location." defaultChecked />
            <Toggle label="Aggressive opportunity flagging" description="Surface upsell opportunities even with partial data." />
          </TabsContent>

          <TabsContent value="notifications" className="p-5">
            <CardHeader className="px-0 pt-0"><CardTitle>Notification preferences</CardTitle></CardHeader>
            <Toggle label="Critical alerts" description="Google disconnections, rating drops, negative reviews." defaultChecked />
            <Toggle label="Task reminders" description="Daily digest of tasks due today." defaultChecked />
            <Toggle label="Weekly portfolio summary" description="Sent every Monday at 9:00 AM IST." defaultChecked />
            <Toggle label="Client report ready" description="Notify when a scheduled report finishes generating." />
          </TabsContent>

          <TabsContent value="billing" className="p-5">
            <CardHeader className="px-0 pt-0"><CardTitle>Billing</CardTitle></CardHeader>
            <p className="text-[13.5px] text-[var(--color-ink-secondary)]">Agency plan: <strong>Scale — 97 active clients</strong></p>
            <p className="mt-1 text-[12.5px] text-[var(--color-ink-tertiary)]">Next invoice: October 1, 2026 · ₹4,85,000</p>
            <Button variant="outline" size="md" className="mt-4">View billing history</Button>
          </TabsContent>

          <TabsContent value="templates" className="p-5">
            <CardHeader className="px-0 pt-0"><CardTitle>Report templates</CardTitle></CardHeader>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {["Monthly Growth Report", "Quarterly Business Review", "Onboarding Welcome Report"].map((t) => (
                <div key={t} className="rounded-[var(--radius-md)] border border-[var(--color-border)] p-3.5">
                  <div className="text-[13px] font-medium text-[var(--color-ink)]">{t}</div>
                  <Button variant="ghost" size="sm" className="mt-2 -ml-2.5">Edit template</Button>
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="brand" className="p-5">
            <CardHeader className="px-0 pt-0"><CardTitle>Brand settings</CardTitle></CardHeader>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Primary color" defaultValue="#14403D" />
              <Field label="Report footer text" defaultValue="Prepared by MixMedia — Growth Agency" />
            </div>
          </TabsContent>
        </Tabs>
      </Card>
    </div>
  );
}
