import { describe, it, expect } from "vitest";
import { buildIdempotencyKey, interpretIdempotentInsert } from "./idempotency";

describe("idempotency", () => {
  it("builds a stable, colon-joined key from mixed string/number parts", () => {
    expect(buildIdempotencyKey(["req-1", "review_request_completed"])).toBe("req-1:review_request_completed");
    expect(buildIdempotencyKey(["provider-msg", 42])).toBe("provider-msg:42");
  });

  it("reports wasNew=true when the insert actually returned rows", () => {
    expect(interpretIdempotentInsert([{ id: "1" }]).wasNew).toBe(true);
  });

  it("reports wasNew=false when ON CONFLICT DO NOTHING skipped the row (Part 15/25)", () => {
    expect(interpretIdempotentInsert([]).wasNew).toBe(false);
    expect(interpretIdempotentInsert(null).wasNew).toBe(false);
  });
});
