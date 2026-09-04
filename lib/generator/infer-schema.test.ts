import { describe, expect, it } from "vitest";

import { resourceSchemaSchema } from "@/lib/validators";

import { inferSchema } from "./infer-schema";

function fieldByName(fields: ReturnType<typeof inferSchema>["fields"], name: string) {
  const field = fields.find((f) => f.name === name);
  if (!field) throw new Error(`no inferred field named "${name}"`);
  return field;
}

describe("inferSchema — string pattern recognition", () => {
  it("recognizes email addresses", () => {
    const result = inferSchema([{ contact: "a@example.com" }, { contact: "b@example.org" }]);
    expect(fieldByName(result.fields, "contact")).toMatchObject({ type: "email", options: {} });
  });

  it("recognizes avatar-shaped image URLs", () => {
    const result = inferSchema([
      { photo: "https://example.com/u/1.jpg" },
      { photo: "https://example.com/u/2.png" },
    ]);
    expect(fieldByName(result.fields, "photo")).toMatchObject({ type: "avatar", options: {} });
  });

  it("recognizes ISO date strings", () => {
    const result = inferSchema([
      { createdAt: "2024-01-15T10:30:00Z" },
      { createdAt: "2024-02-20T08:00:00Z" },
    ]);
    expect(fieldByName(result.fields, "createdAt")).toMatchObject({ type: "date", options: {} });
  });

  it("recognizes plain (no time) ISO dates too", () => {
    const result = inferSchema([{ day: "2024-01-15" }, { day: "2024-06-01" }]);
    expect(fieldByName(result.fields, "day")).toMatchObject({ type: "date", options: {} });
  });

  it("does not misclassify a random string as a date", () => {
    const result = inferSchema([{ note: "not a date at all" }, { note: "also not a date" }]);
    expect(fieldByName(result.fields, "note").type).not.toBe("date");
  });
});

describe("inferSchema — numbers", () => {
  it("infers number with min/max from the sample", () => {
    const result = inferSchema([{ age: 25 }, { age: 40 }, { age: 31 }]);
    expect(fieldByName(result.fields, "age")).toMatchObject({
      type: "number",
      options: { min: 25, max: 40 },
    });
  });

  it("rounds decimal samples to integer bounds (the number type only generates integers)", () => {
    const result = inferSchema([{ rating: 3.2 }, { rating: 4.8 }]);
    const field = fieldByName(result.fields, "rating");
    expect(field.type).toBe("number");
    if (field.type === "number") {
      expect(field.options.min).toBe(3);
      expect(field.options.max).toBe(5);
    }
  });
});

describe("inferSchema — booleans", () => {
  it("infers boolean for an all-boolean column", () => {
    const result = inferSchema([{ active: true }, { active: false }, { active: true }]);
    expect(fieldByName(result.fields, "active")).toMatchObject({ type: "boolean", options: {} });
  });
});

describe("inferSchema — short repeated strings become enum", () => {
  it("infers enum when a string value repeats across the sample", () => {
    const result = inferSchema([
      { status: "draft" },
      { status: "published" },
      { status: "draft" },
      { status: "archived" },
    ]);
    const field = fieldByName(result.fields, "status");
    expect(field.type).toBe("enum");
    if (field.type === "enum") {
      expect(field.options.values).toEqual(["draft", "published", "archived"]);
    }
  });

  it("does not infer enum when every value is different (no repetition)", () => {
    const result = inferSchema([{ code: "AAA" }, { code: "BBB" }, { code: "CCC" }]);
    expect(fieldByName(result.fields, "code").type).not.toBe("enum");
  });

  it("does not infer enum when a repeated string is too long", () => {
    const long = "a".repeat(40);
    const result = inferSchema([{ bio: long }, { bio: long }, { bio: "short" }]);
    expect(fieldByName(result.fields, "bio").type).not.toBe("enum");
  });

  it("does not infer enum past the distinct-value cap", () => {
    // 11 distinct values, each repeated once — repetition exists but there are too many
    // distinct values for this to plausibly be a fixed set of options.
    const samples = Array.from({ length: 22 }, (_, i) => ({ tag: `tag${i % 11}` }));
    expect(fieldByName(inferSchema(samples).fields, "tag").type).not.toBe("enum");
  });
});

describe("inferSchema — fallbacks", () => {
  it("infers static for a single JSON object (no array to show variation)", () => {
    const result = inferSchema({ title: "A specific one-off value that will not repeat" });
    expect(fieldByName(result.fields, "title")).toMatchObject({
      type: "static",
      options: { value: "A specific one-off value that will not repeat" },
    });
  });

  it("infers static when a long value never varies across the sample", () => {
    const constant = "the same long description every single time, no repetition needed";
    const result = inferSchema([{ blurb: constant }, { blurb: constant }]);
    expect(fieldByName(result.fields, "blurb")).toMatchObject({
      type: "static",
      options: { value: constant },
    });
  });

  it("infers sentence for varied strings that don't match any recognized pattern", () => {
    const result = inferSchema([
      { bio: "Loves long walks on the beach and reading books." },
      { bio: "Enjoys hiking, coding, and playing the guitar." },
      { bio: "Passionate about cooking and traveling the world." },
    ]);
    expect(fieldByName(result.fields, "bio")).toMatchObject({ type: "sentence", options: {} });
  });

  it("falls back to word for an all-null/missing column", () => {
    const result = inferSchema([{ note: null }, {}]);
    expect(fieldByName(result.fields, "note")).toMatchObject({ type: "word", options: {} });
  });

  it("freezes mixed-type values as static and records a warning", () => {
    const result = inferSchema([{ value: "text" }, { value: 42 }]);
    const field = fieldByName(result.fields, "value");
    expect(field.type).toBe("static");
    expect(result.warnings.some((w) => w.includes('"value"'))).toBe(true);
  });

  it("freezes nested objects/arrays as static and records a warning", () => {
    const result = inferSchema([{ address: { city: "Berlin" } }, { address: { city: "Paris" } }]);
    const field = fieldByName(result.fields, "address");
    expect(field.type).toBe("static");
    expect(result.warnings.some((w) => w.includes('"address"'))).toBe(true);
  });
});

describe("inferSchema — field name sanitization", () => {
  it("lowercases the first character of a camelCase-ish key", () => {
    const result = inferSchema([{ UserId: 1 }]);
    expect(result.fields[0]?.name).toBe("userId");
  });

  it("replaces invalid characters and strips a leading digit/underscore", () => {
    const result = inferSchema([{ "2fa enabled": true }]);
    // The raw key becomes "2fa_enabled" after character replacement, doesn't match the
    // must-start-with-a-letter rule, so it's prefixed rather than silently mangled further.
    expect(result.fields[0]?.name).toMatch(/^[a-z][a-zA-Z0-9_]*$/);
  });

  it("de-duplicates names that sanitize to the same value", () => {
    const result = inferSchema([{ "user id": 1, "user-id": 2 }]);
    const names = result.fields.map((f) => f.name);
    expect(new Set(names).size).toBe(names.length);
  });
});

describe("inferSchema — field count cap", () => {
  it("caps at 30 fields and warns when the sample has more", () => {
    const sample: Record<string, number> = {};
    for (let i = 0; i < 35; i++) sample[`field${i}`] = i;
    const result = inferSchema([sample]);
    expect(result.fields).toHaveLength(30);
    expect(result.warnings.some((w) => w.includes("30"))).toBe(true);
  });
});

describe("inferSchema — input shape", () => {
  it("throws when given something that isn't an object or an array of objects", () => {
    expect(() => inferSchema("just a string")).toThrow();
    expect(() => inferSchema(42)).toThrow();
    expect(() => inferSchema([1, 2, 3])).toThrow();
  });

  it("accepts a plain array of objects, using the union of all their keys", () => {
    const result = inferSchema([{ a: 1 }, { b: "x" }]);
    const names = result.fields.map((f) => f.name);
    expect(names).toEqual(["a", "b"]);
  });
});

describe("inferSchema — output is always accepted by the server's own validator", () => {
  it.each([
    [
      "a realistic mixed sample",
      [
        {
          id: 1,
          email: "a@example.com",
          avatar: "https://example.com/a.jpg",
          createdAt: "2024-01-01T00:00:00Z",
          status: "active",
          age: 30,
          verified: true,
          bio: "Loves long walks on the beach and reading books about history.",
          tags: ["a", "b"],
        },
        {
          id: 2,
          email: "b@example.com",
          avatar: "https://example.com/b.png",
          createdAt: "2024-02-01T00:00:00Z",
          status: "inactive",
          age: 45,
          verified: false,
          bio: "Enjoys hiking, coding, and playing the guitar on weekends.",
          tags: ["c"],
        },
      ],
    ],
    ["a single bare object", { name: "Only One" }],
    ["messy keys needing sanitization", [{ "User ID!": 1, "2nd-field": "x" }]],
  ])("%s", (_label, sample) => {
    const { fields } = inferSchema(sample);
    const result = resourceSchemaSchema.safeParse({ fields });
    expect(result.success).toBe(true);
  });
});
