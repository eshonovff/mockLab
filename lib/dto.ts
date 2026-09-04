// Shared response shapes between an API route and the client components that consume it —
// kept separate from lib/validators.ts (zod input schemas) since these describe output, not
// input, and don't need runtime validation on the client side.

import type { ResourceSchemaInput } from "@/lib/validators";

export type ProjectDto = {
  id: string;
  name: string;
  key: string;
  createdAt: string;
  resourceCount: number;
};

export type ResourceDto = {
  id: string;
  projectId: string;
  name: string;
  // Read back from Prisma's Json column, not re-validated on every read — it was already
  // validated by resourceSchemaSchema on every write. Trusted, not re-checked, same as the
  // rest of this codebase's "validate at the door" convention.
  schema: ResourceSchemaInput;
  seed: string;
  count: number;
  dataVersion: number;
};
