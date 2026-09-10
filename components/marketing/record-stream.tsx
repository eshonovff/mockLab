import { getRecordStreamLines } from "@/lib/marketing/record-stream-samples";

// Duplicated once so the 0% -> -50% loop (see --animate-record-stream, app/globals.css) is
// seamless: the second half is identical to the first, so the moment it finishes scrolling
// through one copy, the next copy is already in the exact same visual position.
const LINE_COUNT = 26;

/**
 * The hero's "record press" — an ambient, continuous stream of real generated records behind
 * the hero content (CLAUDE.md §6's marketing-only exception: autonomous motion, not gated on a
 * user action). Not decoration: every line is a real record from the actual generator
 * (lib/marketing/record-stream-samples.ts calls lib/generator/record.ts directly, same as the
 * product's real `/m/...` endpoints), so what's visible here is an honest, larger-scale version
 * of the same claim the "Run this request" demo makes — this keeps producing records, on its
 * own, for free, forever.
 *
 * Pure CSS (`motion-safe:animate-record-stream` — a plain `@keyframes` loop, no JS), so this
 * stays a server component like the rest of the marketing tree. `aria-hidden`: it's ambient
 * texture, not content — the live demo card is where a screen reader user gets the real thing.
 */
export function RecordStream() {
  const lines = getRecordStreamLines(LINE_COUNT);
  const looped = [...lines, ...lines];

  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="motion-safe:animate-record-stream flex flex-col gap-3 will-change-transform">
        {looped.map((line, index) => (
          <p key={index} className="truncate px-6 font-mono text-caption text-accent/15 sm:px-10">
            {line}
          </p>
        ))}
      </div>

      {/* Top/bottom fade so the stream dissolves into the canvas rather than hard-cutting at
          the section's edges. Headline/subhead legibility itself isn't handled here — a fixed
          pixel height can't track six locales' worth of different text lengths (RU/TG run
          longer than EN) — it's handled by the text column's own content-sized backdrop in
          hero.tsx instead. */}
      <div className="absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-canvas to-transparent" />
      <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-canvas to-transparent" />
    </div>
  );
}
