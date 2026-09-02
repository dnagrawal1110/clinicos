import { describe, it, expect, vi } from "vitest";
import { createFixedWindowRateLimiter } from "./rate-limit";

describe("fixed window rate limiter", () => {
  it("allows calls up to the limit within a window", () => {
    const limiter = createFixedWindowRateLimiter(3, 60_000);
    expect(limiter.check("token-a")).toBe(true);
    expect(limiter.check("token-a")).toBe(true);
    expect(limiter.check("token-a")).toBe(true);
  });

  it("rejects the call once the limit is exceeded within the same window", () => {
    const limiter = createFixedWindowRateLimiter(2, 60_000);
    expect(limiter.check("token-b")).toBe(true);
    expect(limiter.check("token-b")).toBe(true);
    expect(limiter.check("token-b")).toBe(false);
  });

  it("tracks keys independently", () => {
    const limiter = createFixedWindowRateLimiter(1, 60_000);
    expect(limiter.check("a")).toBe(true);
    expect(limiter.check("b")).toBe(true);
    expect(limiter.check("a")).toBe(false);
  });

  it("resets once the window elapses", () => {
    vi.useFakeTimers();
    const limiter = createFixedWindowRateLimiter(1, 1000);
    expect(limiter.check("c")).toBe(true);
    expect(limiter.check("c")).toBe(false);
    vi.advanceTimersByTime(1001);
    expect(limiter.check("c")).toBe(true);
    vi.useRealTimers();
  });
});
