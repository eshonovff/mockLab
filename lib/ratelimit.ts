// CLAUDE.md §2: "lib/ratelimit.ts and the dataset cache must be written behind an interface so
// a Redis backend can replace them later without touching call sites." This is that interface
// — `InMemoryRateLimiter` is its v1 implementation. Callers only ever talk to `RateLimiter`.

export type RateLimitResult = {
  allowed: boolean;
  /** Seconds until the next request from this key would be allowed. 0 when `allowed` is true. */
  retryAfterSeconds: number;
};

export interface RateLimiter {
  check(key: string): RateLimitResult;
}

/**
 * Fixed-window counter, keyed by an arbitrary string (a session id, a project key, ...). Same
 * "in-memory for v1" scope CLAUDE.md §9 already accepts for the mock API's own rate limiting —
 * not shared across server instances, reset on deploy. Good enough until a Redis backend swaps
 * in behind the `RateLimiter` interface above.
 */
export class InMemoryRateLimiter implements RateLimiter {
  private readonly hits = new Map<string, { count: number; windowStart: number }>();

  constructor(
    private readonly limit: number,
    private readonly windowMs: number,
  ) {}

  check(key: string): RateLimitResult {
    const now = Date.now();
    const entry = this.hits.get(key);

    if (!entry || now - entry.windowStart >= this.windowMs) {
      this.hits.set(key, { count: 1, windowStart: now });
      return { allowed: true, retryAfterSeconds: 0 };
    }

    if (entry.count < this.limit) {
      entry.count++;
      return { allowed: true, retryAfterSeconds: 0 };
    }

    const retryAfterSeconds = Math.ceil((entry.windowStart + this.windowMs - now) / 1000);
    return { allowed: false, retryAfterSeconds };
  }
}

// Schema preview (task 4.5): "rate-limited per session" with no specific number given anywhere
// in CLAUDE.md/TASKS.md. CLAUDE.md §4.6 debounces the builder's live preview at 400ms, so a
// user actively editing could burst close to 2.5 req/sec momentarily; sustained typing rarely
// gets near that in practice since debounce waits for a pause. 30/minute is generous headroom
// for real interactive use while still being a genuine limit — a judgment call, not a spec
// number, and easy to retune later since nothing outside this file depends on the exact value.
const PREVIEW_RATE_LIMIT = 30;
const PREVIEW_RATE_WINDOW_MS = 60_000;

export const previewRateLimiter: RateLimiter = new InMemoryRateLimiter(
  PREVIEW_RATE_LIMIT,
  PREVIEW_RATE_WINDOW_MS,
);
