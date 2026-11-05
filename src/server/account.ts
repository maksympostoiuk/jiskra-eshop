"use server";

import { getLocale, getTranslations } from "next-intl/server";
import { prisma } from "@/lib/db";
import { authenticateCustomer, registerCustomer, requestPasswordReset, resetPassword } from "@/lib/auth/customer-accounts";
import { createCustomerSession, destroyCustomerSession, getCustomer } from "@/lib/auth/customer-session";
import { rateLimit } from "@/lib/auth/rate-limit";
import { customerLoginSchema, forgotPasswordSchema, profileSchema, registerSchema, resetPasswordSchema } from "@/lib/validation/store";
import { sendAccountExistsEmail, sendPasswordResetEmail, sendVerificationEmail } from "./notifications";
import { validateInput, type ActionResult } from "./action";
import { clientIp } from "./request";

async function limited(key: string, limit: number, windowMs: number) {
  return !(await rateLimit(key, limit, windowMs)).ok;
}

/** Always answers the same way whether or not the address is registered (no account enumeration). */
export async function registerAccount(input: unknown): Promise<ActionResult> {
  const t = await getTranslations("account");
  const parsed = await validateInput(registerSchema, input);
  if (!parsed.success) return { ok: false, errors: parsed.errors };
  if ((await limited(`register:${await clientIp()}`, 10, 60 * 60 * 1000)) || (await limited(`register:${parsed.data.email}`, 3, 60 * 60 * 1000))) {
    return { ok: false, message: t("errors.tooMany") };
  }
  const locale = await getLocale();
  const result = await registerCustomer(prisma, parsed.data);
  if (result.status === "VERIFY") await sendVerificationEmail(parsed.data.email, parsed.data.firstName, locale, result.token);
  else await sendAccountExistsEmail(parsed.data.email, locale);
  return { ok: true, message: t("register.checkEmail", { email: parsed.data.email }) };
}

export async function loginAccount(input: unknown): Promise<ActionResult> {
  const t = await getTranslations("account");
  const parsed = await validateInput(customerLoginSchema, input);
  if (!parsed.success) return { ok: false, errors: parsed.errors };
  if ((await limited(`customer-login:${await clientIp()}:${parsed.data.email}`, 5, 15 * 60 * 1000)) || (await limited(`customer-login:${parsed.data.email}`, 20, 15 * 60 * 1000))) {
    return { ok: false, message: t("errors.tooMany") };
  }
  const result = await authenticateCustomer(prisma, parsed.data.email, parsed.data.password);
  if (!result.ok) return { ok: false, message: result.reason === "UNVERIFIED" ? t("login.unverified") : t("login.invalid") };
  await createCustomerSession(result.customerId);
  return { ok: true };
}

export async function logoutAccount(): Promise<void> {
  await destroyCustomerSession();
}

export async function forgotPassword(input: unknown): Promise<ActionResult> {
  const t = await getTranslations("account");
  const parsed = await validateInput(forgotPasswordSchema, input);
  if (!parsed.success) return { ok: false, errors: parsed.errors };
  if (await limited(`forgot:${parsed.data.email}`, 3, 60 * 60 * 1000)) return { ok: false, message: t("errors.tooMany") };
  const reset = await requestPasswordReset(prisma, parsed.data.email);
  if (reset) await sendPasswordResetEmail(parsed.data.email, await getLocale(), reset.token);
  return { ok: true, message: t("forgot.sent") };
}

export async function resetAccountPassword(input: unknown): Promise<ActionResult> {
  const t = await getTranslations("account");
  const parsed = await validateInput(resetPasswordSchema, input);
  if (!parsed.success) return { ok: false, errors: parsed.errors };
  const customerId = await resetPassword(prisma, parsed.data.token, parsed.data.password);
  if (!customerId) return { ok: false, message: t("reset.invalid") };
  await createCustomerSession(customerId);
  return { ok: true, message: t("reset.done") };
}

export async function updateProfile(input: unknown): Promise<ActionResult> {
  const t = await getTranslations("account");
  const customer = await getCustomer();
  if (!customer) return { ok: false, message: t("errors.signedOut") };
  const parsed = await validateInput(profileSchema, input);
  if (!parsed.success) return { ok: false, errors: parsed.errors };
  await prisma.customer.update({ where: { id: customer.id }, data: { ...parsed.data, phone: parsed.data.phone || null } });
  return { ok: true, message: t("profile.saved") };
}
