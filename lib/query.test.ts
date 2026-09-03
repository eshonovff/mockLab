import { describe, expect, it } from "vitest";

import { parseQuery, type ParsedQuery } from "./query";

function parse(query: string) {
  return parseQuery(new URLSearchParams(query));
}

describe("parseQuery — table of query strings to expected parsed object", () => {
  const cases: { query: string; expected: ParsedQuery }[] = [
    {
      query: "",
      expected: { page: 1, limit: 10, order: "asc", filters: [] },
    },
    {
      query: "page=3&limit=25",
      expected: { page: 3, limit: 25, order: "asc", filters: [] },
    },
    {
      query: "sort=name&order=desc",
      expected: { page: 1, limit: 10, sort: "name", order: "desc", filters: [] },
    },
    {
      query: "search=widget",
      expected: { page: 1, limit: 10, order: "asc", search: "widget", filters: [] },
    },
    {
      query: "status=published",
      expected: {
        page: 1,
        limit: 10,
        order: "asc",
        filters: [{ field: "status", operator: "eq", value: "published" }],
      },
    },
    {
      query: "price_gte=10&price_lte=100",
      expected: {
        page: 1,
        limit: 10,
        order: "asc",
        filters: [
          { field: "price", operator: "gte", value: "10" },
          { field: "price", operator: "lte", value: "100" },
        ],
      },
    },
    {
      query: "status_ne=archived",
      expected: {
        page: 1,
        limit: 10,
        order: "asc",
        filters: [{ field: "status", operator: "ne", value: "archived" }],
      },
    },
    {
      query: "title_like=chair",
      expected: {
        page: 1,
        limit: 10,
        order: "asc",
        filters: [{ field: "title", operator: "like", value: "chair" }],
      },
    },
    {
      query: "page=2&limit=5&sort=price&order=desc&search=chair&status=published&price_gte=10",
      expected: {
        page: 2,
        limit: 5,
        sort: "price",
        order: "desc",
        search: "chair",
        filters: [
          { field: "status", operator: "eq", value: "published" },
          { field: "price", operator: "gte", value: "10" },
        ],
      },
    },
    {
      // limit above the cap is clamped, not rejected — CLAUDE.md §9: "limit... max 100".
      query: "limit=500",
      expected: { page: 1, limit: 100, order: "asc", filters: [] },
    },
    {
      // A field name that happens to end in a recognized suffix is indistinguishable from an
      // operator attempt — accepted ambiguity, documented in query.ts.
      query: "in_stock_ne=false",
      expected: {
        page: 1,
        limit: 10,
        order: "asc",
        filters: [{ field: "in_stock", operator: "ne", value: "false" }],
      },
    },
    {
      // Repeated keys dedupe to the first value, once.
      query: "status=draft&status=published",
      expected: {
        page: 1,
        limit: 10,
        order: "asc",
        filters: [{ field: "status", operator: "eq", value: "draft" }],
      },
    },
  ];

  it.each(cases)("$query", ({ query, expected }) => {
    const result = parse(query);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual(expected);
    }
  });
});

describe("parseQuery — rejected input", () => {
  it("rejects a non-integer page with a 422-shaped error", () => {
    const result = parse("page=abc");
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errors.page).toBeDefined();
    }
  });

  it("rejects a zero or negative page", () => {
    expect(parse("page=0").success).toBe(false);
    expect(parse("page=-1").success).toBe(false);
  });

  it("rejects a non-integer limit", () => {
    const result = parse("limit=ten");
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errors.limit).toBeDefined();
    }
  });

  it("rejects an order that isn't asc or desc", () => {
    const result = parse("order=sideways");
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errors.order).toEqual([`order must be "asc" or "desc", got "sideways"`]);
    }
  });

  it("treats a mistyped operator suffix as a plain field name, not an error", () => {
    // price_gt (missing the trailing "e") isn't one of the four recognized suffixes — decided
    // deliberately: a query string can't distinguish a typo from a field genuinely named
    // "price_gt".
    const result = parse("price_gt=10");
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.filters).toEqual([{ field: "price_gt", operator: "eq", value: "10" }]);
    }
  });

  it("rejects a key that's only an operator suffix with no field name", () => {
    const result = parse("_gte=5");
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errors._gte).toBeDefined();
    }
  });

  it("collects multiple errors in one pass rather than stopping at the first", () => {
    const result = parse("page=abc&limit=xyz&order=nope");
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(Object.keys(result.errors).sort()).toEqual(["limit", "order", "page"]);
    }
  });
});
