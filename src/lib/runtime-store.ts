"use client";

// Lightweight client-side runtime store bridging the standalone ReviewFlow
// patient app to the agency dashboard, and holding UI-created records
// (e.g. a review campaign created from the Reputation module) — all without
// a real backend. Safe for SSR: starts empty on both server and client, then
// hydrates from localStorage after mount so there is no hydration mismatch.

import { useSyncExternalStore } from "react";
import type { AuditAction, AuditLogEntry, Client, MessageTemplate, PermissionRole, ReviewCampaign, Task } from "./types";
import type { IntegrationActivityLogEntry } from "./integrations/types";

export interface ReviewCompletionDelta {
  count: number;
  ratingSum: number;
  feedbackShared: number;
}

interface RuntimeState {
  reviewCompletions: Record<string, ReviewCompletionDelta>;
  customCampaigns: ReviewCampaign[];
  customTasks: Task[];
  auditLog: AuditLogEntry[];
  currentRole: PermissionRole;
  campaignStatusOverrides: Record<string, ReviewCampaign["status"]>;
  customMessageTemplates: MessageTemplate[];
  archivedTemplateIds: string[];
  publishedReviewResponses: Record<string, string>;
  workspaceMode: "demo" | "live";
  readOnlySync: boolean;
  mappingDecisions: Record<string, { status: "confirmed" | "rejected"; locationId?: string }>;
  integrationActivity: IntegrationActivityLogEntry[];
  customClients: Client[];
}

const STORAGE_KEY = "clinicos-runtime-v1";
const EMPTY_STATE: RuntimeState = {
  reviewCompletions: {},
  customCampaigns: [],
  customTasks: [],
  auditLog: [],
  currentRole: "Admin",
  campaignStatusOverrides: {},
  customMessageTemplates: [],
  archivedTemplateIds: [],
  publishedReviewResponses: {},
  workspaceMode: "demo",
  readOnlySync: true,
  mappingDecisions: {},
  integrationActivity: [],
  customClients: [],
};

let state: RuntimeState = EMPTY_STATE;
let hydrated = false;
const listeners = new Set<() => void>();

function emit() {
  for (const l of listeners) l();
}

function persist() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // best-effort only
  }
}

function loadFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) state = { ...EMPTY_STATE, ...JSON.parse(raw) };
  } catch {
    // ignore corrupt storage
  }
}

function onStorageEvent(e: StorageEvent) {
  if (e.key === STORAGE_KEY) {
    loadFromStorage();
    emit();
  }
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  if (!hydrated) {
    hydrated = true;
    loadFromStorage();
    queueMicrotask(emit);
  }
  if (listeners.size === 1 && typeof window !== "undefined") {
    window.addEventListener("storage", onStorageEvent);
  }
  return () => {
    listeners.delete(cb);
    if (listeners.size === 0 && typeof window !== "undefined") {
      window.removeEventListener("storage", onStorageEvent);
    }
  };
}

function getSnapshot(): RuntimeState {
  return state;
}

function getServerSnapshot(): RuntimeState {
  return EMPTY_STATE;
}

export function useRuntimeStore(): RuntimeState {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

export function recordReviewCompletion(locationId: string, opts: { rating: number; shared: boolean }) {
  const prev = state.reviewCompletions[locationId] ?? { count: 0, ratingSum: 0, feedbackShared: 0 };
  state = {
    ...state,
    reviewCompletions: {
      ...state.reviewCompletions,
      [locationId]: {
        count: prev.count + 1,
        ratingSum: prev.ratingSum + opts.rating,
        feedbackShared: prev.feedbackShared + (opts.shared ? 1 : 0),
      },
    },
  };
  persist();
  emit();
}

export function addCustomCampaign(campaign: ReviewCampaign) {
  state = { ...state, customCampaigns: [campaign, ...state.customCampaigns] };
  persist();
  emit();
}

export function getReviewCompletion(locationId: string): ReviewCompletionDelta {
  return state.reviewCompletions[locationId] ?? { count: 0, ratingSum: 0, feedbackShared: 0 };
}

export function getCustomCampaigns(): ReviewCampaign[] {
  return state.customCampaigns;
}

let auditSeq = 0;
export function recordAudit(entry: Omit<AuditLogEntry, "id" | "at" | "actor"> & { actor?: string }) {
  auditSeq += 1;
  const full: AuditLogEntry = {
    id: `audit-${Date.now()}-${auditSeq}`,
    at: new Date().toISOString(),
    actor: entry.actor ?? state.currentRole,
    ...entry,
  };
  state = { ...state, auditLog: [full, ...state.auditLog].slice(0, 200) };
  persist();
  emit();
}

export function getAuditLog(): AuditLogEntry[] {
  return state.auditLog;
}

export function setCurrentRole(role: PermissionRole) {
  state = { ...state, currentRole: role };
  persist();
  emit();
}

export function getCurrentRole(): PermissionRole {
  return state.currentRole;
}

export function addCustomTask(task: Task) {
  state = { ...state, customTasks: [task, ...state.customTasks] };
  persist();
  emit();
}

export function getCustomTasks(): Task[] {
  return state.customTasks;
}

export function setCampaignStatusOverride(campaignId: string, status: ReviewCampaign["status"]) {
  state = { ...state, campaignStatusOverrides: { ...state.campaignStatusOverrides, [campaignId]: status } };
  persist();
  emit();
}

export function getCampaignStatusOverrides(): Record<string, ReviewCampaign["status"]> {
  return state.campaignStatusOverrides;
}

export function logAuditAction(action: AuditAction, entityType: string, entityId: string, detail: string, opts?: { clientId?: string; locationId?: string }) {
  recordAudit({ action, entityType, entityId, detail, clientId: opts?.clientId, locationId: opts?.locationId });
}

export function addCustomMessageTemplate(template: MessageTemplate) {
  state = { ...state, customMessageTemplates: [template, ...state.customMessageTemplates] };
  persist();
  emit();
}

export function getCustomMessageTemplates(): MessageTemplate[] {
  return state.customMessageTemplates;
}

export function toggleTemplateArchived(id: string, archived: boolean) {
  const set = new Set(state.archivedTemplateIds);
  if (archived) set.add(id); else set.delete(id);
  state = { ...state, archivedTemplateIds: [...set] };
  persist();
  emit();
}

export function getArchivedTemplateIds(): Set<string> {
  return new Set(state.archivedTemplateIds);
}

export function publishReviewResponse(reviewId: string, text: string) {
  state = { ...state, publishedReviewResponses: { ...state.publishedReviewResponses, [reviewId]: text } };
  persist();
  emit();
}

export function getPublishedReviewResponses(): Record<string, string> {
  return state.publishedReviewResponses;
}

// Demo Workspace vs Live Agency Workspace (section 28). Session-local for
// now — mirrors the `agencies.workspace_mode` column, which becomes the
// real source of truth once auth/agency selection exists.
export function setWorkspaceMode(mode: "demo" | "live") {
  state = { ...state, workspaceMode: mode };
  persist();
  emit();
}

export function getWorkspaceMode(): "demo" | "live" {
  return state.workspaceMode;
}

// Read-only sync mode (section 19) — while true, no integration may write
// to a real external account (publish a Google response, send a WhatsApp
// template, post to social). Defaults true; flipping it off is itself a
// write-enabling action worth its own audit trail entry at the call site.
export function setReadOnlySync(value: boolean) {
  state = { ...state, readOnlySync: value };
  persist();
  emit();
}

export function getReadOnlySync(): boolean {
  return state.readOnlySync;
}

// Data Mapping Review decisions (section 12) — keyed by the discovered
// Google location's external id. Never applied automatically; a row only
// ever moves out of "pending" via an explicit Confirm/Reject click.
export function setMappingDecision(externalLocationId: string, decision: { status: "confirmed" | "rejected"; locationId?: string }) {
  state = { ...state, mappingDecisions: { ...state.mappingDecisions, [externalLocationId]: decision } };
  persist();
  emit();
}

export function getMappingDecisions(): Record<string, { status: "confirmed" | "rejected"; locationId?: string }> {
  return state.mappingDecisions;
}

let integrationActivitySeq = 0;
export function logIntegrationActivity(entry: Omit<IntegrationActivityLogEntry, "id" | "createdAt">) {
  integrationActivitySeq += 1;
  const full: IntegrationActivityLogEntry = { ...entry, id: `ia-${Date.now()}-${integrationActivitySeq}`, createdAt: new Date().toISOString() };
  state = { ...state, integrationActivity: [full, ...state.integrationActivity].slice(0, 300) };
  persist();
  emit();
}

export function getIntegrationActivity(): IntegrationActivityLogEntry[] {
  return state.integrationActivity;
}

// Demo-mode client creation (Journey A) — mirrors addCustomCampaign/
// addCustomTask. Live mode instead calls POST /api/clients, which writes to
// Supabase via the service role, since there's no real authenticated
// session yet to authorize a direct browser write.
export function addCustomClient(client: Client) {
  state = { ...state, customClients: [client, ...state.customClients] };
  persist();
  emit();
}

export function getCustomClients(): Client[] {
  return state.customClients;
}
