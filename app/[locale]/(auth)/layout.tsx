import type { ReactNode } from "react";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return <div className="bg-canvas flex min-h-dvh items-center justify-center p-4">{children}</div>;
}
