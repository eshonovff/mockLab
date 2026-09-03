// Turns a resource's schema into actual records. Pure module: no imports from Next, Prisma, or
// React (CLAUDE.md §3's hard rule for everything under lib/generator/).

import { FIELDS, type FieldContext, type FieldOptionsMap, type FieldType } from "./fields";
import { hash32, mulberry32 } from "./rng";

// The union of "one field entry per type", built the same way fields.ts builds FieldOptionsMap
// — so a field's `type` and `options` stay correlated (an `enum` field can't be typed with a
// `date` field's options) without a `Record<FieldType, X>` flattening them into one loose shape.
export type SchemaField = {
  [K in FieldType]: { name: string; type: K; options: FieldOptionsMap[K] };
}[FieldType];

export type ResourceSchema = {
  fields: SchemaField[];
  /** Fake-data locale (CLAUDE.md §7) — independent of the UI language. Defaults to "en". */
  locale?: string;
};

// A separate helper, generic over T, is what actually gets TypeScript to check `field.options`
// against `field.options`'s own field type `T` instead of the flattened union of every type's
// options — calling FIELDS[field.type](...) directly inside the generateRecord loop below,
// with `field` typed as the SchemaField union, does not type-check (T can't be inferred
// per-iteration from a union-typed loop variable).
function generateFieldValue<T extends FieldType>(
  field: { name: string; type: T; options: FieldOptionsMap[T] },
  rng: ReturnType<typeof mulberry32>,
  ctx: FieldContext,
): unknown {
  return FIELDS[field.type](rng, field.options, ctx);
}

/**
 * One record, fully generated: an `id` plus every field in `schema.fields`, in field order.
 *
 * `id` is derived from its own rng, seeded from `seed + ":id:" + index` — independent of the
 * data rng derived from `seed + ":" + index`. That keeps the id stable even if the schema's
 * field list changes (adding/removing a field would otherwise shift how many `next()` draws
 * happen before any field that came later, silently changing every downstream value including
 * an id drawn from the same sequence).
 *
 * `id` always wins over a same-named field in the schema — "every record carries an id...
 * regardless of the schema" (TASKS.md 3.3) means a user-defined field literally named "id"
 * must not be able to shadow it.
 */
export function generateRecord(
  schema: ResourceSchema,
  seed: string,
  index: number,
): Record<string, unknown> {
  const locale = schema.locale ?? "en";

  const idRng = mulberry32(hash32(`${seed}:id:${index}`));
  const idCtx: FieldContext = { index, locale, values: {} };
  // FIELDS.uuid always returns a string (it's faker's string.uuid()) — safe to narrow here.
  const id = FIELDS.uuid(idRng, {}, idCtx) as string;

  const dataRng = mulberry32(hash32(`${seed}:${index}`));
  const values: Record<string, unknown> = {};
  const ctx: FieldContext = { index, locale, values };

  for (const field of schema.fields) {
    values[field.name] = generateFieldValue(field, dataRng, ctx);
  }

  const record: Record<string, unknown> = { id, ...values };
  record.id = id; // reasserted: a field named "id" in `values` must not override it.
  return record;
}

/**
 * Records for index range `[from, to)` — half-open, like a normal array slice. Each record is
 * generated independently via `generateRecord`, so a record fetched on its own by index is
 * always identical to the same record produced inside a range that happens to include it.
 */
export function generateRange(
  schema: ResourceSchema,
  seed: string,
  from: number,
  to: number,
): Record<string, unknown>[] {
  const records: Record<string, unknown>[] = [];
  for (let index = from; index < to; index++) {
    records.push(generateRecord(schema, seed, index));
  }
  return records;
}
