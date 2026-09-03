import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { RegisterForm } from "@/components/auth/register-form";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("auth");
  return { title: t("register.title") };
}

export default function RegisterPage() {
  return <RegisterForm />;
}
