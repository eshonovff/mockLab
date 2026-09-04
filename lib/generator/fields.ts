// The field type registry: every value a resource's schema can generate, one entry per type,
// per CLAUDE.md §5. "Adding a type must never require editing anything else" outside this pair
// of files — the type union and option schemas live in field-types.ts (pure, no faker); the
// actual generator functions live here, since they need @faker-js/faker. Re-exports everything
// from field-types.ts so existing consumers (lib/generator/record.ts, this file's own tests)
// can keep importing types, schemas, and the registry from one place.
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

import type { Rng } from "./rng";
import type { FieldGenerator, FieldType } from "./field-types";

export * from "./field-types";

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
