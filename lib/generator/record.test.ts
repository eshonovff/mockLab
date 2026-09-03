import { describe, expect, it } from "vitest";

import { generateRange, generateRecord, type ResourceSchema } from "./record";

const SCHEMA: ResourceSchema = {
  fields: [
    { name: "title", type: "sentence", options: { min: 3, max: 5 } },
    { name: "status", type: "enum", options: { values: ["draft", "published"] } },
    { name: "price", type: "price", options: { min: 1, max: 100, symbol: "$" } },
    { name: "inStock", type: "boolean", options: {} },
  ],
};

describe("generateRecord", () => {
  it("is deterministic for the same schema, seed and index", () => {
    const a = generateRecord(SCHEMA, "resource-seed", 3);
    const b = generateRecord(SCHEMA, "resource-seed", 3);
    expect(a).toEqual(b);
  });

  it("diverges across different indices", () => {
    const a = generateRecord(SCHEMA, "resource-seed", 0);
    const b = generateRecord(SCHEMA, "resource-seed", 1);
    expect(a).not.toEqual(b);
  });

  it("diverges across different seeds for the same index", () => {
    const a = generateRecord(SCHEMA, "seed-a", 0);
    const b = generateRecord(SCHEMA, "seed-b", 0);
    expect(a.id).not.toBe(b.id);
  });

  it("carries an id regardless of the schema", () => {
    const record = generateRecord(SCHEMA, "resource-seed", 0);
    expect(typeof record.id).toBe("string");
    expect((record.id as string).length).toBeGreaterThan(0);
  });

  it("includes every schema field by name", () => {
    const record = generateRecord(SCHEMA, "resource-seed", 0);
    expect(Object.keys(record).sort()).toEqual(["id", "inStock", "price", "status", "title"]);
  });

  it("a field literally named 'id' in the schema never overrides the generated id", () => {
    const schema: ResourceSchema = {
      fields: [{ name: "id", type: "static", options: { value: "user-supplied" } }],
    };
    const record = generateRecord(schema, "resource-seed", 0);
    expect(record.id).not.toBe("user-supplied");
    expect(typeof record.id).toBe("string");
  });

  it("keeps the same id even if the schema's field list changes", () => {
    const withOneField: ResourceSchema = {
      fields: [{ name: "title", type: "word", options: {} }],
    };
    const withTwoFields: ResourceSchema = {
      fields: [
        { name: "title", type: "word", options: {} },
        { name: "extra", type: "word", options: {} },
      ],
    };
    const a = generateRecord(withOneField, "resource-seed", 7);
    const b = generateRecord(withTwoFields, "resource-seed", 7);
    expect(a.id).toBe(b.id);
  });

  it("respects the resource's locale", () => {
    const enRecord = generateRecord({ ...SCHEMA, locale: "en" }, "resource-seed", 0);
    const ruRecord = generateRecord({ ...SCHEMA, locale: "ru" }, "resource-seed", 0);
    // Same seed/index, different locale — the underlying rng draws align, but the fake data
    // vocabulary faker pulls from differs, so the two title strings should differ.
    expect(enRecord.title).not.toBe(ruRecord.title);
  });
});

describe("generateRange", () => {
  it("is deterministic across two separate calls", () => {
    const a = generateRange(SCHEMA, "resource-seed", 0, 20);
    const b = generateRange(SCHEMA, "resource-seed", 0, 20);
    expect(a).toEqual(b);
  });

  it("is half-open: [from, to)", () => {
    const range = generateRange(SCHEMA, "resource-seed", 5, 8);
    expect(range).toHaveLength(3);
  });

  it("returns an empty array when from === to", () => {
    expect(generateRange(SCHEMA, "resource-seed", 5, 5)).toEqual([]);
  });

  it("a record fetched by index matches the same record inside a page containing it", () => {
    const page = generateRange(SCHEMA, "resource-seed", 0, 10);
    const single = generateRecord(SCHEMA, "resource-seed", 5);
    expect(page[5]).toEqual(single);
  });

  it("a record matches even when fetched inside a different, later page", () => {
    const firstPage = generateRange(SCHEMA, "resource-seed", 0, 10);
    const secondPage = generateRange(SCHEMA, "resource-seed", 10, 20);
    const single = generateRecord(SCHEMA, "resource-seed", 14);
    expect(secondPage[4]).toEqual(single);
    expect(firstPage).not.toContainEqual(single);
  });
});
