import type { ReactNode } from "react";

// Shared by the root and dashboard not-found/error boundaries (task 9.3) — CLAUDE.md §6's own
// empty-state rule applies here too: "an instruction plus one button, never an illustration and
// never an apology." No icon, no graphic — just the two lines of text and whatever action(s)
// the caller passes in.
export function StateMessage({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action: ReactNode;
}) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-4 text-center">
      <div className="flex flex-col gap-2">
        <h1 className="text-h2 text-ink">{title}</h1>
        <p className="text-body text-ink-muted max-w-sm">{description}</p>
      </div>
      <div className="flex items-center gap-2">{action}</div>
    </div>
  );
}
