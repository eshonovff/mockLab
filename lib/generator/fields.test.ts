import { describe, expect, it } from "vitest";

import {
  FIELD_TYPES,
  FIELDS,
  type FieldContext,
  type FieldOptionsMap,
  type FieldType,
} from "./fields";
import { hash32, mulberry32 } from "./rng";

function ctxFor(index: number, overrides: Partial<FieldContext> = {}): FieldContext {
  return { index, locale: "en", values: {}, ...overrides };
}

// Two independent rng instances from the same seed — mirrors how record.ts will actually call
// this (a fresh `mulberry32(hash32(seed + ":" + i))` per record), not two draws off one rng.
function rngFor(seed: number) {
  return mulberry32(seed);
}

describe("FIELD_TYPES", () => {
  it("has exactly one descriptor per FieldType key, in FIELDS's declaration order", () => {
    const fieldKeys = Object.keys(FIELDS);
    expect(FIELD_TYPES.map((d) => d.type)).toEqual(fieldKeys);
  });

  it("gives every descriptor a non-empty label key and an options schema", () => {
    for (const descriptor of FIELD_TYPES) {
      expect(descriptor.labelKey.length).toBeGreaterThan(0);
      expect(descriptor.optionsSchema).toBeDefined();
    }
  });
});

// T is inferred separately at each call site below, so `options` stays correctly paired with
// its own field type's option shape — no `any`, no loosening FIELDS's own signatures.
function checkStable<T extends FieldType>(type: T, options: FieldOptionsMap[T], seed: number) {
  const ctx = ctxFor(seed, { values: { ref: "R" } });
  const generate = FIELDS[type];
  const a = generate(rngFor(hash32(`seed:${seed}`)), options, ctx);
  const b = generate(rngFor(hash32(`seed:${seed}`)), options, ctx);
  expect(a).toEqual(b);
}

// One case per type, with whatever options that type needs to produce a valid value — used to
// drive the generic stability check below without special-casing each type.
const STABILITY_CASES: [FieldType, () => void][] = [
  ["index", () => checkStable("index", {}, 1)],
  ["uuid", () => checkStable("uuid", {}, 2)],
  ["firstName", () => checkStable("firstName", {}, 3)],
  ["lastName", () => checkStable("lastName", {}, 4)],
  ["fullName", () => checkStable("fullName", {}, 5)],
  ["email", () => checkStable("email", {}, 6)],
  ["phone", () => checkStable("phone", {}, 7)],
  ["avatar", () => checkStable("avatar", {}, 8)],
  ["image", () => checkStable("image", { width: 200, height: 100 }, 9)],
  ["city", () => checkStable("city", {}, 10)],
  ["country", () => checkStable("country", {}, 11)],
  ["street", () => checkStable("street", {}, 12)],
  ["word", () => checkStable("word", {}, 13)],
  ["sentence", () => checkStable("sentence", { min: 3, max: 6 }, 14)],
  ["paragraph", () => checkStable("paragraph", { min: 2, max: 4 }, 15)],
  ["number", () => checkStable("number", { min: 1, max: 100 }, 16)],
  ["price", () => checkStable("price", { min: 1, max: 100, symbol: "$" }, 17)],
  ["boolean", () => checkStable("boolean", {}, 18)],
  ["date", () => checkStable("date", {}, 19)],
  ["enum", () => checkStable("enum", { values: ["draft", "published", "archived"] }, 20)],
  ["static", () => checkStable("static", { value: "constant" }, 21)],
  ["template", () => checkStable("template", { template: "id-{{ref}}" }, 22)],
];

describe("every field type produces a stable value for a fixed seed", () => {
  it.each(STABILITY_CASES)("%s", (_type, check) => check());

  it("covers every FieldType exactly once", () => {
    expect(STABILITY_CASES.map(([type]) => type).sort()).toEqual(Object.keys(FIELDS).sort());
  });
});

describe("index", () => {
  it("returns the record's index regardless of the rng", () => {
    expect(FIELDS.index(rngFor(1), {}, ctxFor(0))).toBe(0);
    expect(FIELDS.index(rngFor(999), {}, ctxFor(41))).toBe(41);
  });
});

describe("enum", () => {
  it("only ever returns a listed value, across many draws", () => {
    const values = ["draft", "published", "archived"];
    for (let seed = 0; seed < 200; seed++) {
      const result = FIELDS.enum(rngFor(hash32(`enum:${seed}`)), { values }, ctxFor(seed));
      expect(values).toContain(result);
    }
  });
});

describe("static", () => {
  it("returns exactly the configured value, untouched", () => {
    const value = { nested: [1, 2, 3] };
    expect(FIELDS.static(rngFor(1), { value }, ctxFor(0))).toBe(value);
  });
});

describe("template", () => {
  it("interpolates {{fieldName}} placeholders from previously generated values", () => {
    const ctx = ctxFor(0, { values: { firstName: "Ada", lastName: "Lovelace" } });
    const result = FIELDS.template(rngFor(1), { template: "{{firstName}} {{lastName}}" }, ctx);
    expect(result).toBe("Ada Lovelace");
  });

  it("throws when the template references a field that isn't in ctx.values", () => {
    expect(() => FIELDS.template(rngFor(1), { template: "{{missing}}" }, ctxFor(0))).toThrow(
      /unknown field "missing"/,
    );
  });
});

describe("date", () => {
  it("produces an ISO string within the configured bounds", () => {
    const from = "2020-01-01T00:00:00.000Z";
    const to = "2020-12-31T00:00:00.000Z";
    for (let seed = 0; seed < 20; seed++) {
      const result = FIELDS.date(
        rngFor(hash32(`date:${seed}`)),
        { from, to },
        ctxFor(seed),
      ) as string;
      const time = new Date(result).getTime();
      expect(time).toBeGreaterThanOrEqual(new Date(from).getTime());
      expect(time).toBeLessThanOrEqual(new Date(to).getTime());
    }
  });
});

describe("createScopedFaker locale fallback", () => {
  it("generates without throwing for every UI locale, including the ones faker has no pack for", () => {
    for (const locale of ["en", "tg", "ru", "uz", "ky", "kk"]) {
      expect(() =>
        FIELDS.fullName(rngFor(hash32(locale)), {}, ctxFor(0, { locale })),
      ).not.toThrow();
    }
  });
});
