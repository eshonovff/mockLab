import { execFileSync } from "node:child_process";

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
  it("produces an identical sequence for the same seed, across independent closures in one process", () => {
    const a = mulberry32(42);
    const b = mulberry32(42);
    const seqA = Array.from({ length: 20 }, () => a.next());
    const seqB = Array.from({ length: 20 }, () => b.next());
    expect(seqA).toEqual(seqB);
  });

  // The test above only proves two closures from the same module instance agree — it says
  // nothing about a genuinely separate module/process, which is the actual claim CLAUDE.md §5
  // depends on ("the same input always produces the same record, on any machine, in any
  // process"). ESM module caching means we can't get a second instance of rng.ts within this
  // vitest process, so this spawns a real child OS process, re-implements the same two
  // functions inline (no import — a separate process can't share this file's module registry
  // anyway), and diffs its output against the in-process result. This is what actually rules
  // out reliance on any process-local state (there is none — no globals, no I/O — but this is
  // the test that would catch it if that ever became false).
  it("produces an identical sequence when re-computed in a separate OS process", () => {
    const rng = mulberry32(hash32("resource-seed:3"));
    const inProcess = Array.from({ length: 5 }, () => rng.next());

    const script = `
      function hash32(input) {
        let hash = 0x811c9dc5;
        for (let i = 0; i < input.length; i++) {
          hash ^= input.charCodeAt(i);
          hash = Math.imul(hash, 0x01000193);
        }
        return hash >>> 0;
      }
      function mulberry32(seed) {
        let state = seed >>> 0;
        return function next() {
          state = (state + 0x6d2b79f5) | 0;
          let t = Math.imul(state ^ (state >>> 15), 1 | state);
          t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
          return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
        };
      }
      const next = mulberry32(hash32("resource-seed:3"));
      const out = Array.from({ length: 5 }, () => next());
      process.stdout.write(JSON.stringify(out));
    `;

    const childOutput = execFileSync(process.execPath, ["-e", script]).toString();
    expect(JSON.parse(childOutput)).toEqual(inProcess);
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
