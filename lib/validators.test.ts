import { describe, expect, it } from "vitest";

import type { FieldType } from "@/lib/generator/field-types";
import { resourceNameSchema, resourceSchemaSchema, schemaPreviewSchema } from "@/lib/validators";

// Minimal valid options per type — mirrors lib/generator/fields.test.ts's CASES table, which
// already establishes what each type actually needs to be usable.
const MINIMAL_OPTIONS: Record<FieldType, unknown> = {
  index: {},
  uuid: {},
  firstName: {},
  lastName: {},
  fullName: {},
  email: {},
  phone: {},
  avatar: {},
  image: {},
  city: {},
  country: {},
  street: {},
  word: {},
  sentence: {},
  paragraph: {},
  number: {},
  price: {},
  boolean: {},
  date: {},
  enum: { values: ["a", "b"] },
  static: { value: "x" },
  template: { template: "{{ref}}" },
};

function fieldOf(type: FieldType, name = "field") {
  return { name, type, options: MINIMAL_OPTIONS[type] };
}

describe("resourceSchemaSchema — field names", () => {
  it.each([
    ["title", true],
    ["inStock", true],
    ["first_name", true],
    ["a", true],
    ["Title", false], // must start lowercase
    ["1field", false], // must start with a letter
    ["field-name", false], // hyphens not allowed
    ["", false], // empty
    ["field name", false], // spaces not allowed
  ])("%s -> valid=%s", (name, valid) => {
    const result = resourceSchemaSchema.safeParse({ fields: [fieldOf("word", name)] });
    expect(result.success).toBe(valid);
  });

  it("rejects duplicate field names within one resource", () => {
    const result = resourceSchemaSchema.safeParse({
      fields: [fieldOf("word", "title"), fieldOf("number", "title")],
    });
    expect(result.success).toBe(false);
  });

  it("accepts distinct field names, including two fields of the same type", () => {
    const result = resourceSchemaSchema.safeParse({
      fields: [fieldOf("word", "title"), fieldOf("word", "subtitle")],
    });
    expect(result.success).toBe(true);
  });
});

describe("resourceSchemaSchema — field count", () => {
  it("accepts exactly 30 fields", () => {
    const fields = Array.from({ length: 30 }, (_, i) => fieldOf("word", `field${i}`));
    expect(resourceSchemaSchema.safeParse({ fields }).success).toBe(true);
  });

  it("rejects 31 fields", () => {
    const fields = Array.from({ length: 31 }, (_, i) => fieldOf("word", `field${i}`));
    expect(resourceSchemaSchema.safeParse({ fields }).success).toBe(false);
  });

  it("accepts zero fields — no minimum is specified by the task", () => {
    expect(resourceSchemaSchema.safeParse({ fields: [] }).success).toBe(true);
  });
});

describe("resourceSchemaSchema — options validated per field type", () => {
  it("accepts every registered field type with its own minimal valid options", () => {
    for (const type of Object.keys(MINIMAL_OPTIONS) as FieldType[]) {
      const result = resourceSchemaSchema.safeParse({ fields: [fieldOf(type)] });
      expect(result.success, `${type} should be accepted`).toBe(true);
    }
  });

  it("rejects an enum field with no values", () => {
    const result = resourceSchemaSchema.safeParse({
      fields: [{ name: "status", type: "enum", options: {} }],
    });
    expect(result.success).toBe(false);
  });

  it("rejects options from a different field type (enum options on a date field)", () => {
    const result = resourceSchemaSchema.safeParse({
      fields: [{ name: "when", type: "date", options: { values: ["a", "b"] } }],
    });
    expect(result.success).toBe(false);
  });

  it("rejects an unknown option key on a strict type", () => {
    const result = resourceSchemaSchema.safeParse({
      fields: [{ name: "title", type: "word", options: { madeUpOption: true } }],
    });
    expect(result.success).toBe(false);
  });

  it("rejects an unregistered field type", () => {
    const result = resourceSchemaSchema.safeParse({
      fields: [{ name: "title", type: "essay", options: {} }],
    });
    expect(result.success).toBe(false);
  });
});

describe("resourceNameSchema", () => {
  it.each([
    ["products", true],
    ["blog-posts", true],
    ["a1", true],
    ["a", true],
    ["Products", false], // must be lowercase
    ["-products", false], // no leading hyphen
    ["products-", false], // no trailing hyphen
    ["blog--posts", false], // no double hyphen
    ["blog_posts", false], // underscores not allowed (slug, not a field name)
    ["", false],
    ["a".repeat(61), false], // over the 60-char cap
  ])("%s -> valid=%s", (name, valid) => {
    expect(resourceNameSchema.safeParse(name).success).toBe(valid);
  });

  it.each(["auth", "admin", "api"])("rejects the reserved word %s", (name) => {
    expect(resourceNameSchema.safeParse(name).success).toBe(false);
  });
});

describe("schemaPreviewSchema", () => {
  const valid = {
    schema: { fields: [{ name: "title", type: "word", options: {} }] },
    seed: "preview-seed",
    locale: "en",
  };

  it("accepts a schema, seed, and locale together", () => {
    expect(schemaPreviewSchema.safeParse(valid).success).toBe(true);
  });

  it("requires seed", () => {
    const { seed: _seed, ...rest } = valid;
    expect(schemaPreviewSchema.safeParse(rest).success).toBe(false);
  });

  it("requires locale", () => {
    const { locale: _locale, ...rest } = valid;
    expect(schemaPreviewSchema.safeParse(rest).success).toBe(false);
  });

  it("still enforces resourceSchemaSchema's own rules on the nested schema", () => {
    const invalid = {
      ...valid,
      schema: { fields: [{ name: "Bad Name", type: "word", options: {} }] },
    };
    expect(schemaPreviewSchema.safeParse(invalid).success).toBe(false);
  });
});
