// Rate limiting interface (section 64) for ReviewFlow public endpoints, AI
// generation, webhooks, and outbound provider calls. The in-memory
// implementation below is only correct for a single server process — it's
// here so the call-site shape exists now; a real deployment needs a shared
// store (Upstash Redis, Supabase's own rate limiting, etc.) behind the same
// interface, swapped in one place.
export interface RateLimiter {
  // Returns true if the call is allowed and should be counted; false if the
  // caller is over limit and should be rejected.
  check(key: string): boolean;
}

export function createFixedWindowRateLimiter(limit: number, windowMs: number): RateLimiter {
  const hits = new Map<string, { count: number; windowStart: number }>();
  return {
    check(key: string): boolean {
      const now = Date.now();
      const entry = hits.get(key);
      if (!entry || now - entry.windowStart > windowMs) {
        hits.set(key, { count: 1, windowStart: now });
        return true;
      }
      if (entry.count >= limit) return false;
      entry.count += 1;
      return true;
    },
  };
}

// Suggested limits (section 64) — not enforced anywhere yet, just the
// documented targets a real deployment should configure per surface.
export const RATE_LIMIT_DEFAULTS = {
  reviewflowTokenActions: { limit: 30, windowMs: 60_000 }, // per token, per minute
  aiGeneration: { limit: 20, windowMs: 60_000 }, // per agency user, per minute
  publicEndpoints: { limit: 100, windowMs: 60_000 }, // per IP, per minute
  webhooks: { limit: 500, windowMs: 60_000 }, // per provider, per minute
  googleApi: { limit: 100, windowMs: 3_600_000 }, // per agency, per hour — stay under Google's own quota
  whatsappApi: { limit: 250, windowMs: 3_600_000 }, // per agency, per hour
} as const;
