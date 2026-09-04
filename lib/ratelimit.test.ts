import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { InMemoryRateLimiter } from "./ratelimit";

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("InMemoryRateLimiter", () => {
  it("allows requests up to the limit, then blocks", () => {
    const limiter = new InMemoryRateLimiter(3, 60_000);

    expect(limiter.check("user-1").allowed).toBe(true);
    expect(limiter.check("user-1").allowed).toBe(true);
    expect(limiter.check("user-1").allowed).toBe(true);
    expect(limiter.check("user-1").allowed).toBe(false);
  });

  it("tracks each key independently", () => {
    const limiter = new InMemoryRateLimiter(1, 60_000);

    expect(limiter.check("user-1").allowed).toBe(true);
    expect(limiter.check("user-1").allowed).toBe(false);
    // A different key has its own untouched budget.
    expect(limiter.check("user-2").allowed).toBe(true);
  });

  it("resets once the window has fully elapsed", () => {
    const limiter = new InMemoryRateLimiter(1, 10_000);

    expect(limiter.check("user-1").allowed).toBe(true);
    expect(limiter.check("user-1").allowed).toBe(false);

    vi.advanceTimersByTime(10_000);

    expect(limiter.check("user-1").allowed).toBe(true);
  });

  it("does not reset a moment before the window elapses", () => {
    const limiter = new InMemoryRateLimiter(1, 10_000);

    expect(limiter.check("user-1").allowed).toBe(true);
    vi.advanceTimersByTime(9_999);
    expect(limiter.check("user-1").allowed).toBe(false);
  });

  it("reports a positive retryAfterSeconds only when blocked", () => {
    const limiter = new InMemoryRateLimiter(1, 10_000);

    const first = limiter.check("user-1");
    expect(first.allowed).toBe(true);
    expect(first.retryAfterSeconds).toBe(0);

    vi.advanceTimersByTime(4_000);
    const second = limiter.check("user-1");
    expect(second.allowed).toBe(false);
    expect(second.retryAfterSeconds).toBe(6); // 10s window - 4s elapsed, rounded up
  });

  it("counts down `remaining` as the budget is spent, reaching 0 exactly when blocked", () => {
    const limiter = new InMemoryRateLimiter(3, 60_000);

    expect(limiter.check("user-1").remaining).toBe(2);
    expect(limiter.check("user-1").remaining).toBe(1);
    expect(limiter.check("user-1").remaining).toBe(0);
    expect(limiter.check("user-1").remaining).toBe(0); // blocked — still 0, not negative
  });

  it("resets `remaining` to the full limit once the window elapses", () => {
    const limiter = new InMemoryRateLimiter(2, 10_000);

    limiter.check("user-1");
    expect(limiter.check("user-1").remaining).toBe(0);

    vi.advanceTimersByTime(10_000);

    expect(limiter.check("user-1").remaining).toBe(1); // a fresh window, one request already spent
  });
});
