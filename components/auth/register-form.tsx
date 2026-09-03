"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Link, useRouter } from "@/i18n/navigation";
import { registerSchema } from "@/lib/validators";

export function RegisterForm() {
  const t = useTranslations("auth");
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);

  // No explicit useForm<T> generic — the schema's `name` transform makes its input type
  // (raw form fields, before parsing) differ from its output type (after parsing, what the
  // submit handler receives). Letting RHF infer both from the resolver keeps them straight.
  const form = useForm({
    resolver: zodResolver(registerSchema),
    defaultValues: { email: "", password: "", name: "" },
  });

  async function onSubmit(values: { email: string; password: string; name?: string }) {
    setFormError(null);

    const response = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });

    if (response.ok) {
      router.push("/dashboard");
      router.refresh();
      return;
    }

    // Same reasoning as the login form: react to status/shape, not the API's English text.
    if (response.status === 409) {
      form.setError("email", { message: t("errors.emailTaken") });
      return;
    }

    setFormError(t("errors.generic"));
  }

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle className="text-h3">{t("register.title")}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="register-name">{t("fields.name")}</Label>
            <Input id="register-name" autoComplete="name" {...form.register("name")} />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="register-email">{t("fields.email")}</Label>
            <Input
              id="register-email"
              type="email"
              autoComplete="email"
              error={
                form.formState.errors.email
                  ? form.formState.errors.email.message === t("errors.emailTaken")
                    ? t("errors.emailTaken")
                    : t("errors.emailInvalid")
                  : undefined
              }
              {...form.register("email")}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="register-password">{t("fields.password")}</Label>
            <Input
              id="register-password"
              type="password"
              autoComplete="new-password"
              error={form.formState.errors.password ? t("errors.passwordMin") : undefined}
              {...form.register("password")}
            />
          </div>

          {formError && (
            <p role="alert" className="text-badge-rose-fg text-caption">
              {formError}
            </p>
          )}

          <Button type="submit" loading={form.formState.isSubmitting} className="w-full">
            {t("register.submit")}
          </Button>
        </form>

        <p className="text-ink-muted text-caption mt-4">
          {t("register.hasAccount")}{" "}
          <Link href="/login" className="text-accent underline underline-offset-4">
            {t("register.loginLink")}
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
