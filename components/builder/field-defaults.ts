import { FIELD_TYPES, type FieldOptionsMap, type FieldType } from "@/lib/generator/field-types";

// Every default here must independently satisfy that type's own options schema — a freshly
// added or freshly-switched-to field must be immediately valid and previewable, per task 4.6's
// own "Done when": adding a field of every registered type produces sensible preview values.
// Most types have no required options at all; `enum`, `static`, and `template` do, so those
// three get a real starting value instead of `{}`.
export const DEFAULT_FIELD_OPTIONS: FieldOptionsMap = {
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
  enum: { values: ["value1", "value2"] },
  static: { value: "value" },
  template: { template: "example" },
};

// Same shape as lib/validators.ts's ResourceSchemaInput["fields"][number] — the field as the
// server persists and validates it, with no client-only bookkeeping attached.
export type PersistedField = {
  [K in FieldType]: { name: string; type: K; options: FieldOptionsMap[K] };
}[FieldType];

export type DraftField = PersistedField & {
  /** Client-only stable identity for React keys and drag tracking — never sent to the server. */
  _key: string;
};

function generateKey(): string {
  return typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);
}

/** Wraps a resource's persisted fields with a fresh client-only `_key` for React/drag tracking. */
export function hydrateDraftFields(fields: readonly PersistedField[]): DraftField[] {
  return fields.map((field) => ({ ...field, _key: generateKey() }));
}

/** Strips `_key` before sending fields back to the server. */
export function dehydrateDraftFields(fields: readonly DraftField[]): PersistedField[] {
  return fields.map(({ _key: _unusedKey, ...field }) => field);
}

/** `field1`, `field2`, ... — the first one not already used by another field in the list. */
export function nextFieldName(existingNames: readonly string[]): string {
  const used = new Set(existingNames);
  let index = existingNames.length + 1;
  let candidate = `field${index}`;
  while (used.has(candidate)) {
    index += 1;
    candidate = `field${index}`;
  }
  return candidate;
}

export function createDraftField(
  existingNames: readonly string[],
  type: FieldType = "word",
): DraftField {
  return {
    _key: generateKey(),
    name: nextFieldName(existingNames),
    type,
    options: DEFAULT_FIELD_OPTIONS[type],
  } as DraftField;
}

export const FIELD_TYPE_OPTIONS = FIELD_TYPES.map((descriptor) => descriptor.type);
