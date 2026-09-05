// Provisions the one permanent demo project the marketing home page's hero widget calls through
// the real public `/m/{key}/{resource}` endpoint (task 7.2), plus two more resources (task 9.4)
// showing off variety in the field-type registry for anyone exploring the demo project directly.
// Idempotent — safe to run on every deploy: upserts by the fixed identifiers in `lib/demo.ts`
// rather than blindly inserting, so re-running never creates duplicates or a second demo account.
import type { Prisma } from "@prisma/client";

import { hashPassword } from "../lib/auth";
import { db } from "../lib/db";
import {
  DEMO_POSTS_RESOURCE_NAME,
  DEMO_POSTS_RESOURCE_SEED,
  DEMO_PROJECT_KEY,
  DEMO_RESOURCE_NAME,
  DEMO_RESOURCE_SEED,
  DEMO_USERS_RESOURCE_NAME,
  DEMO_USERS_RESOURCE_SEED,
} from "../lib/demo";
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

// A distinct field mix from `products` — identity/contact types (fullName, email, phone,
// avatar, city, country) rather than product-catalog types, so the demo project shows real
// variety across the field-type registry, not three resources that all look the same.
const DEMO_USERS_SCHEMA: ResourceSchemaInput = {
  fields: [
    { name: "fullName", type: "fullName", options: {} },
    { name: "email", type: "email", options: {} },
    { name: "phone", type: "phone", options: {} },
    { name: "avatar", type: "avatar", options: {} },
    { name: "city", type: "city", options: {} },
    { name: "country", type: "country", options: {} },
  ],
  locale: "en",
};

// A third distinct mix — long-form text (sentence, paragraph) and a date, neither of which
// `products` or `users` exercises.
const DEMO_POSTS_SCHEMA: ResourceSchemaInput = {
  fields: [
    { name: "title", type: "sentence", options: { min: 3, max: 8 } },
    { name: "body", type: "paragraph", options: { min: 2, max: 5 } },
    { name: "author", type: "fullName", options: {} },
    {
      name: "category",
      type: "enum",
      options: { values: ["News", "Guides", "Opinion", "Release notes"] },
    },
    { name: "published", type: "boolean", options: { probability: 0.85 } },
    { name: "publishedAt", type: "date", options: {} },
  ],
  locale: "en",
};

// Shared by all three demo resources below — the exact same upsert shape repeated three times
// inline would just be three chances for one of them to quietly drift from the others.
async function upsertDemoResource(
  projectId: string,
  name: string,
  schema: ResourceSchemaInput,
  seed: string,
): Promise<void> {
  await db.resource.upsert({
    where: { projectId_name: { projectId, name } },
    // Re-running the seed after a deploy should still let the schema evolve if this file
    // changes; `dataVersion` bumps so cached pages don't serve the previous shape.
    update: {
      schema: schema as Prisma.InputJsonValue,
      seed,
      dataVersion: { increment: 1 },
    },
    create: {
      projectId,
      name,
      schema: schema as Prisma.InputJsonValue,
      seed,
      count: 30,
    },
  });
}

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

  await upsertDemoResource(project.id, DEMO_RESOURCE_NAME, DEMO_SCHEMA, DEMO_RESOURCE_SEED);
  await upsertDemoResource(
    project.id,
    DEMO_USERS_RESOURCE_NAME,
    DEMO_USERS_SCHEMA,
    DEMO_USERS_RESOURCE_SEED,
  );
  await upsertDemoResource(
    project.id,
    DEMO_POSTS_RESOURCE_NAME,
    DEMO_POSTS_SCHEMA,
    DEMO_POSTS_RESOURCE_SEED,
  );

  console.log(
    `Seeded demo resources: /m/${DEMO_PROJECT_KEY}/{${DEMO_RESOURCE_NAME},${DEMO_USERS_RESOURCE_NAME},${DEMO_POSTS_RESOURCE_NAME}}`,
  );
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
