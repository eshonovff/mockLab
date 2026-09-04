import { z } from "zod";

import { optionsSchemas, type FieldType } from "@/lib/generator/field-types";

export const registerSchema = z.object({
  email: z.email(),
  password: z.string().min(8),
  // An HTML input always submits a string, never `undefined` — an untouched optional field
  // comes through as "". Normalize that (and whitespace-only input) to `undefined` rather
  // than failing `.min(1)`, so leaving the field blank is treated as "no name provided".
  name: z
    .string()
    .trim()
    .max(120)
    .optional()
    .transform((value) => (value ? value : undefined)),
});

export type RegisterInput = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  email: z.email(),
  password: z.string().min(1),
});

export type LoginInput = z.infer<typeof loginSchema>;

export const createProjectSchema = z.object({
  name: z.string().trim().min(1).max(120),
});

export type CreateProjectInput = z.infer<typeof createProjectSchema>;

// `key` is deliberately absent — CLAUDE.md §4.1: "generated server-side and never accepted
// from the client," and it isn't mutable after creation either.
export const updateProjectSchema = z.object({
  name: z.string().trim().min(1).max(120),
});

export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;

// ---------------------------------------------------------------------------------------------
// Resource schema validation (CLAUDE.md §5's field registry, validated at the API boundary —
// task 4.3). Imports from lib/generator/field-types.ts, never lib/generator/fields.ts: the
// latter also pulls in @faker-js/faker for the actual generator functions, which this file
// must not drag into a client bundle — lib/validators.ts is imported by client forms
// (LoginForm, RegisterForm, NewProjectDialog) via zodResolver.

const FIELD_NAME_PATTERN = /^[a-z][a-zA-Z0-9_]*$/;
const MAX_SCHEMA_FIELDS = 30;

// One object schema per field type, each with `options` narrowed to that type's own shape —
// combined into a discriminated union on `type` below, so `{ type: "enum", options: { min: 1 }
// }` (a `number` field's options on an `enum` field) fails validation instead of silently
// passing with the wrong shape.
//
// `fieldVariant` is called once per type below with a literal argument at each call site —
// NOT via `.map()` over `Object.keys(optionsSchemas)`. A `.map()` callback's parameter has the
// single widened type `FieldType` for every iteration as far as TypeScript's static analysis
// is concerned, so `type: T` inside it infers `T = FieldType` (the whole union) once for the
// entire array, collapsing every variant into one merged type instead of 22 distinct ones —
// confirmed by hitting exactly that error when this was first written with `.map()`. A literal
// argument at its own call site doesn't have this problem: each call infers its own `T`.
function fieldVariant<T extends FieldType>(type: T) {
  return z.object({
    name: z
      .string()
      .regex(
        FIELD_NAME_PATTERN,
        "Field names must start with a lowercase letter and contain only letters, numbers, and underscores",
      ),
    type: z.literal(type),
    options: optionsSchemas[type],
  });
}

// The array literal is passed inline (not through an intermediate variable) so it's contextually
// typed as a tuple against z.discriminatedUnion's own non-empty-tuple parameter type.
const schemaFieldSchema = z.discriminatedUnion("type", [
  fieldVariant("index"),
  fieldVariant("uuid"),
  fieldVariant("firstName"),
  fieldVariant("lastName"),
  fieldVariant("fullName"),
  fieldVariant("email"),
  fieldVariant("phone"),
  fieldVariant("avatar"),
  fieldVariant("image"),
  fieldVariant("city"),
  fieldVariant("country"),
  fieldVariant("street"),
  fieldVariant("word"),
  fieldVariant("sentence"),
  fieldVariant("paragraph"),
  fieldVariant("number"),
  fieldVariant("price"),
  fieldVariant("boolean"),
  fieldVariant("date"),
  fieldVariant("enum"),
  fieldVariant("static"),
  fieldVariant("template"),
]);

export const resourceSchemaSchema = z
  .object({
    fields: z
      .array(schemaFieldSchema)
      .max(MAX_SCHEMA_FIELDS, `A resource can have at most ${MAX_SCHEMA_FIELDS} fields`),
    locale: z.string().optional(),
  })
  .refine(
    (schema) => {
      const names = schema.fields.map((field) => field.name);
      return new Set(names).size === names.length;
    },
    { message: "Field names must be unique within a resource", path: ["fields"] },
  );

export type ResourceSchemaInput = z.infer<typeof resourceSchemaSchema>;

// The resource's own `name` (CLAUDE.md §4.3) is a separate concern from the schema's field
// names above — it's the URL segment under a project's mock API base
// (`/m/{projectKey}/{resourceName}`), not a generated-data field.
const RESOURCE_NAME_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const RESERVED_RESOURCE_NAMES = new Set(["auth", "admin", "api"]);

export const resourceNameSchema = z
  .string()
  .max(60)
  .regex(
    RESOURCE_NAME_PATTERN,
    "Resource name must be a lowercase slug (letters, numbers, and hyphens)",
  )
  .refine((name) => !RESERVED_RESOURCE_NAMES.has(name), { message: "This name is reserved" });

// "unique per project" (CLAUDE.md §4.3) needs a database lookup this file has no access to —
// deferred to the resource-creation route (task 4.4), which checks it the same way
// app/api/auth/register/route.ts already checks email uniqueness: validate shape here, then a
// separate `db.resource.findFirst(...)` + 409 in the route handler.

// ---------------------------------------------------------------------------------------------
// Resource CRUD input (task 4.4). `schema` defaults to an empty field list on create — CLAUDE.md
// §4.6's schema builder is a "create the resource, then add fields interactively" flow, not a
// single-shot creation form.

export const createResourceSchema = z.object({
  name: resourceNameSchema,
  schema: resourceSchemaSchema.optional(),
  count: z.number().int().positive().optional(),
});

export type CreateResourceInput = z.infer<typeof createResourceSchema>;

// `seed` is accepted here (unlike Project.key, which is never client-settable) — CLAUDE.md
// §4.6 describes a "seed with a regenerate button" in the schema builder UI, meaning the
// client is expected to be able to set it, not just receive a server-assigned one at creation.
export const updateResourceSchema = z.object({
  name: resourceNameSchema.optional(),
  schema: resourceSchemaSchema.optional(),
  seed: z.string().min(1).max(60).optional(),
  count: z.number().int().positive().optional(),
});

export type UpdateResourceInput = z.infer<typeof updateResourceSchema>;
