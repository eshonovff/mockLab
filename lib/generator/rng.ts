// Pure, deterministic RNG utilities. No imports from Next, Prisma, or React — this module
// must stay extractable into a separate service later (CLAUDE.md §3).
//
// Usage pattern (CLAUDE.md §5): for record index `i` of a resource,
//   mulberry32(hash32(resource.seed + ":" + i))
// produces a generator that every field pulls from, in field order, so the same input always
// produces the same record on any machine, in any process.

/**
 * FNV-1a, 32-bit. Hashes an arbitrary string to an unsigned 32-bit integer, deterministically.
 * Not cryptographic — just a fast, well-distributed seed derivation for `mulberry32`.
 */
export function hash32(input: string): number {
  let hash = 0x811c9dc5; // FNV offset basis

  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    // Math.imul keeps the multiplication correct at 32-bit overflow — plain `*` loses
    // precision here since the product exceeds Number.MAX_SAFE_INTEGER's exact-int range.
    hash = Math.imul(hash, 0x01000193); // FNV prime
  }

  return hash >>> 0;
}

export type Rng = {
  /** A float in [0, 1), like Math.random(). */
  next: () => number;
  /** An integer in [min, max], inclusive on both ends. */
  int: (min: number, max: number) => number;
  /** A uniformly-chosen element from a non-empty array. Throws on an empty array. */
  pick: <T>(items: readonly T[]) => T;
};

/**
 * mulberry32: a small, fast PRNG. Same seed → identical output sequence, every time, on any
 * machine — that determinism is the entire point of this module.
 */
export function mulberry32(seed: number): Rng {
  let state = seed >>> 0;

  function next(): number {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  function int(min: number, max: number): number {
    return Math.floor(next() * (max - min + 1)) + min;
  }

  function pick<T>(items: readonly T[]): T {
    if (items.length === 0) {
      throw new Error("pick() requires a non-empty array");
    }
    return items[int(0, items.length - 1)] as T;
  }

  return { next, int, pick };
}
