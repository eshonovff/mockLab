import { z } from "zod";

export const registerSchema = z.object({
  email: z.email(),
  password: z.string().min(8),
  // An HTML input always submits a string, never `undefined` — an untouched optional field
  // comes through as "". Normalize that (and whitespace-only input) to `undefined` rather
  // than failing `.min(1)`, so leaving the field blank is treated as "no name provided".
  name: z
    .string()
    .trim()
    .max(120)
    .optional()
    .transform((value) => (value ? value : undefined)),
});

export type RegisterInput = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  email: z.email(),
  password: z.string().min(1),
});

export type LoginInput = z.infer<typeof loginSchema>;

export const createProjectSchema = z.object({
  name: z.string().trim().min(1).max(120),
});

export type CreateProjectInput = z.infer<typeof createProjectSchema>;

// `key` is deliberately absent — CLAUDE.md §4.1: "generated server-side and never accepted
// from the client," and it isn't mutable after creation either.
export const updateProjectSchema = z.object({
  name: z.string().trim().min(1).max(120),
});

export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;
