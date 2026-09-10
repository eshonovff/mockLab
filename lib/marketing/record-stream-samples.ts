// Real, deterministic sample records for the hero's ambient "record press" visual
// (components/marketing/record-stream.tsx) — the same generator used everywhere else
// (lib/generator/record.ts), not fake placeholder rows, so the background texture is an honest
// extension of the same claim the interactive demo makes: this is what the product actually
// produces. A distinct seed from the live demo resource (lib/demo.ts's DEMO_RESOURCE_SEED) so
// the ambient stream and the "Run this request" card never coincidentally show identical rows.

import { generateRange, type ResourceSchema } from "@/lib/generator/record";

const RECORD_STREAM_SEED = "marketing-record-stream";

// A lean catalog-shaped schema — deliberately smaller than the live demo's `products` resource
// (prisma/seed.ts's DEMO_SCHEMA): no `image` field, whose long picsum.photos URLs would dominate
// a single compact line. This is ambient texture, not the functional proof — that's what the
// hero's actual demo card is for.
const RECORD_STREAM_SCHEMA: ResourceSchema = {
  fields: [
    { name: "name", type: "word", options: {} },
    { name: "price", type: "price", options: { min: 8, max: 249, symbol: "$" } },
    {
      name: "category",
      type: "enum",
      options: { values: ["Electronics", "Home", "Outdoors", "Toys", "Books"] },
    },
    { name: "inStock", type: "boolean", options: { probability: 0.75 } },
    { name: "rating", type: "number", options: { min: 1, max: 5 } },
  ],
  locale: "en",
};

export function getRecordStreamLines(count: number): string[] {
  return generateRange(RECORD_STREAM_SCHEMA, RECORD_STREAM_SEED, 0, count).map((record) =>
    JSON.stringify(record),
  );
}
