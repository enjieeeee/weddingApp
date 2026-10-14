import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getDuplicate, rateLimit, rememberSubmission } from "@/lib/rateLimit";

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe("rateLimit", () => {
  it("blocks after the limit and recovers after the window", () => {
    for (let i = 0; i < 3; i++) expect(rateLimit("ip-a", 3, 1000)).toBe(true);
    expect(rateLimit("ip-a", 3, 1000)).toBe(false);
    expect(rateLimit("ip-b", 3, 1000)).toBe(true);
    vi.advanceTimersByTime(1001);
    expect(rateLimit("ip-a", 3, 1000)).toBe(true);
  });
});

describe("duplicate submissions", () => {
  it("remembers a submission then expires it after the TTL", () => {
    expect(getDuplicate("s1")).toBeNull();
    rememberSubmission("s1", 2);
    expect(getDuplicate("s1")).toBe(2);
    vi.advanceTimersByTime(10 * 60 * 1000 + 1);
    expect(getDuplicate("s1")).toBeNull();
  });
});
