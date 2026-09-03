"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useLocale, useTranslations } from "next-intl";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Link } from "@/i18n/navigation";
import { loginSchema, type LoginInput } from "@/lib/validators";

// Only accept a same-origin, relative `next` — it comes from the URL and could otherwise be
// used for an open redirect (e.g. ?next=https://evil.example or ?next=//evil.example).
function safeNextPath(next: string | null): string | null {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.includes("://")) {
    return null;
  }
  return next;
}

export function LoginForm() {
  const t = useTranslations("auth");
  const locale = useLocale();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [formError, setFormError] = useState<string | null>(null);

  const form = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  async function onSubmit(values: LoginInput) {
    setFormError(null);

    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });

    if (response.ok) {
      router.push(safeNextPath(searchParams.get("next")) ?? `/${locale}/dashboard`);
      router.refresh();
      return;
    }

    // The API's own message text is English-only and not meant for display (CLAUDE.md §7 —
    // /api/* is never localized) — react to the status code instead and show our own copy.
    setFormError(response.status === 403 ? t("login.suspended") : t("login.invalidCredentials"));
  }

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle className="text-h3">{t("login.title")}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="login-email">{t("fields.email")}</Label>
            <Input
              id="login-email"
              type="email"
              autoComplete="email"
              aria-invalid={!!form.formState.errors.email}
              {...form.register("email")}
            />
            {form.formState.errors.email && (
              <p role="alert" className="text-badge-rose-fg text-caption">
                {t("errors.emailInvalid")}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="login-password">{t("fields.password")}</Label>
            <Input
              id="login-password"
              type="password"
              autoComplete="current-password"
              aria-invalid={!!form.formState.errors.password}
              {...form.register("password")}
            />
          </div>

          {formError && (
            <p role="alert" className="text-badge-rose-fg text-caption">
              {formError}
            </p>
          )}

          <Button type="submit" disabled={form.formState.isSubmitting} className="w-full">
            {t("login.submit")}
          </Button>
        </form>

        <p className="text-ink-muted text-caption mt-4">
          {t("login.noAccount")}{" "}
          <Link href="/register" className="text-accent underline underline-offset-4">
            {t("login.registerLink")}
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
