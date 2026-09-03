// The field type registry: every value a resource's schema can generate, one entry per type,
// per CLAUDE.md §5. "Adding a type must never require editing anything else" outside this
// file — the type union, the option schema, and the generator all live in one place.
//
// Pure module: no imports from Next, Prisma, or React (CLAUDE.md §3's hard rule for everything
// under lib/generator/). @faker-js/faker and zod are both pure npm libraries, so neither
// violates that rule.

import {
  Faker,
  base,
  en,
  ru,
  uz_UZ_latin as uz,
  type LocaleDefinition,
  type Randomizer,
} from "@faker-js/faker";
import { z } from "zod";

import type { Rng } from "./rng";

/**
 * faker-js ships locale packs for `en`, `ru`, and `uz` (as `uz_UZ_latin`) among our six UI
 * locales (CLAUDE.md §7) — it has no `tg`, `ky`, or `kk` pack. Until faker adds
 * Tajik/Kyrgyz/Kazakh (or we author a custom LocaleDefinition — real work, out of scope for
 * this task), those three fall back to `ru`: same Cyrillic script and the closest
 * cultural/geographic match of what's actually available, a better fit than falling back to
 * `en`. This is a judgment call, not a spec answer — flagged in PROGRESS.md for native-speaker
 * review, same as the UI translation flags in CLAUDE.md §7.
 */
const FAKER_LOCALES: Record<string, LocaleDefinition> = {
  en,
  ru,
  uz,
  tg: ru,
  ky: ru,
  kk: ru,
};

function createScopedFaker(rng: Rng, locale: string): Faker {
  const primary = FAKER_LOCALES[locale] ?? en;

  // Faker only calls `randomizer.seed()` when a `seed` option is *also* passed to
  // `new Faker(...)` (see @faker-js/faker's SimpleFaker constructor). We never pass `seed` —
  // this Rng is already seeded deterministically by the caller — so `seed()` here is
  // unreachable in practice. It exists only to satisfy the Randomizer interface.
  const randomizer: Randomizer = {
    next: () => rng.next(),
    seed: () => {},
  };

  // A single locale pack can be sparse (it doesn't redefine every category). Falling back
  // through `en`, then `base`, avoids faker's LocaleProxy throwing on an undefined property.
  return new Faker({ locale: [primary, en, base], randomizer });
}

// ---------------------------------------------------------------------------------------------
// Option schemas — the single source of truth for both the per-type options TYPE (inferred
// below) and the runtime schema the builder UI validates against (CLAUDE.md §9: "parse input
// with zod"). NOT re-validated on every generated record — that would add per-record overhead
// against the exact perf goal CLAUDE.md §1 describes (a million records for a few bytes).
// Validate once, at schema-authoring time (task 4.x); trust the schema during generation.

const emptyOptions = z.object({}).strict();

const optionsSchemas = {
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

// Fixed literal bounds, never `Date.now()` / `new Date()` — a default tied to the wall clock
// would make the same record index generate a different date on different days, breaking the
// same determinism guarantee rng.ts exists for.
const DEFAULT_DATE_FROM = "2015-01-01T00:00:00.000Z";
const DEFAULT_DATE_TO = "2025-01-01T00:00:00.000Z";

const TEMPLATE_PLACEHOLDER = /\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g;

export const FIELDS: { [K in FieldType]: FieldGenerator<K> } = {
  index: (_rng, _options, ctx) => ctx.index,

  uuid: (rng, _options, ctx) => createScopedFaker(rng, ctx.locale).string.uuid(),

  firstName: (rng, _options, ctx) => createScopedFaker(rng, ctx.locale).person.firstName(),

  lastName: (rng, _options, ctx) => createScopedFaker(rng, ctx.locale).person.lastName(),

  fullName: (rng, _options, ctx) => createScopedFaker(rng, ctx.locale).person.fullName(),

  email: (rng, _options, ctx) => createScopedFaker(rng, ctx.locale).internet.email(),

  phone: (rng, _options, ctx) => createScopedFaker(rng, ctx.locale).phone.number(),

  avatar: (rng, _options, ctx) => createScopedFaker(rng, ctx.locale).image.avatar(),

  image: (rng, options, ctx) =>
    createScopedFaker(rng, ctx.locale).image.url({ width: options.width, height: options.height }),

  city: (rng, _options, ctx) => createScopedFaker(rng, ctx.locale).location.city(),

  country: (rng, _options, ctx) => createScopedFaker(rng, ctx.locale).location.country(),

  street: (rng, _options, ctx) => createScopedFaker(rng, ctx.locale).location.streetAddress(),

  word: (rng, _options, ctx) => createScopedFaker(rng, ctx.locale).word.sample(),

  sentence: (rng, options, ctx) =>
    createScopedFaker(rng, ctx.locale).lorem.sentence(
      options.min !== undefined || options.max !== undefined
        ? { min: options.min ?? 3, max: options.max ?? 10 }
        : undefined,
    ),

  paragraph: (rng, options, ctx) =>
    createScopedFaker(rng, ctx.locale).lorem.paragraph(
      options.min !== undefined || options.max !== undefined
        ? { min: options.min ?? 2, max: options.max ?? 5 }
        : undefined,
    ),

  number: (rng, options, ctx) =>
    createScopedFaker(rng, ctx.locale).number.int({
      min: options.min ?? 0,
      max: options.max ?? 1000,
    }),

  price: (rng, options, ctx) =>
    createScopedFaker(rng, ctx.locale).commerce.price({
      min: options.min ?? 1,
      max: options.max ?? 1000,
      symbol: options.symbol ?? "",
    }),

  boolean: (rng, options, ctx) =>
    createScopedFaker(rng, ctx.locale).datatype.boolean(options.probability),

  date: (rng, options, ctx) =>
    createScopedFaker(rng, ctx.locale)
      .date.between({ from: options.from ?? DEFAULT_DATE_FROM, to: options.to ?? DEFAULT_DATE_TO })
      .toISOString(),

  enum: (rng, options) => rng.pick(options.values),

  static: (_rng, options) => options.value,

  template: (_rng, options, ctx) =>
    options.template.replace(TEMPLATE_PLACEHOLDER, (_match, fieldName: string) => {
      if (!(fieldName in ctx.values)) {
        throw new Error(
          `template references unknown field "${fieldName}" — it must be defined earlier in the schema`,
        );
      }
      return String(ctx.values[fieldName]);
    }),
};

export type FieldTypeDescriptor = {
  type: FieldType;
  labelKey: string;
  optionsSchema: (typeof optionsSchemas)[FieldType];
};

// For the builder UI (task 3.2's own requirement): one descriptor per type, in the same order
// fields were declared above, so a picker built from this array has a stable, predictable order.
export const FIELD_TYPES: FieldTypeDescriptor[] = (Object.keys(optionsSchemas) as FieldType[]).map(
  (type) => ({
    type,
    labelKey: `generator.fieldTypes.${type}`,
    optionsSchema: optionsSchemas[type],
  }),
);
