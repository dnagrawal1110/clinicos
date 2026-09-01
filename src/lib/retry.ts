// Retry-with-backoff for external job execution (section 63). Bounded —
// never retries forever. Pairs with error-monitoring.ts: exhausting retries
// should report an integration error with retryStatus "retries-exhausted"
// so it surfaces as a dead-letter/failure state (section 21's job model),
// not a silent failure.
export interface RetryOptions {
  maxAttempts?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
}

export async function withRetry<T>(fn: () => Promise<T>, opts: RetryOptions = {}): Promise<T> {
  const maxAttempts = opts.maxAttempts ?? 3;
  const baseDelayMs = opts.baseDelayMs ?? 500;
  const maxDelayMs = opts.maxDelayMs ?? 8000;

  let lastError: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (attempt === maxAttempts) break;
      const delay = Math.min(maxDelayMs, baseDelayMs * 2 ** (attempt - 1));
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
  throw lastError;
}
