"use client";

import { useState, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import type * as z from "zod";
import { Alert } from "@/components/ui/alert";
import { Field, Input, fieldAria } from "@/components/ui/form";
import { Link, useRouter } from "@/i18n/navigation";
import { validateWith, type FieldErrors } from "@/lib/validation/i18n";
import { customerLoginSchema, forgotPasswordSchema, profileSchema, registerSchema, resetPasswordSchema } from "@/lib/validation/store";
import { forgotPassword, loginAccount, registerAccount, resetAccountPassword, updateProfile } from "@/server/account";

type Result = { ok: boolean; message?: string; errors?: FieldErrors };
type FieldDef = { name: string; label: string; type?: string; autoComplete?: string; hint?: string };

/** Small generic form: client-side Zod validation (same schema as the server) + server action. */
function AccountForm({
  fields,
  initial,
  schema,
  action,
  submitLabel,
  onSuccess,
  keepOnSuccess = false,
  hidden,
}: {
  fields: FieldDef[];
  initial: Record<string, string>;
  schema: z.ZodType;
  action: (input: unknown) => Promise<Result>;
  submitLabel: string;
  onSuccess?: () => void;
  keepOnSuccess?: boolean;
  hidden?: Record<string, string>;
}) {
  const tv = useTranslations("validation");
  const tc = useTranslations("account");
  const locale = useLocale();
  const [values, setValues] = useState(initial);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [message, setMessage] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const [pending, start] = useTransition();
  const [done, setDone] = useState(false);

  const submit = () => {
    const input = { ...values, ...hidden };
    const local = validateWith(schema, input, locale, (k, v) => tv(k, v));
    if (!local.success) return setErrors(local.errors);
    start(async () => {
      const result = await action(input);
      setErrors(result.errors ?? {});
      setMessage(result.message ? { tone: result.ok ? "success" : "error", text: result.message } : null);
      if (result.ok) {
        if (!keepOnSuccess) setDone(true);
        onSuccess?.();
      }
    });
  };

  return (
    <form onSubmit={(e) => (e.preventDefault(), submit())} noValidate className="flex flex-col gap-4">
      {message && <Alert tone={message.tone}>{message.text}</Alert>}
      {!done &&
        fields.map((f) => (
          <Field key={f.name} id={`acc-${f.name}`} label={f.label} error={errors[f.name]} hint={f.hint}>
            <Input
              {...fieldAria(`acc-${f.name}`, errors[f.name])}
              type={f.type ?? "text"}
              autoComplete={f.autoComplete}
              value={values[f.name] ?? ""}
              onChange={(e) => {
                setValues({ ...values, [f.name]: e.target.value });
                if (errors[f.name]) setErrors(Object.fromEntries(Object.entries(errors).filter(([k]) => k !== f.name)));
              }}
            />
          </Field>
        ))}
      {!done && (
        <button type="submit" disabled={pending} className="mt-1 h-12 rounded-full bg-ink font-semibold text-white hover:bg-brand disabled:opacity-60">
          {pending ? tc("working") : submitLabel}
        </button>
      )}
    </form>
  );
}

export function LoginForm({ next }: { next?: string }) {
  const t = useTranslations("account");
  const router = useRouter();
  const target = next && next.startsWith("/") && !next.startsWith("//") ? next : "/account";
  return (
    <AccountForm
      schema={customerLoginSchema}
      action={loginAccount}
      initial={{ email: "", password: "" }}
      fields={[
        { name: "email", label: t("fields.email"), type: "email", autoComplete: "email" },
        { name: "password", label: t("fields.password"), type: "password", autoComplete: "current-password" },
      ]}
      submitLabel={t("login.submit")}
      keepOnSuccess
      onSuccess={() => {
        router.push(target);
        router.refresh();
      }}
    />
  );
}

export function RegisterForm() {
  const t = useTranslations("account");
  return (
    <AccountForm
      schema={registerSchema}
      action={registerAccount}
      initial={{ firstName: "", lastName: "", email: "", password: "" }}
      fields={[
        { name: "firstName", label: t("fields.firstName"), autoComplete: "given-name" },
        { name: "lastName", label: t("fields.lastName"), autoComplete: "family-name" },
        { name: "email", label: t("fields.email"), type: "email", autoComplete: "email" },
        { name: "password", label: t("fields.password"), type: "password", autoComplete: "new-password", hint: t("fields.passwordHint") },
      ]}
      submitLabel={t("register.submit")}
    />
  );
}

export function ForgotForm() {
  const t = useTranslations("account");
  return (
    <AccountForm
      schema={forgotPasswordSchema}
      action={forgotPassword}
      initial={{ email: "" }}
      fields={[{ name: "email", label: t("fields.email"), type: "email", autoComplete: "email" }]}
      submitLabel={t("forgot.submit")}
    />
  );
}

export function ResetForm({ token }: { token: string }) {
  const t = useTranslations("account");
  const router = useRouter();
  return (
    <>
      <AccountForm
        schema={resetPasswordSchema}
        action={resetAccountPassword}
        initial={{ password: "" }}
        hidden={{ token }}
        fields={[{ name: "password", label: t("fields.newPassword"), type: "password", autoComplete: "new-password", hint: t("fields.passwordHint") }]}
        submitLabel={t("reset.submit")}
        onSuccess={() => router.refresh()}
      />
      <Link href="/account" className="mt-4 inline-block text-sm text-brand hover:underline">{t("reset.toAccount")}</Link>
    </>
  );
}

export function ProfileForm({ initial }: { initial: { firstName: string; lastName: string; phone: string } }) {
  const t = useTranslations("account");
  const router = useRouter();
  return (
    <AccountForm
      schema={profileSchema}
      action={updateProfile}
      initial={initial}
      fields={[
        { name: "firstName", label: t("fields.firstName"), autoComplete: "given-name" },
        { name: "lastName", label: t("fields.lastName"), autoComplete: "family-name" },
        { name: "phone", label: t("fields.phone"), type: "tel", autoComplete: "tel" },
      ]}
      submitLabel={t("profile.save")}
      keepOnSuccess
      onSuccess={() => router.refresh()}
    />
  );
}
