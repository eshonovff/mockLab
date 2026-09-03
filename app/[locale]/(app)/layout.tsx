import type { ReactNode } from "react";

import { RailNav } from "@/components/shell/rail-nav";
import { TopBar } from "@/components/shell/top-bar";

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div className="bg-canvas flex min-h-dvh gap-4 p-4">
      <aside className="bg-rail sticky top-4 hidden h-[calc(100dvh-2rem)] w-64 shrink-0 rounded-card lg:block">
        <RailNav />
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar />
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}
