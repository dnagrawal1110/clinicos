"use client";

// Role-ready permission architecture (section 55). There is no real backend
// auth yet — the "current role" is a session-local switch (persisted via the
// same runtime store used elsewhere) so the UI can demonstrate how surfaces
// would adapt once a real auth/permissions system exists.
import type { PermissionRole } from "./types";
import { useRuntimeStore, getCurrentRole, setCurrentRole } from "./runtime-store";

export type Capability =
  | "view-all-clients" | "manage-campaigns" | "manage-automation" | "approve-review-responses"
  | "publish-review-responses" | "manage-destinations" | "manage-message-library"
  | "view-patient-identity" | "manage-users" | "export-data";

const ROLE_CAPABILITIES: Record<PermissionRole, Capability[]> = {
  Admin: [
    "view-all-clients", "manage-campaigns", "manage-automation", "approve-review-responses",
    "publish-review-responses", "manage-destinations", "manage-message-library",
    "view-patient-identity", "manage-users", "export-data",
  ],
  "Account Manager": [
    "view-all-clients", "manage-campaigns", "manage-automation", "approve-review-responses",
    "publish-review-responses", "manage-destinations", "manage-message-library", "export-data",
  ],
  "Reputation Manager": [
    "manage-campaigns", "manage-automation", "approve-review-responses",
    "publish-review-responses", "manage-destinations", "manage-message-library", "export-data",
  ],
  "Content Manager": ["manage-message-library", "export-data"],
  "Read Only": [],
};

export const PERMISSION_ROLES: PermissionRole[] = ["Admin", "Account Manager", "Reputation Manager", "Content Manager", "Read Only"];

export function hasCapability(role: PermissionRole, capability: Capability): boolean {
  return ROLE_CAPABILITIES[role].includes(capability);
}

// "Patient Data Restricted" (section 55) — only roles with view-patient-identity
// ever see anything beyond masked identifiers; everyone else always gets the mask.
export function canViewPatientIdentity(role: PermissionRole): boolean {
  return hasCapability(role, "view-patient-identity");
}

export function useCurrentRole(): PermissionRole {
  useRuntimeStore();
  return getCurrentRole();
}

export function usePermission(capability: Capability): boolean {
  const role = useCurrentRole();
  return hasCapability(role, capability);
}

export { setCurrentRole };
