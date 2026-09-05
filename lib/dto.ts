// Shared response shapes between an API route and the client components that consume it —
// kept separate from lib/validators.ts (zod input schemas) since these describe output, not
// input, and don't need runtime validation on the client side.

import type { Role, Status } from "@prisma/client";

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

// ---------------------------------------------------------------------------------------------
// Admin endpoints (task 8.1). `Role`/`Status` are type-only imports here — unlike
// `lib/validators.ts`, this file never runs `@prisma/client`'s actual module code, so pulling
// in its generated types (erased at compile time) doesn't drag the query engine into a client
// bundle.

export type AdminStatsDto = {
  users: number;
  projects: number;
  resources: number;
  // Added in task 8.3 once request metering existed — 8.1 deliberately omitted this rather than
  // shipping a fake `0` ahead of the real counter.
  requestsToday: number;
};

export type AdminUserDto = {
  id: string;
  email: string;
  name: string | null;
  role: Role;
  status: Status;
  locale: string;
  createdAt: string;
};

export type AdminUsersListDto = {
  users: AdminUserDto[];
  total: number;
  page: number;
  limit: number;
};

export type AdminProjectDto = {
  id: string;
  name: string;
  key: string;
  createdAt: string;
  resourceCount: number;
  owner: { id: string; email: string; name: string | null };
};

// Task 8.3: per-project request metering, surfaced on the project's own dashboard page.
export type RequestMetricsDto = {
  today: number;
  /** Last 30 UTC days, oldest first, zero-filled — never has a gap for a quiet day. */
  daily: { date: string; count: number }[];
};
