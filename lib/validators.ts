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
