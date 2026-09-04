// Schema inference from sample JSON data (task 4.7) — the inverse of generation: given example
// records, guess a field list that would plausibly produce data shaped like them. Pure module:
// no imports from Next, Prisma, or React (CLAUDE.md §3's hard rule for everything under
// lib/generator/), and deliberately only from field-types.ts, not fields.ts — this runs
// entirely client-side in the import dialog, so it must not drag @faker-js/faker into that
// bundle for a feature that never generates anything itself.

import type { FieldOptionsMap, FieldType } from "./field-types";

export type InferredField = {
  [K in FieldType]: { name: string; type: K; options: FieldOptionsMap[K] };
}[FieldType];

export type InferredSchema = {
  fields: InferredField[];
  /** Human-readable notes about lossy or capped inferences — shown in the confirmation step. */
  warnings: string[];
};

// Same cap the server enforces (lib/validators.ts's MAX_SCHEMA_FIELDS) — duplicated as a
// literal rather than imported, to keep this module independent of lib/validators.ts and the
// rest of the app layer; lib/generator/* is meant to stay extractable into a separate service.
const MAX_FIELDS = 30;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// Any URL-shaped string ending in a common image extension — CLAUDE.md's task text names only
// "avatar" (not "image") as a recognizable string pattern, so any image-looking URL maps there;
// see the "avatar vs image" decision in PROGRESS.md.
const AVATAR_PATTERN = /^https?:\/\/\S+\.(png|jpe?g|gif|webp|svg|avif)(\?\S*)?$/i;
const ISO_DATE_PATTERN =
  /^\d{4}-\d{2}-\d{2}([T ]\d{2}:\d{2}(:\d{2})?(\.\d+)?(Z|[+-]\d{2}:?\d{2})?)?$/;

// "Short repeated strings to enum" (task 4.7) needs concrete thresholds the task doesn't
// specify — a judgment call, documented in PROGRESS.md, not a spec answer.
const ENUM_MAX_DISTINCT_VALUES = 10;
const ENUM_MAX_VALUE_LENGTH = 30;

const FIELD_NAME_PATTERN = /^[a-z][a-zA-Z0-9_]*$/;

/** Turns an arbitrary JSON key into a valid field name (CLAUDE.md §4.3's `^[a-z][a-zA-Z0-9_]*$`). */
function sanitizeFieldName(rawKey: string): string {
  const cleaned = rawKey.replace(/[^a-zA-Z0-9_]/g, "_").replace(/^_+/, "");
  const withLowerStart =
    cleaned.length > 0 ? cleaned.charAt(0).toLowerCase() + cleaned.slice(1) : "";
  const candidate = FIELD_NAME_PATTERN.test(withLowerStart)
    ? withLowerStart
    : `field_${withLowerStart}`;
  return FIELD_NAME_PATTERN.test(candidate) ? candidate : "field";
}

function uniqueName(base: string, used: Set<string>): string {
  if (!used.has(base)) {
    used.add(base);
    return base;
  }
  let suffix = 2;
  while (used.has(`${base}${suffix}`)) suffix += 1;
  const name = `${base}${suffix}`;
  used.add(name);
  return name;
}

function inferStringField(name: string, strings: string[]): InferredField {
  if (strings.every((value) => EMAIL_PATTERN.test(value))) {
    return { name, type: "email", options: {} };
  }
  if (strings.every((value) => AVATAR_PATTERN.test(value))) {
    return { name, type: "avatar", options: {} };
  }
  if (strings.every((value) => ISO_DATE_PATTERN.test(value) && !Number.isNaN(Date.parse(value)))) {
    return { name, type: "date", options: {} };
  }

  const distinctValues = Array.from(new Set(strings));
  const hasRepetition = distinctValues.length < strings.length;
  const allShort = distinctValues.every((value) => value.length <= ENUM_MAX_VALUE_LENGTH);
  if (
    hasRepetition &&
    allShort &&
    distinctValues.length >= 2 &&
    distinctValues.length <= ENUM_MAX_DISTINCT_VALUES
  ) {
    return { name, type: "enum", options: { values: distinctValues } };
  }

  // A single sample (no array, or an array where this key never varied) has no evidence of
  // variability to justify a random-text field — treat it as a literal constant instead.
  if (distinctValues.length === 1) {
    return { name, type: "static", options: { value: distinctValues[0] } };
  }

  return { name, type: "sentence", options: {} };
}

function inferField(name: string, values: unknown[], warnings: string[]): InferredField {
  if (values.length === 0) {
    // Every sample had this key missing or null — nothing to infer from at all.
    return { name, type: "word", options: {} };
  }

  if (values.every((value) => typeof value === "boolean")) {
    return { name, type: "boolean", options: {} };
  }

  if (values.every((value) => typeof value === "number" && Number.isFinite(value))) {
    const numbers = values as number[];
    // The `number` field type only ever generates integers (faker.number.int) regardless of
    // the sample's own precision — decimal samples (e.g. ratings, prices) lose precision here.
    // A known, accepted gap in the field registry itself, not something task 4.7 can fix.
    return {
      name,
      type: "number",
      options: { min: Math.floor(Math.min(...numbers)), max: Math.ceil(Math.max(...numbers)) },
    };
  }

  if (values.every((value) => typeof value === "string")) {
    return inferStringField(name, values as string[]);
  }

  // Mixed types across samples, or a nested object/array — none of our 22 flat field types can
  // model either one. Freeze the first sample's value as a constant rather than guessing.
  warnings.push(
    `"${name}" had mixed or unsupported value types — imported as a fixed example value.`,
  );
  return { name, type: "static", options: { value: values[0] } };
}

/**
 * Infers a resource schema from pasted sample data: a JSON array of objects, or a single JSON
 * object. Throws if `raw` isn't either of those shapes (the caller shows that as a parse error,
 * same as a malformed JSON.parse would be).
 */
export function inferSchema(raw: unknown): InferredSchema {
  const samples = Array.isArray(raw) ? raw : [raw];
  const objectSamples = samples.filter(
    (sample): sample is Record<string, unknown> =>
      typeof sample === "object" && sample !== null && !Array.isArray(sample),
  );

  if (objectSamples.length === 0) {
    throw new Error("Expected a JSON array of objects, or a single JSON object.");
  }

  const keysInOrder: string[] = [];
  const seenKeys = new Set<string>();
  for (const sample of objectSamples) {
    for (const key of Object.keys(sample)) {
      if (!seenKeys.has(key)) {
        seenKeys.add(key);
        keysInOrder.push(key);
      }
    }
  }

  const warnings: string[] = [];
  const usedNames = new Set<string>();
  const fields = keysInOrder.slice(0, MAX_FIELDS).map((key) => {
    const values = objectSamples
      .map((sample) => sample[key])
      .filter((value): value is NonNullable<typeof value> => value !== undefined && value !== null);
    const name = uniqueName(sanitizeFieldName(key), usedNames);
    return inferField(name, values, warnings);
  });

  if (keysInOrder.length > MAX_FIELDS) {
    warnings.push(
      `Only the first ${MAX_FIELDS} fields were imported (found ${keysInOrder.length}).`,
    );
  }

  return { fields, warnings };
}
