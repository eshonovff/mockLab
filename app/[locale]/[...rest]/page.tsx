import { notFound } from "next/navigation";

// `[locale]` is a single dynamic segment, not a catch-all — so a genuinely unmatched path (no
// real page.tsx anywhere) never actually enters the `[locale]` tree at all, and the nested
// `app/[locale]/not-found.tsx` never gets a chance to render (confirmed: without this file,
// curling a bogus `/en/...` path returned Next's bare, unstyled default 404, not the localized
// one). This catch-all *does* match any such path, entering the tree — including the ancestor
// `[locale]/layout.tsx`'s locale/`<html lang>` setup — and then explicitly calls `notFound()`,
// which activates the nearest real `not-found.tsx` boundary with full locale context intact.
// The standard next-intl pattern for this exact problem, not custom infrastructure.
export default function CatchAll() {
  notFound();
}
