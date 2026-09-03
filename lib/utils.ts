import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

// Vanilla tailwind-merge only knows Tailwind's *default* font-size scale (text-xs..text-9xl) —
// it has no visibility into app/globals.css's custom @theme text-* scale (CLAUDE.md §6's
// 32/24/18/15/13 tokens). Without this, e.g. `text-caption` isn't recognized as a font-size
// utility, falls into the generic "text-color" group instead, and silently gets dropped
// whenever it's merged alongside a real text-color utility like `text-primary-foreground` —
// confirmed happening in practice while building the Button size/variant system (task 1.2b).
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      "font-size": [{ text: ["display", "h2", "h3", "body", "caption"] }],
    },
  },
});

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
