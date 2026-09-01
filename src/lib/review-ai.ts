// Deliberately conservative: grammar/clarity cleanup only. Never invents claims,
// treatments, staff interactions, or praise the patient didn't provide.
export function improveText(raw: string): string {
  let text = raw.trim().replace(/\s+/g, " ");
  if (!text) return "";

  text = text.replace(/(^|[.!?]\s+)([a-z])/g, (_, sep, ch) => sep + ch.toUpperCase());
  text = text.replace(/\bi\b/g, "I");
  text = text.replace(/\s+([,.!?])/g, "$1");
  text = text.replace(/,([^\s])/g, ", $1");

  const fragments = text.split(/(?<=[.!?])\s+/).filter(Boolean);
  const joined = fragments
    .map((f) => (/[.!?]$/.test(f) ? f : f + "."))
    .join(" ");

  return joined.charAt(0).toUpperCase() + joined.slice(1);
}

export interface AuthenticityCheck {
  label: string;
  passed: boolean;
}

const MEDICAL_CLAIM_WORDS = ["cured", "cure", "guarantee", "miracle", "diagnosed", "prescribed medicine", "treatment worked perfectly"];

// A lightweight, transparent heuristic standing in for a real content-safety
// model: it never blocks the patient, it only flags for review when the
// AI-assisted draft looks like it added length or vocabulary the original
// didn't contain.
export function runAuthenticityCheck(original: string, improved: string): AuthenticityCheck[] {
  const grewSubstantially = improved.length > original.length * 1.3 + 12;
  const originalLower = original.toLowerCase();
  const improvedLower = improved.toLowerCase();
  const addedMedicalClaim = MEDICAL_CLAIM_WORDS.some((w) => improvedLower.includes(w) && !originalLower.includes(w));

  return [
    { label: "Meaning preserved", passed: !grewSubstantially },
    { label: "No unsupported experience added", passed: !grewSubstantially },
    { label: "No medical claims added", passed: !addedMedicalClaim },
  ];
}

export function detectUnsupportedClaims(original: string, improved: string): { clean: boolean; note: string } {
  const checks = runAuthenticityCheck(original, improved);
  const allPassed = checks.every((c) => c.passed);
  return { clean: allPassed, note: allPassed ? "AI has only improved clarity and readability." : "Draft may have changed meaning — please review before sharing." };
}
