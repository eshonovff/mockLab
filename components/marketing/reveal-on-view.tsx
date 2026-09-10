"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";

import { cn } from "@/lib/utils";

// React warns if `useLayoutEffect` runs during SSR (it can't be encoded into the server
// render). Client components in the App Router are still server-rendered for the initial HTML,
// so this guards the same way libraries like Redux and Framer Motion do.
const useIsomorphicLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;

function prefersReducedMotion(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * A thin client leaf (the same "island" pattern as `HeroDemo`) around otherwise fully static,
 * server-rendered children — the how-it-works section stays a server component; only this
 * wrapper is a client component. Nothing here ever hides content in the server-rendered HTML or
 * the default CSS state: a client with JS disabled, or a crawler that doesn't run it, always
 * sees the final, fully visible section (`data-reveal="revealed"` is the value on every render
 * until proven otherwise).
 *
 * On mount, a synchronous pre-paint check (`useLayoutEffect`, not `useEffect`) arms the entrance
 * only if the section isn't already on screen at that moment — and since an element that needs
 * arming is by definition not currently visible, there's nothing for the user to see flash
 * either way. An `IntersectionObserver` then fires the reveal exactly once, the first time it
 * scrolls into view, and disconnects immediately after — it never replays on a scroll back up.
 */
export function RevealOnView({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [armed, setArmed] = useState(false);
  const [revealed, setRevealed] = useState(false);

  useIsomorphicLayoutEffect(() => {
    const el = ref.current;
    if (!el || prefersReducedMotion()) return;

    const alreadyOnScreen = el.getBoundingClientRect().top < window.innerHeight;
    if (alreadyOnScreen) return;

    const frame = requestAnimationFrame(() => setArmed(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    if (!armed) return;
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setRevealed(true);
          observer.disconnect();
        }
      },
      { threshold: 0.2 },
    );
    observer.observe(el);

    return () => observer.disconnect();
  }, [armed]);

  return (
    <div
      ref={ref}
      data-reveal={armed && !revealed ? "hidden" : "revealed"}
      className={cn("group/reveal", className)}
    >
      {children}
    </div>
  );
}
