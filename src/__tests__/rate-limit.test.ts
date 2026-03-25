import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { rateLimit } from "@/lib/rate-limit";

describe("rateLimit", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-25T12:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("allows requests within limit", () => {
    const result = rateLimit("test-key-1", { limit: 3, windowSeconds: 60 });
    expect(result.success).toBe(true);
    expect(result.remaining).toBe(2);
  });

  it("blocks after limit is reached", () => {
    const key = "test-key-2";
    const opts = { limit: 2, windowSeconds: 60 };

    rateLimit(key, opts);
    rateLimit(key, opts);
    const result = rateLimit(key, opts);

    expect(result.success).toBe(false);
    expect(result.remaining).toBe(0);
  });

  it("resets after window expires", () => {
    const key = "test-key-3";
    const opts = { limit: 1, windowSeconds: 10 };

    rateLimit(key, opts);
    const blocked = rateLimit(key, opts);
    expect(blocked.success).toBe(false);

    // Advance time past the window
    vi.advanceTimersByTime(11000);

    const result = rateLimit(key, opts);
    expect(result.success).toBe(true);
    expect(result.remaining).toBe(0);
  });

  it("tracks remaining count correctly", () => {
    const key = "test-key-4";
    const opts = { limit: 5, windowSeconds: 60 };

    expect(rateLimit(key, opts).remaining).toBe(4);
    expect(rateLimit(key, opts).remaining).toBe(3);
    expect(rateLimit(key, opts).remaining).toBe(2);
    expect(rateLimit(key, opts).remaining).toBe(1);
    expect(rateLimit(key, opts).remaining).toBe(0);
    expect(rateLimit(key, opts).success).toBe(false);
  });

  it("uses different keys independently", () => {
    const opts = { limit: 1, windowSeconds: 60 };

    rateLimit("user-a", opts);
    const resultA = rateLimit("user-a", opts);
    const resultB = rateLimit("user-b", opts);

    expect(resultA.success).toBe(false);
    expect(resultB.success).toBe(true);
  });
});
