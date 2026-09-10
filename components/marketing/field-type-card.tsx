"use client";

import type { ReactNode } from "react";
import { useState } from "react";

/**
 * One field-type showcase card. The example value isn't decoration — it's a real value pulled
 * from the actual generator (`lib/marketing/field-samples.ts`, computed server-side and passed
 * in as `samples`), and cycling through a few of them on hover/focus/click demonstrates the
 * actual product behavior (a resource generates a different value per record) rather than
 * just naming it. A real `<button>`, not a `div` with a fake `tabIndex`, so keyboard users get
 * this via the same natural focus that sighted mouse users get via hover.
 *
 * `icon` is a already-rendered element, not a component reference — a Server Component can pass
 * rendered JSX across the client boundary, but not a bare function/component value.
 */
export function FieldTypeCard({
  label,
  icon,
  samples,
}: {
  label: string;
  icon: ReactNode;
  samples: string[];
}) {
  const [index, setIndex] = useState(0);

  function advance() {
    setIndex((current) => (current + 1) % samples.length);
  }

  return (
    <button
      type="button"
      onMouseEnter={advance}
      onFocus={advance}
      onClick={advance}
      className="flex flex-col gap-2 rounded-card border border-line bg-surface p-4 text-left transition-colors duration-150 ease-out hover:border-accent/40"
    >
      {icon}
      <code className="font-mono text-caption text-ink">{label}</code>
      <span
        key={index}
        className="truncate font-mono text-caption text-ink-muted motion-safe:animate-in motion-safe:fade-in"
      >
        {samples[index]}
      </span>
    </button>
  );
}
