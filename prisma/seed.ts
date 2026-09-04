// Provisions the one permanent demo project + resource the marketing home page's hero widget
// calls through the real public `/m/{key}/{resource}` endpoint (task 7.2). Idempotent — safe to
// run on every deploy: upserts by the fixed identifiers in `lib/demo.ts` rather than blindly
// inserting, so re-running never creates duplicates or a second demo account.
import type { Prisma } from "@prisma/client";

import { hashPassword } from "../lib/auth";
import { db } from "../lib/db";
import { DEMO_PROJECT_KEY, DEMO_RESOURCE_NAME, DEMO_RESOURCE_SEED } from "../lib/demo";
import type { ResourceSchemaInput } from "../lib/validators";

const DEMO_USER_EMAIL = "demo@mocklab.dev";

// A field mix chosen to look like a real product catalog in the hero's JSON response —
// variety across the type registry (word, price, enum, boolean, number, image, date) rather
// than a minimal schema, since this is the one resource every visitor actually sees.
const DEMO_SCHEMA: ResourceSchemaInput = {
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
    { name: "image", type: "image", options: { width: 200, height: 200 } },
  ],
  locale: "en",
};

async function main() {
  const user = await db.user.upsert({
    where: { email: DEMO_USER_EMAIL },
    update: {},
    create: {
      email: DEMO_USER_EMAIL,
      // Nobody signs into this account — the hash just needs to exist to satisfy the schema.
      // A random value per run (not a fixed literal) means the password can never accidentally
      // double as a real, guessable credential.
      password: await hashPassword(crypto.randomUUID()),
      name: "Demo",
    },
  });

  const project = await db.project.upsert({
    where: { key: DEMO_PROJECT_KEY },
    update: {},
    create: { userId: user.id, name: "Demo", key: DEMO_PROJECT_KEY },
  });

  await db.resource.upsert({
    where: { projectId_name: { projectId: project.id, name: DEMO_RESOURCE_NAME } },
    // Re-running the seed after a deploy should still let the schema evolve if this file
    // changes; `dataVersion` bumps so cached pages don't serve the previous shape.
    update: {
      schema: DEMO_SCHEMA as Prisma.InputJsonValue,
      seed: DEMO_RESOURCE_SEED,
      dataVersion: { increment: 1 },
    },
    create: {
      projectId: project.id,
      name: DEMO_RESOURCE_NAME,
      schema: DEMO_SCHEMA as Prisma.InputJsonValue,
      seed: DEMO_RESOURCE_SEED,
      count: 30,
    },
  });

  console.log(`Seeded demo resource: /m/${DEMO_PROJECT_KEY}/${DEMO_RESOURCE_NAME}`);
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
