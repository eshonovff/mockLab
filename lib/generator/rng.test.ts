import { describe, expect, it } from "vitest";

import { hash32, mulberry32 } from "./rng";

describe("hash32", () => {
  it("is deterministic for the same input", () => {
    expect(hash32("resource-seed:0")).toBe(hash32("resource-seed:0"));
  });

  it("returns an unsigned 32-bit integer", () => {
    const value = hash32("anything");
    expect(Number.isInteger(value)).toBe(true);
    expect(value).toBeGreaterThanOrEqual(0);
    expect(value).toBeLessThanOrEqual(0xffffffff);
  });

  it("diverges for different inputs", () => {
    expect(hash32("a")).not.toBe(hash32("b"));
    expect(hash32("resource-seed:0")).not.toBe(hash32("resource-seed:1"));
  });

  it("handles the empty string without throwing", () => {
    expect(() => hash32("")).not.toThrow();
  });
});

describe("mulberry32", () => {
  it("produces an identical sequence for the same seed, across independent instances", () => {
    const a = mulberry32(42);
    const b = mulberry32(42);
    const seqA = Array.from({ length: 20 }, () => a.next());
    const seqB = Array.from({ length: 20 }, () => b.next());
    expect(seqA).toEqual(seqB);
  });

  it("diverges for different seeds", () => {
    const a = mulberry32(1);
    const b = mulberry32(2);
    const seqA = Array.from({ length: 10 }, () => a.next());
    const seqB = Array.from({ length: 10 }, () => b.next());
    expect(seqA).not.toEqual(seqB);
  });

  it("next() returns a float in [0, 1)", () => {
    const rng = mulberry32(7);
    for (let i = 0; i < 1000; i++) {
      const value = rng.next();
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });

  it("int() stays within an inclusive range and hits every value over many rolls", () => {
    const rng = mulberry32(123);
    const seen = new Set<number>();
    for (let i = 0; i < 2000; i++) {
      const value = rng.int(1, 6);
      expect(Number.isInteger(value)).toBe(true);
      expect(value).toBeGreaterThanOrEqual(1);
      expect(value).toBeLessThanOrEqual(6);
      seen.add(value);
    }
    expect(seen.size).toBe(6);
  });

  it("int() with min === max always returns that value", () => {
    const rng = mulberry32(5);
    expect(rng.int(3, 3)).toBe(3);
  });

  it("pick() only ever returns items from the given array", () => {
    const rng = mulberry32(99);
    const items = ["a", "b", "c"] as const;
    for (let i = 0; i < 100; i++) {
      expect(items).toContain(rng.pick(items));
    }
  });

  it("pick() throws on an empty array", () => {
    const rng = mulberry32(1);
    expect(() => rng.pick([])).toThrow();
  });

  it("hash32 + mulberry32 together are deterministic — the actual generator usage pattern", () => {
    // Mirrors CLAUDE.md §5: rngSeed = hash32(resource.seed + ":" + i).
    const seedA = hash32("resource-seed:3");
    const seedB = hash32("resource-seed:3");
    const rngA = mulberry32(seedA);
    const rngB = mulberry32(seedB);
    expect(Array.from({ length: 5 }, () => rngA.next())).toEqual(
      Array.from({ length: 5 }, () => rngB.next()),
    );
  });

  it("different record indices produce different sequences", () => {
    const rngForRecord0 = mulberry32(hash32("resource-seed:0"));
    const rngForRecord1 = mulberry32(hash32("resource-seed:1"));
    expect(rngForRecord0.next()).not.toBe(rngForRecord1.next());
  });
});
