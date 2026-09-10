// Real, deterministic sample values for the landing page's field-type showcase
// (components/marketing/field-type-grid.tsx) — pulled straight from the actual generator
// (lib/generator/fields.ts) instead of hand-written example strings, so the showcase can never
// drift from what the product actually produces. Computed with a fixed seed, so a statically
// rendered build (CLAUDE.md §8.1) produces byte-identical output every time.
//
// This file is NOT part of lib/generator/ itself — it imports from it, which is fine (that
// directory's hard rule is "nothing under lib/generator/ imports Next/Prisma/React", not
// "nothing may import lib/generator/") — but it's a marketing-page concern, not part of the
// generation engine, so it lives here instead.

import { FIELDS } from "@/lib/generator/fields";
import { hash32, mulberry32 } from "@/lib/generator/rng";

const SAMPLE_SEED = "marketing-field-type-grid";
const SAMPLES_PER_TYPE = 4;

// A generic status enum — this showcase isn't tied to any one real resource schema.
const ENUM_VALUES = ["draft", "published", "archived"];

function rngFor(type: string, locale: string, index: number) {
  return mulberry32(hash32(`${SAMPLE_SEED}:${type}:${locale}:${index}`));
}

function ctxFor(locale: string, index: number) {
  return { index, locale, values: { index } };
}

export type FieldTypeKey =
  | "uuid"
  | "fullName"
  | "email"
  | "price"
  | "boolean"
  | "date"
  | "enum"
  | "image"
  | "city"
  | "template";

export function getFieldTypeSamples(locale: string): Record<FieldTypeKey, string[]> {
  const samples: Record<FieldTypeKey, string[]> = {
    uuid: [],
    fullName: [],
    email: [],
    price: [],
    boolean: [],
    date: [],
    enum: [],
    image: [],
    city: [],
    template: [],
  };

  for (let index = 0; index < SAMPLES_PER_TYPE; index++) {
    const ctx = ctxFor(locale, index);

    samples.uuid.push(String(FIELDS.uuid(rngFor("uuid", locale, index), {}, ctx)));
    samples.fullName.push(String(FIELDS.fullName(rngFor("fullName", locale, index), {}, ctx)));
    samples.email.push(String(FIELDS.email(rngFor("email", locale, index), {}, ctx)));
    samples.price.push(
      `$${String(FIELDS.price(rngFor("price", locale, index), { symbol: "" }, ctx))}`,
    );
    samples.boolean.push(String(FIELDS.boolean(rngFor("boolean", locale, index), {}, ctx)));
    samples.date.push(String(FIELDS.date(rngFor("date", locale, index), {}, ctx)).slice(0, 10));
    samples.enum.push(
      String(FIELDS.enum(rngFor("enum", locale, index), { values: ENUM_VALUES }, ctx)),
    );
    samples.image.push(
      String(FIELDS.image(rngFor("image", locale, index), { width: 480, height: 320 }, ctx)),
    );
    samples.city.push(String(FIELDS.city(rngFor("city", locale, index), {}, ctx)));
    samples.template.push(
      String(
        FIELDS.template(rngFor("template", locale, index), { template: "ORD-{{index}}" }, ctx),
      ),
    );
  }

  return samples;
}
