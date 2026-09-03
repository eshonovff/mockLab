// Parses the mock API's query string (CLAUDE.md §9) into a typed, validated shape. Framework-
// free — takes a plain URLSearchParams, returns a result object — so route handlers can use it
// exactly like a zod `safeParse` (see lib/validators.ts's registerSchema for the same pattern):
// no custom thrown-error class to catch, just a discriminated `{ success }` result.

export type SortOrder = "asc" | "desc";

export type FilterOperator = "eq" | "gte" | "lte" | "ne" | "like";

export type FieldFilter = {
  field: string;
  operator: FilterOperator;
  value: string;
};

export type ParsedQuery = {
  page: number;
  limit: number;
  sort?: string;
  order: SortOrder;
  search?: string;
  filters: FieldFilter[];
};

export type ParseQueryResult =
  { success: true; data: ParsedQuery } | { success: false; errors: Record<string, string[]> };

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 100;

const RESERVED_PARAMS = new Set(["page", "limit", "sort", "order", "search"]);

// Checked longest-first so `_gte`/`_lte` (4 chars including the underscore) aren't shadowed by
// a hypothetical shorter suffix — not load-bearing today with only these four, but cheap
// insurance against a future entry being added in the wrong position.
const OPERATOR_SUFFIXES: readonly { suffix: `_${string}`; operator: FilterOperator }[] = [
  { suffix: "_like", operator: "like" },
  { suffix: "_gte", operator: "gte" },
  { suffix: "_lte", operator: "lte" },
  { suffix: "_ne", operator: "ne" },
];

/**
 * Parses a positive integer param, falling back to `fallback` when absent. Recorded as an
 * error (not silently coerced) when present but not a positive integer — an invalid `page` or
 * `limit` is a client mistake worth a 422, not something to paper over.
 */
function parsePositiveInt(
  raw: string | null,
  fallback: number,
  field: string,
  errors: Record<string, string[]>,
): number {
  if (raw === null) return fallback;

  const value = Number(raw);
  if (!Number.isInteger(value) || value < 1) {
    errors[field] = [`${field} must be a positive integer, got "${raw}"`];
    return fallback;
  }

  return value;
}

/**
 * Parses the mock API's query params (CLAUDE.md §9): `page`, `limit` (default 10, capped at
 * 100 rather than rejected — a client asking for too much just gets less, per CLAUDE.md §9's
 * own "max 100" wording), `sort`, `order` (`asc`/`desc`), `search`, and per-field filters —
 * `field=value` for equality, `field_gte=` `field_lte=` `field_ne=` `field_like=` for the rest.
 *
 * Only these four exact suffixes are recognized as operators. A key that merely *looks* like a
 * typo'd operator (`price_gt=`) is indistinguishable from a field genuinely named "price_gt" —
 * a query string alone can't tell them apart — so it's treated as a plain equality filter, not
 * rejected. `order` is the one param with a genuinely closed vocabulary (exactly "asc"/"desc"),
 * so it's the one place an actually-unrecognized value produces a 422.
 */
export function parseQuery(searchParams: URLSearchParams): ParseQueryResult {
  const errors: Record<string, string[]> = {};

  const page = parsePositiveInt(searchParams.get("page"), DEFAULT_PAGE, "page", errors);
  const rawLimit = parsePositiveInt(searchParams.get("limit"), DEFAULT_LIMIT, "limit", errors);
  const limit = Math.min(rawLimit, MAX_LIMIT);

  const sort = searchParams.get("sort") ?? undefined;
  const search = searchParams.get("search") ?? undefined;

  let order: SortOrder = "asc";
  const rawOrder = searchParams.get("order");
  if (rawOrder !== null) {
    if (rawOrder === "asc" || rawOrder === "desc") {
      order = rawOrder;
    } else {
      errors.order = [`order must be "asc" or "desc", got "${rawOrder}"`];
    }
  }

  const filters: FieldFilter[] = [];
  // `searchParams.keys()` yields one entry per key-VALUE pair — a repeated key like
  // `?a=1&a=2` would otherwise produce two identical filter entries. Dedupe to unique keys
  // first; `.get()` always returns the first value for a repeated key.
  for (const key of new Set(searchParams.keys())) {
    if (RESERVED_PARAMS.has(key)) continue;

    const match = OPERATOR_SUFFIXES.find(({ suffix }) => key.endsWith(suffix));
    const field = match ? key.slice(0, -match.suffix.length) : key;
    const operator = match?.operator ?? "eq";

    if (field.length === 0) {
      // A key that's *only* the suffix (e.g. "_gte=5") has no field to filter on. An entirely
      // empty key (from a malformed "?=value") has no match, hence the separate message.
      errors[key] = match
        ? [`"${key}" is missing a field name before "${match.suffix}"`]
        : ["query parameter name must not be empty"];
      continue;
    }

    const value = searchParams.get(key);
    if (value !== null) filters.push({ field, operator, value });
  }

  if (Object.keys(errors).length > 0) {
    return { success: false, errors };
  }

  return { success: true, data: { page, limit, sort, order, search, filters } };
}
