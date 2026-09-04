// The read path from CLAUDE.md §5: generate, merge overrides, filter/search/sort, paginate.
// Pure module: no imports from Next, Prisma, or React (CLAUDE.md §3's hard rule for everything
// under lib/generator/). lib/query.ts is imported for its types only — it's equally framework-
// free, so this doesn't compromise "has to stay extractable into a separate service later."

import type { FieldFilter, ParsedQuery, SortOrder } from "../query";
import { generateRange, type ResourceSchema } from "./record";

export type DatasetResource = {
  id: string;
  schema: ResourceSchema;
  seed: string;
  count: number;
  dataVersion: number;
};

/**
 * The subset of an Override row (CLAUDE.md §4) this module actually needs. `recordIndex` is
 * what makes override application cheap — it's a direct pointer back into the generated
 * sequence, so applying an override never requires searching the generated array for a
 * matching `recordId`.
 */
export type DatasetOverride = {
  recordId: string;
  recordIndex: number | null;
  data: Record<string, unknown> | null;
  deleted: boolean;
  isNew: boolean;
};

export type DatasetResult = {
  /** The requested page's records — already override-merged, filtered, searched, and sorted. */
  records: Record<string, unknown>[];
  /** Total matching records (post filter/search, pre pagination) — for the X-Total-Count header. */
  totalCount: number;
  /** Present, always exactly this value, whenever `resource.count` is above the cutoff. */
  notice?: string;
};

export const SORT_FILTER_DISABLED_NOTICE = "sort-filter-disabled-above-10000";

// CLAUDE.md §5's "v1 performance rule": <=10_000 materializes and caches; above it, only
// pagination is supported.
const MATERIALIZE_CUTOFF = 10_000;

// ---------------------------------------------------------------------------------------------
// Cache — CLAUDE.md §2: "lib/ratelimit.ts and the dataset cache must be written behind an
// interface so a Redis backend can replace them later without touching call sites." getDataset
// only ever talks to this interface; InMemoryLruDatasetCache is just its v1 implementation.

export type CachedDataset = Record<string, unknown>[];

export interface DatasetCache {
  get(key: string): CachedDataset | undefined;
  set(key: string, value: CachedDataset): void;
}

const DEFAULT_MAX_CACHE_ENTRIES = 50;

// Map-based LRU: Map iteration order is insertion order, and deleting + re-setting an existing
// key moves it to the end — that's the whole "least-recently-used" tracker, no linked list
// needed. What's cached is the GENERATE + MERGE result (post step 2 of the read path, pre
// filter/search/sort) — those don't depend on the request's query params, only on
// `dataVersion`, which is exactly the cache key's second half; filter/search/sort/paginate run
// fresh on every request against the cached merged array.
export class InMemoryLruDatasetCache implements DatasetCache {
  private readonly store = new Map<string, CachedDataset>();

  constructor(private readonly maxEntries: number = DEFAULT_MAX_CACHE_ENTRIES) {}

  get(key: string): CachedDataset | undefined {
    const value = this.store.get(key);
    if (value === undefined) return undefined;
    this.store.delete(key);
    this.store.set(key, value);
    return value;
  }

  set(key: string, value: CachedDataset): void {
    this.store.delete(key);
    this.store.set(key, value);
    if (this.store.size > this.maxEntries) {
      const oldestKey = this.store.keys().next().value;
      if (oldestKey !== undefined) this.store.delete(oldestKey);
    }
  }
}

export const defaultDatasetCache: DatasetCache = new InMemoryLruDatasetCache();

// ---------------------------------------------------------------------------------------------
// Override merge (read-path step 2): replace matched recordIndex, drop deleted, append isNew.

function mergeOverrides(
  generated: Record<string, unknown>[],
  overrides: DatasetOverride[],
): Record<string, unknown>[] {
  const byIndex = new Map<number, DatasetOverride>();
  const appended: DatasetOverride[] = [];

  for (const override of overrides) {
    if (override.recordIndex !== null) {
      byIndex.set(override.recordIndex, override);
    } else if (override.isNew) {
      appended.push(override);
    }
    // Any other shape (recordIndex null, isNew false) doesn't match the data model's own
    // invariant ("recordIndex: null for records created via POST") — ignored defensively
    // rather than thrown, so one malformed row can't take down an entire read request.
  }

  const merged: Record<string, unknown>[] = [];
  generated.forEach((record, index) => {
    const override = byIndex.get(index);
    if (override === undefined) {
      merged.push(record);
      return;
    }
    if (override.deleted) return;
    merged.push(override.data ?? record);
  });

  // Appended in the order they appear in the input array — the caller (the future resources
  // API) is responsible for fetching overrides in creation order, e.g. `orderBy: { id: "asc" }`.
  for (const override of appended) {
    if (override.deleted) continue; // created, then deleted — never shipped.
    if (override.data !== null) merged.push(override.data);
  }

  return merged;
}

// ---------------------------------------------------------------------------------------------
// Filter / search / sort (read-path step 3) — only ever run on the <=10k materialized path.

// Matches a string containing exactly one numeric run — an optional leading "-", digits, an
// optional single decimal part — with arbitrary non-digit text allowed before and/or after it:
// "$91.69", "91.69 USD", "-3" all match and extract their number. A second digit run elsewhere
// (e.g. "2.1.0", a version string) leaves a stray digit outside the match, so it correctly
// doesn't match at all and falls through to plain string comparison instead.
const FORMATTED_NUMBER_PATTERN = /^[^-\d]*(-?\d+(?:\.\d+)?)[^\d]*$/;

/**
 * A value that sorts/compares sensibly: plain numeric strings compare as numbers, and so do
 * formatted ones like a `price` field's `"$91.69"` — extracting the numeric part first is what
 * makes `price_gte=50` actually work for a currency-symbol-prefixed price. Everything else
 * falls back to string comparison (which also happens to do the right thing for ISO date
 * strings).
 */
function toComparable(value: unknown): number | string {
  if (typeof value === "number") return value;
  if (typeof value === "boolean") return value ? 1 : 0;
  const text = String(value);
  const match = text.match(FORMATTED_NUMBER_PATTERN);
  if (match) {
    const numeric = Number(match[1]);
    if (Number.isFinite(numeric)) return numeric;
  }
  return text;
}

function compareComparable(a: number | string, b: number | string): number {
  if (typeof a === "number" && typeof b === "number") return a - b;
  return String(a).localeCompare(String(b));
}

function matchesFilter(record: Record<string, unknown>, filter: FieldFilter): boolean {
  const fieldValue = record[filter.field];

  switch (filter.operator) {
    case "eq":
      // Exact string match, not numeric comparison — predictable, and avoids "10" vs "10.0"
      // type-coercion surprises that a numeric equality check would introduce.
      return String(fieldValue) === filter.value;
    case "ne":
      return String(fieldValue) !== filter.value;
    case "like":
      return String(fieldValue).toLowerCase().includes(filter.value.toLowerCase());
    case "gte":
      return compareComparable(toComparable(fieldValue), toComparable(filter.value)) >= 0;
    case "lte":
      return compareComparable(toComparable(fieldValue), toComparable(filter.value)) <= 0;
  }
}

/**
 * CLAUDE.md §9 documents `search` as a param but not which fields it searches — matches if ANY
 * field's string representation contains the term, case-insensitively. A decision, not a spec
 * answer; documented in PROGRESS.md.
 */
function matchesSearch(record: Record<string, unknown>, search: string): boolean {
  const needle = search.toLowerCase();
  return Object.values(record).some((value) => String(value).toLowerCase().includes(needle));
}

function sortRecords(
  records: Record<string, unknown>[],
  sort: string,
  order: SortOrder,
): Record<string, unknown>[] {
  const direction = order === "desc" ? -1 : 1;
  // Array.prototype.sort has been spec-guaranteed stable since ES2019 (every Node version this
  // project targets) — no manual tie-breaking needed to satisfy "sorting is stable".
  return [...records].sort(
    (a, b) => direction * compareComparable(toComparable(a[sort]), toComparable(b[sort])),
  );
}

// ---------------------------------------------------------------------------------------------

/**
 * <=10_000: materialize the whole generated+merged dataset (cached by `${id}:${dataVersion}`),
 * then filter, search, and sort in memory before paginating.
 */
function getDatasetAtOrBelowCutoff(
  resource: DatasetResource,
  overrides: DatasetOverride[],
  query: ParsedQuery,
  cache: DatasetCache,
): DatasetResult {
  const cacheKey = `${resource.id}:${resource.dataVersion}`;
  let merged = cache.get(cacheKey);

  if (merged === undefined) {
    const generated = generateRange(resource.schema, resource.seed, 0, resource.count);
    merged = mergeOverrides(generated, overrides);
    cache.set(cacheKey, merged);
  }

  let result = merged;
  for (const filter of query.filters) {
    result = result.filter((record) => matchesFilter(record, filter));
  }
  if (query.search) {
    const search = query.search;
    result = result.filter((record) => matchesSearch(record, search));
  }
  if (query.sort) {
    result = sortRecords(result, query.sort, query.order);
  }

  const from = (query.page - 1) * query.limit;
  const to = from + query.limit;

  return { records: result.slice(from, to), totalCount: result.length };
}

/**
 * >10_000: filter/search/sort are disabled entirely (CLAUDE.md §5) — this function never even
 * reads `query.filters`/`query.sort`/`query.search`. Only pagination runs, and it never
 * materializes more than the requested page plus the (small, override-bounded) list of newly
 * created records: generating a page deep into a million-record resource costs O(page size),
 * not O(resource.count).
 *
 * Deletions shrink their own page rather than shifting every later page to compensate — v1
 * accepts non-contiguous pagination above this cutoff rather than doing the extra bookkeeping
 * (a fixed-point search over the deleted-index set) that exact continuous pagination would
 * need. Consistent with CLAUDE.md §5's own framing for this whole cutoff: "it gets solved
 * properly in v2."
 */
function getDatasetAboveCutoff(
  resource: DatasetResource,
  overrides: DatasetOverride[],
  query: ParsedQuery,
): DatasetResult {
  const deletedIndices = new Set<number>();
  const replacedByIndex = new Map<number, Record<string, unknown>>();
  const newRecords: Record<string, unknown>[] = [];

  for (const override of overrides) {
    if (override.recordIndex !== null) {
      if (override.deleted) {
        deletedIndices.add(override.recordIndex);
      } else if (override.data !== null) {
        replacedByIndex.set(override.recordIndex, override.data);
      }
    } else if (override.isNew && !override.deleted && override.data !== null) {
      newRecords.push(override.data);
    }
  }

  const totalCount = resource.count - deletedIndices.size + newRecords.length;

  const from = (query.page - 1) * query.limit;
  const to = from + query.limit;
  const records: Record<string, unknown>[] = [];

  // Generated region: [0, resource.count) in the underlying, un-shifted index space.
  const generatedFrom = Math.min(from, resource.count);
  const generatedTo = Math.min(to, resource.count);
  if (generatedFrom < generatedTo) {
    const window = generateRange(resource.schema, resource.seed, generatedFrom, generatedTo);
    window.forEach((record, i) => {
      const index = generatedFrom + i;
      if (deletedIndices.has(index)) return;
      records.push(replacedByIndex.get(index) ?? record);
    });
  }

  // New-records region: appended right after resource.count, in override-array order.
  const newFrom = Math.max(from - resource.count, 0);
  const newTo = Math.max(to - resource.count, 0);
  if (newTo > newFrom) {
    records.push(...newRecords.slice(newFrom, newTo));
  }

  return { records, totalCount, notice: SORT_FILTER_DISABLED_NOTICE };
}

/**
 * The full read path (CLAUDE.md §5): generate, merge overrides, filter/search/sort, paginate.
 * `cache` defaults to a shared module-level instance; tests (and call sites that want
 * isolation) can pass their own.
 */
export function getDataset(
  resource: DatasetResource,
  overrides: DatasetOverride[],
  query: ParsedQuery,
  cache: DatasetCache = defaultDatasetCache,
): DatasetResult {
  if (resource.count > MATERIALIZE_CUTOFF) {
    return getDatasetAboveCutoff(resource, overrides, query);
  }
  return getDatasetAtOrBelowCutoff(resource, overrides, query, cache);
}
