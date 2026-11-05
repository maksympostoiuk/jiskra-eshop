"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useAction } from "@/components/admin/use-action";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, Input, fieldAria } from "@/components/ui/form";
import { login } from "@/server/admin/auth";

export function LoginForm({ next }: { next?: string }) {
  const t = useTranslations("admin.login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const { pending, errors, message, run } = useAction(login);

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        run({ email, password, next });
      }}
      noValidate
    >
      {message && <Alert tone="error">{message.text}</Alert>}
      <Field id="email" label={t("email")} error={errors.email}>
        <Input {...fieldAria("email", errors.email)} type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} required />
      </Field>
      <Field id="password" label={t("password")} error={errors.password}>
        <Input
          {...fieldAria("password", errors.password)}
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
      </Field>
      <Button type="submit" size="lg" className="mt-2 w-full" disabled={pending}>
        {pending ? t("signingIn") : t("submit")}
      </Button>
    </form>
  );
}
