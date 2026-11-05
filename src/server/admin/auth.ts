"use server";

import { headers, cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { prisma } from "@/lib/db";
import { verifyPassword } from "@/lib/auth/password";
import { rateLimit, resetRateLimit } from "@/lib/auth/rate-limit";
import { createAdminSession, destroyAdminSession, purgeExpiredSessions } from "@/lib/auth/session";
import { loginSchema } from "@/lib/validation/admin";
import { isLocale } from "@/i18n/routing";
import { ADMIN_LOCALE_COOKIE } from "@/i18n/request";
import { validateInput, type ActionResult } from "../action";

// A valid bcrypt hash used to keep timing similar when the e-mail does not exist.
const DUMMY_HASH = "$2b$12$hsxpeyVIPUUGCZCQ3Lt7zObCqoVIBo0H.J0wzl4xVqd.E7osJEUme";

export async function login(input: { email: string; password: string; next?: string }): Promise<ActionResult> {
  const t = await getTranslations("admin.login");
  const parsed = await validateInput(loginSchema, input);
  if (!parsed.success) return { ok: false, errors: parsed.errors };

  const ip = (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  const key = `login:${ip}:${parsed.data.email}`;
  const limit = rateLimit(key, 5, 15 * 60 * 1000);
  if (!limit.ok) {
    return { ok: false, message: t("tooManyAttempts", { minutes: Math.ceil(limit.retryAfterMs / 60000) }) };
  }

  const user = await prisma.adminUser.findUnique({ where: { email: parsed.data.email } });
  const valid = await verifyPassword(parsed.data.password, user?.passwordHash ?? DUMMY_HASH);
  if (!user || !valid || !user.isActive) return { ok: false, message: t("invalid") };

  resetRateLimit(key);
  await purgeExpiredSessions();
  await createAdminSession(user.id);
  await prisma.adminUser.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });

  const next = input.next && input.next.startsWith("/admin") && !input.next.startsWith("//") ? input.next : "/admin";
  redirect(next);
}

export async function logout(): Promise<void> {
  await destroyAdminSession();
  redirect("/admin/login");
}

export async function setAdminLocale(locale: string): Promise<void> {
  if (!isLocale(locale)) return;
  (await cookies()).set(ADMIN_LOCALE_COOKIE, locale, { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });
}
