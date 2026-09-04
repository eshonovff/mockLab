// The field type union, option schemas, and generator/descriptor TYPES — split out from
// fields.ts (which also imports @faker-js/faker for the actual generator functions) so that
// anything needing only validation shapes (lib/validators.ts, and eventually the schema
// builder UI's live validation) doesn't drag faker's locale data into a client bundle just to
// check that an `enum` field's `values` array is non-empty. fields.ts re-exports everything
// here, so lib/generator/record.ts and other generation-path consumers are unaffected.
//
// Pure module: no imports from Next, Prisma, or React (CLAUDE.md §3's hard rule for everything
// under lib/generator/).

import { z } from "zod";

import type { Rng } from "./rng";

// ---------------------------------------------------------------------------------------------
// Option schemas — the single source of truth for both the per-type options TYPE (inferred
// below) and the runtime schema the builder UI validates against (CLAUDE.md §9: "parse input
// with zod"). NOT re-validated on every generated record — that would add per-record overhead
// against the exact perf goal CLAUDE.md §1 describes (a million records for a few bytes).
// Validate once, at schema-authoring time (task 4.3+); trust the schema during generation.

const emptyOptions = z.object({}).strict();

export const optionsSchemas = {
  index: emptyOptions,
  uuid: emptyOptions,
  firstName: emptyOptions,
  lastName: emptyOptions,
  fullName: emptyOptions,
  email: emptyOptions,
  phone: emptyOptions,
  avatar: emptyOptions,
  image: z
    .object({
      width: z.number().int().positive().optional(),
      height: z.number().int().positive().optional(),
    })
    .strict(),
  city: emptyOptions,
  country: emptyOptions,
  street: emptyOptions,
  word: emptyOptions,
  sentence: z
    .object({
      min: z.number().int().positive().optional(),
      max: z.number().int().positive().optional(),
    })
    .strict(),
  paragraph: z
    .object({
      min: z.number().int().positive().optional(),
      max: z.number().int().positive().optional(),
    })
    .strict(),
  number: z.object({ min: z.number().optional(), max: z.number().optional() }).strict(),
  price: z
    .object({
      min: z.number().optional(),
      max: z.number().optional(),
      symbol: z.string().optional(),
    })
    .strict(),
  boolean: z.object({ probability: z.number().min(0).max(1).optional() }).strict(),
  date: z.object({ from: z.string().optional(), to: z.string().optional() }).strict(),
  enum: z.object({ values: z.array(z.string()).min(1) }).strict(),
  static: z.object({ value: z.unknown() }).strict(),
  template: z.object({ template: z.string().min(1) }).strict(),
} as const;

export type FieldType = keyof typeof optionsSchemas;

export type FieldOptionsMap = { [K in FieldType]: z.infer<(typeof optionsSchemas)[K]> };

export type FieldContext = {
  /** The record's index within its resource — also what the `index` field type returns. */
  index: number;
  /** The resource's fake-data locale (independent of the UI language — CLAUDE.md §7). */
  locale: string;
  /**
   * Every field already generated for this record so far, keyed by field name. `template`
   * fields read from this to interpolate `{{fieldName}}` placeholders, which is why field
   * order in the schema matters: a template can only reference fields defined earlier in it.
   */
  values: Readonly<Record<string, unknown>>;
};

export type FieldGenerator<T extends FieldType> = (
  rng: Rng,
  options: FieldOptionsMap[T],
  ctx: FieldContext,
) => unknown;

export type FieldTypeDescriptor = {
  type: FieldType;
  labelKey: string;
  optionsSchema: (typeof optionsSchemas)[FieldType];
};

// For the builder UI: one descriptor per type, in the same order as `optionsSchemas`, so a
// picker built from this array has a stable, predictable order.
export const FIELD_TYPES: FieldTypeDescriptor[] = (Object.keys(optionsSchemas) as FieldType[]).map(
  (type) => ({
    type,
    labelKey: `generator.fieldTypes.${type}`,
    optionsSchema: optionsSchemas[type],
  }),
);
