import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";

import { LoginForm } from "@/components/auth/login-form";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("auth");
  return { title: t("login.title") };
}

export default function LoginPage() {
  // LoginForm reads the `next` search param (to redirect back after a guarded route sent the
  // user here), which requires a Suspense boundary so the page's static shell can still
  // prerender per CLAUDE.md §8.1 — https://nextjs.org/docs/messages/missing-suspense-with-csr-bailout
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
