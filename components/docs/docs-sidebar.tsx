import { Link } from "@/i18n/navigation";
import type { DocPageMeta } from "@/lib/docs/content";
import { cn } from "@/lib/utils";

// Server-rendered — no interactivity of its own. `MobileNavToggle` (the one other allowed
// client component per CLAUDE.md §6.1, besides the copy button) only toggles this nav's CSS
// visibility on small viewports; it doesn't need this to be a client component itself.
export function DocsSidebar({ pages, activeSlug }: { pages: DocPageMeta[]; activeSlug: string }) {
  return (
    <nav aria-label="Documentation" className="flex flex-col gap-0.5">
      {pages.map((page) => {
        const isActive = page.slug === activeSlug;
        return (
          <Link
            key={page.slug}
            href={`/docs/${page.slug}`}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "rounded-control px-3 py-2 text-caption transition-colors",
              isActive
                ? "bg-accent-soft font-medium text-accent"
                : "text-ink-muted hover:bg-muted/50 hover:text-ink",
            )}
          >
            {page.title}
          </Link>
        );
      })}
    </nav>
  );
}
