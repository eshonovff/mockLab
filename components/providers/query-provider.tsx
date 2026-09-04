"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";

// CLAUDE.md §2: TanStack Query is scoped to the dashboard, not the whole app — wired into
// app/[locale]/(app)/layout.tsx only, not the root locale layout.
export function QueryProvider({ children }: { children: React.ReactNode }) {
  // Created once per component instance via useState's lazy initializer, not at module scope —
  // a module-level client would be shared across requests on the server, leaking one user's
  // cached data into another's response during SSR.
  const [queryClient] = useState(() => new QueryClient());

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
