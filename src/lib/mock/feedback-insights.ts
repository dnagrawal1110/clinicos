import type { ReviewRequest } from "../types";
import { getClient } from "./clients";

export interface ThemeBucket {
  theme: string;
  count: number;
  percent: number;
}

// Order matters: more specific, actionable complaints are checked before the
// generic "doctor" mention that shows up in almost every sentence.
const THEME_KEYWORDS: [string, string[]][] = [
  ["Waiting time", ["wait", "waiting", "slot"]],
  ["Staff", ["staff", "reception", "front desk", "coordination"]],
  ["Pricing", ["price", "cost", "expensive", "billing"]],
  ["Clinic", ["clean", "clinic", "organized", "ambience"]],
  ["Doctor communication", ["doctor", "explained", "consultation", "questions"]],
];

export function themeFor(text: string): string {
  const lower = text.toLowerCase();
  for (const [theme, keywords] of THEME_KEYWORDS) {
    if (keywords.some((k) => lower.includes(k))) return theme;
  }
  return "Other";
}

export function computeThemes(texts: string[]): ThemeBucket[] {
  const counts = new Map<string, number>();
  for (const text of texts) {
    const theme = themeFor(text);
    counts.set(theme, (counts.get(theme) ?? 0) + 1);
  }
  const total = texts.length || 1;
  return [...counts.entries()]
    .map(([theme, count]) => ({ theme, count, percent: Math.round((count / total) * 1000) / 10 }))
    .sort((a, b) => b.count - a.count);
}

export function aiSummaryFor(request: ReviewRequest): string {
  if (!request.feedbackText) return "No feedback text";
  const theme = themeFor(request.feedbackText);
  if (request.sentiment === "positive") return `Positive — ${theme}`;
  if (request.sentiment === "neutral") return `Neutral — ${theme}`;
  return `Needs Attention — ${theme}`;
}

export function isActionRequired(request: ReviewRequest): boolean {
  return request.sentiment === "needs-attention" || request.sentiment === "negative";
}

export function requestClientName(request: ReviewRequest): string {
  return getClient(request.clientId)?.name ?? request.clientId;
}
