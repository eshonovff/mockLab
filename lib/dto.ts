// Shared response shapes between an API route and the client components that consume it —
// kept separate from lib/validators.ts (zod input schemas) since these describe output, not
// input, and don't need runtime validation on the client side.

export type ProjectDto = {
  id: string;
  name: string;
  key: string;
  createdAt: string;
  resourceCount: number;
};
