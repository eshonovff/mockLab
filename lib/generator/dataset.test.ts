import { describe, expect, it } from "vitest";

import type { ParsedQuery } from "../query";
import {
  InMemoryLruDatasetCache,
  SORT_FILTER_DISABLED_NOTICE,
  getDataset,
  type DatasetOverride,
  type DatasetResource,
} from "./dataset";
import { generateRecord, type ResourceSchema } from "./record";

const SCHEMA: ResourceSchema = {
  fields: [
    { name: "title", type: "word", options: {} },
    { name: "status", type: "enum", options: { values: ["draft", "published"] } },
    { name: "price", type: "number", options: { min: 1, max: 1000 } },
  ],
};

function baseQuery(overrides: Partial<ParsedQuery> = {}): ParsedQuery {
  return { page: 1, limit: 10, order: "asc", filters: [], ...overrides };
}

describe("getDataset — override merge (<=10k path)", () => {
  it("override replaces the generated record at the right position", () => {
    const resource: DatasetResource = {
      id: "r1",
      schema: SCHEMA,
      seed: "seed-1",
      count: 10,
      dataVersion: 1,
    };
    const replacement = { id: "custom-id", title: "REPLACED", status: "draft", price: 999 };
    const overrides: DatasetOverride[] = [
      { recordId: "custom-id", recordIndex: 3, data: replacement, deleted: false, isNew: false },
    ];

    const result = getDataset(
      resource,
      overrides,
      baseQuery({ limit: 10 }),
      new InMemoryLruDatasetCache(),
    );

    expect(result.records[3]).toEqual(replacement);
    expect(result.records[0]).toEqual(generateRecord(SCHEMA, "seed-1", 0));
    expect(result.records[9]).toEqual(generateRecord(SCHEMA, "seed-1", 9));
  });

  it("deleted records vanish and totalCount drops by exactly one", () => {
    const resource: DatasetResource = {
      id: "r2",
      schema: SCHEMA,
      seed: "seed-2",
      count: 10,
      dataVersion: 1,
    };
    const cache = new InMemoryLruDatasetCache();
    const withoutDelete = getDataset(resource, [], baseQuery({ limit: 10 }), cache);

    const deletedId = withoutDelete.records.at(4)?.id;
    const overrides: DatasetOverride[] = [
      { recordId: String(deletedId), recordIndex: 4, data: null, deleted: true, isNew: false },
    ];
    const withDelete = getDataset(
      { ...resource, dataVersion: 2 },
      overrides,
      baseQuery({ limit: 10 }),
      cache,
    );

    expect(withDelete.totalCount).toBe(withoutDelete.totalCount - 1);
    expect(withDelete.records).toHaveLength(9);
    expect(withDelete.records.some((record) => record.id === deletedId)).toBe(false);
  });

  it("new records land at the end", () => {
    const resource: DatasetResource = {
      id: "r3",
      schema: SCHEMA,
      seed: "seed-3",
      count: 5,
      dataVersion: 1,
    };
    const newRecord = { id: "new-1", title: "brand new", status: "draft", price: 1 };
    const overrides: DatasetOverride[] = [
      { recordId: "new-1", recordIndex: null, data: newRecord, deleted: false, isNew: true },
    ];

    const result = getDataset(
      resource,
      overrides,
      baseQuery({ limit: 10 }),
      new InMemoryLruDatasetCache(),
    );

    expect(result.records).toHaveLength(6);
    expect(result.records[5]).toEqual(newRecord);
    expect(result.totalCount).toBe(6);
  });

  it("a record created then deleted is never shipped", () => {
    const resource: DatasetResource = {
      id: "r3b",
      schema: SCHEMA,
      seed: "seed-3b",
      count: 5,
      dataVersion: 1,
    };
    const overrides: DatasetOverride[] = [
      {
        recordId: "new-1",
        recordIndex: null,
        data: { id: "new-1", title: "gone", status: "draft", price: 1 },
        deleted: true,
        isNew: true,
      },
    ];

    const result = getDataset(
      resource,
      overrides,
      baseQuery({ limit: 10 }),
      new InMemoryLruDatasetCache(),
    );

    expect(result.records).toHaveLength(5);
    expect(result.totalCount).toBe(5);
  });

  it("sorting is stable when the sort field ties for every record", () => {
    const resource: DatasetResource = {
      id: "r4",
      schema: SCHEMA,
      seed: "seed-4",
      count: 20,
      dataVersion: 1,
    };
    // All records replaced with the same "group" value — everything ties on the sort key, so a
    // stable sort must preserve the original relative order exactly.
    const overrides: DatasetOverride[] = Array.from({ length: 20 }, (_, index) => ({
      recordId: `id-${index}`,
      recordIndex: index,
      data: { id: `id-${index}`, group: "same", position: index },
      deleted: false,
      isNew: false,
    }));
    const cache = new InMemoryLruDatasetCache();

    const unsorted = getDataset(resource, overrides, baseQuery({ limit: 20 }), cache);
    const sorted = getDataset(
      { ...resource, dataVersion: 2 },
      overrides,
      baseQuery({ limit: 20, sort: "group", order: "asc" }),
      cache,
    );

    expect(sorted.records.map((record) => record.position)).toEqual(
      unsorted.records.map((record) => record.position),
    );
  });
});

describe("getDataset — above the 10k cutoff", () => {
  it("ignores sort, filter, and search — result is identical with or without them — and sets the notice", () => {
    const resource: DatasetResource = {
      id: "r5",
      schema: SCHEMA,
      seed: "seed-5",
      count: 50_000,
      dataVersion: 1,
    };
    const cache = new InMemoryLruDatasetCache();

    const plain = getDataset(resource, [], baseQuery({ page: 5, limit: 10 }), cache);
    const withQuery = getDataset(
      resource,
      [],
      baseQuery({
        page: 5,
        limit: 10,
        sort: "price",
        order: "desc",
        search: "zzz",
        filters: [{ field: "status", operator: "eq", value: "nope" }],
      }),
      cache,
    );

    expect(withQuery.records).toEqual(plain.records);
    expect(plain.notice).toBe(SORT_FILTER_DISABLED_NOTICE);
    expect(withQuery.notice).toBe(SORT_FILTER_DISABLED_NOTICE);
  });

  it("never materializes more than the requested page (a deep page is still fast)", () => {
    const resource: DatasetResource = {
      id: "r6",
      schema: SCHEMA,
      seed: "seed-6",
      count: 5_000_000,
      dataVersion: 1,
    };
    const start = performance.now();
    const result = getDataset(resource, [], baseQuery({ page: 400_000, limit: 10 }));
    expect(performance.now() - start).toBeLessThan(200);
    expect(result.records).toHaveLength(10);
    expect(result.totalCount).toBe(5_000_000);
  });

  it("overrides still apply within their own page (deletions shrink that page, not later ones)", () => {
    const resource: DatasetResource = {
      id: "r7",
      schema: SCHEMA,
      seed: "seed-7",
      count: 50_000,
      dataVersion: 1,
    };
    const overrides: DatasetOverride[] = [
      { recordId: "x", recordIndex: 2, data: null, deleted: true, isNew: false },
    ];

    const result = getDataset(resource, overrides, baseQuery({ page: 1, limit: 5 }));

    expect(result.records).toHaveLength(4);
    expect(result.totalCount).toBe(50_000 - 1);
  });

  it("new records are served after the generated region ends", () => {
    const resource: DatasetResource = {
      id: "r8",
      schema: SCHEMA,
      seed: "seed-8",
      count: 10_001,
      dataVersion: 1,
    };
    const newRecord = { id: "new-x", title: "t", status: "draft", price: 1 };
    const overrides: DatasetOverride[] = [
      { recordId: "new-x", recordIndex: null, data: newRecord, deleted: false, isNew: true },
    ];

    const result = getDataset(
      resource,
      overrides,
      baseQuery({ page: resource.count + 1, limit: 1 }),
    );

    expect(result.records).toEqual([newRecord]);
    expect(result.totalCount).toBe(resource.count + 1);
  });
});

describe("getDataset — filter / search / sort / paginate", () => {
  const resource: DatasetResource = {
    id: "r9",
    schema: SCHEMA,
    seed: "filter-seed",
    count: 5,
    dataVersion: 1,
  };
  const rows = [
    { title: "Red Chair", status: "published", price: 50 },
    { title: "Blue Table", status: "draft", price: 150 },
    { title: "Green Chair", status: "published", price: 75 },
    { title: "Yellow Lamp", status: "archived", price: 20 },
    { title: "Red Sofa", status: "published", price: 300 },
  ];
  const overrides: DatasetOverride[] = rows.map((data, index) => ({
    recordId: `id-${index}`,
    recordIndex: index,
    data: { id: `id-${index}`, ...data },
    deleted: false,
    isNew: false,
  }));

  it("filters by eq", () => {
    const result = getDataset(
      resource,
      overrides,
      baseQuery({ limit: 10, filters: [{ field: "status", operator: "eq", value: "published" }] }),
      new InMemoryLruDatasetCache(),
    );
    expect(result.records.map((r) => r.title)).toEqual(["Red Chair", "Green Chair", "Red Sofa"]);
  });

  it("filters by ne", () => {
    const result = getDataset(
      resource,
      overrides,
      baseQuery({ limit: 10, filters: [{ field: "status", operator: "ne", value: "published" }] }),
      new InMemoryLruDatasetCache(),
    );
    expect(result.records.map((r) => r.title)).toEqual(["Blue Table", "Yellow Lamp"]);
  });

  it("filters by gte and lte together, numerically", () => {
    const result = getDataset(
      resource,
      overrides,
      baseQuery({
        limit: 10,
        filters: [
          { field: "price", operator: "gte", value: "50" },
          { field: "price", operator: "lte", value: "150" },
        ],
      }),
      new InMemoryLruDatasetCache(),
    );
    expect(result.records.map((r) => r.title)).toEqual(["Red Chair", "Blue Table", "Green Chair"]);
  });

  it('filters and sorts numerically on a currency-formatted string value (e.g. the price field type\'s own "$91.69" shape)', () => {
    // Regression test: found live against the real /m/{key}/{resource} endpoint (task 5.1) —
    // dataset.test.ts's other price fixtures use plain numbers, which never exercised the
    // `price` field type's actual output shape and let this slip through 3.5's own test suite.
    // A naive `Number("$91.69")` is NaN, which used to make toComparable fall back to comparing
    // "$91.69" as a plain string against the filter value's own parsed number — comparing a
    // string to a number always took the string-comparison branch, and "$" sorts before every
    // digit, so `price_gte=50` silently matched nothing at all, for any price.
    const formattedResource: DatasetResource = { ...resource, seed: "formatted-price-seed" };
    const formattedRows = [
      { title: "A", price: "$38.60" },
      { title: "B", price: "$91.69" },
      { title: "C", price: "$87.55" },
      { title: "D", price: "$53.79" },
      { title: "E", price: "$40.80" },
    ];
    const formattedOverrides: DatasetOverride[] = formattedRows.map((data, index) => ({
      recordId: `fid-${index}`,
      recordIndex: index,
      data: { id: `fid-${index}`, ...data },
      deleted: false,
      isNew: false,
    }));

    const filtered = getDataset(
      formattedResource,
      formattedOverrides,
      baseQuery({ limit: 10, filters: [{ field: "price", operator: "gte", value: "50" }] }),
      new InMemoryLruDatasetCache(),
    );
    expect(filtered.records.map((r) => r.title)).toEqual(["B", "C", "D"]);

    const sorted = getDataset(
      formattedResource,
      formattedOverrides,
      baseQuery({ limit: 10, sort: "price", order: "asc" }),
      new InMemoryLruDatasetCache(),
    );
    expect(sorted.records.map((r) => r.price)).toEqual([
      "$38.60",
      "$40.80",
      "$53.79",
      "$87.55",
      "$91.69",
    ]);
  });

  it("filters by like, case-insensitively", () => {
    const result = getDataset(
      resource,
      overrides,
      baseQuery({ limit: 10, filters: [{ field: "title", operator: "like", value: "chair" }] }),
      new InMemoryLruDatasetCache(),
    );
    expect(result.records.map((r) => r.title)).toEqual(["Red Chair", "Green Chair"]);
  });

  it("search matches across any field, case-insensitively", () => {
    const result = getDataset(
      resource,
      overrides,
      baseQuery({ limit: 10, search: "RED" }),
      new InMemoryLruDatasetCache(),
    );
    expect(result.records.map((r) => r.title)).toEqual(["Red Chair", "Red Sofa"]);
  });

  it("sorts ascending and descending by a numeric field", () => {
    const asc = getDataset(
      resource,
      overrides,
      baseQuery({ limit: 10, sort: "price", order: "asc" }),
      new InMemoryLruDatasetCache(),
    );
    expect(asc.records.map((r) => r.price)).toEqual([20, 50, 75, 150, 300]);

    const desc = getDataset(
      resource,
      overrides,
      baseQuery({ limit: 10, sort: "price", order: "desc" }),
      new InMemoryLruDatasetCache(),
    );
    expect(desc.records.map((r) => r.price)).toEqual([300, 150, 75, 50, 20]);
  });

  it("paginates the sorted result and reports the full matching totalCount", () => {
    const result = getDataset(
      resource,
      overrides,
      baseQuery({ page: 2, limit: 2, sort: "price", order: "asc" }),
      new InMemoryLruDatasetCache(),
    );
    expect(result.records.map((r) => r.price)).toEqual([75, 150]);
    expect(result.totalCount).toBe(5);
  });
});

describe("InMemoryLruDatasetCache", () => {
  it("evicts the least-recently-used entry once over its max size", () => {
    const cache = new InMemoryLruDatasetCache(3);
    cache.set("a", [{ id: "a" }]);
    cache.set("b", [{ id: "b" }]);
    cache.set("c", [{ id: "c" }]);
    cache.set("d", [{ id: "d" }]);

    expect(cache.get("a")).toBeUndefined();
    expect(cache.get("b")).toBeDefined();
    expect(cache.get("c")).toBeDefined();
    expect(cache.get("d")).toBeDefined();
  });

  it("a get() touch protects an entry from the next eviction", () => {
    const cache = new InMemoryLruDatasetCache(3);
    cache.set("a", [{ id: "a" }]);
    cache.set("b", [{ id: "b" }]);
    cache.set("c", [{ id: "c" }]);
    cache.get("a"); // "b" is now the least-recently-used entry.
    cache.set("d", [{ id: "d" }]);

    expect(cache.get("a")).toBeDefined();
    expect(cache.get("b")).toBeUndefined();
    expect(cache.get("c")).toBeDefined();
    expect(cache.get("d")).toBeDefined();
  });

  it("defaults to a max of 50 entries", () => {
    const cache = new InMemoryLruDatasetCache();
    for (let i = 0; i < 51; i++) cache.set(`k${i}`, [{ i }]);

    expect(cache.get("k0")).toBeUndefined();
    expect(cache.get("k50")).toBeDefined();
  });
});

describe("getDataset — caching", () => {
  it("reuses the cached merge until dataVersion changes, ignoring a differing overrides argument", () => {
    const resource: DatasetResource = {
      id: "r10",
      schema: SCHEMA,
      seed: "seed-10",
      count: 10,
      dataVersion: 1,
    };
    const cache = new InMemoryLruDatasetCache();
    const deleteFirst: DatasetOverride[] = [
      { recordId: "x", recordIndex: 0, data: null, deleted: true, isNew: false },
    ];

    const first = getDataset(resource, deleteFirst, baseQuery({ limit: 10 }), cache);
    expect(first.totalCount).toBe(9);

    // Same dataVersion, no overrides this time — if the merge were recomputed, this would show
    // 10 records. It should still show 9: the stale cached merge wins over the fresh argument.
    const second = getDataset(resource, [], baseQuery({ limit: 10 }), cache);
    expect(second.totalCount).toBe(9);

    // Bumping dataVersion changes the cache key -> recomputes, this time with no overrides.
    const third = getDataset({ ...resource, dataVersion: 2 }, [], baseQuery({ limit: 10 }), cache);
    expect(third.totalCount).toBe(10);
  });
});
