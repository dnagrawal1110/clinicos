import type { Client, OnboardingStepState } from "../types";
import { rngFor, randInt } from "./rng";

export const ONBOARDING_STEPS = [
  "Create Client",
  "Add Doctor",
  "Add Locations",
  "Connect Google",
  "Connect Website",
  "Connect Social",
  "Connect Ads",
  "Create Review Campaign",
  "Run Initial Audit",
  "Generate First Report",
] as const;

export function getOnboardingProgress(client: Client): { steps: OnboardingStepState[]; percent: number } {
  const rng = rngFor(client.id + "-onboarding-v2");
  const completedCount = client.status === "onboarding" ? randInt(rng, 2, 7) : ONBOARDING_STEPS.length;
  const steps: OnboardingStepState[] = ONBOARDING_STEPS.map((label, i) => ({
    key: label.toLowerCase().replace(/\s+/g, "-"),
    label,
    done: i < completedCount,
  }));
  return { steps, percent: Math.round((completedCount / ONBOARDING_STEPS.length) * 100) };
}
