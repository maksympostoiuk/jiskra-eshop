import "server-only";
import { cache } from "react";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import type { AdminRole } from "@/lib/domain";
import { randomToken } from "@/lib/random";
import { hashToken } from "./tokens";

import { ADMIN_SESSION_COOKIE } from "./cookies";

export { ADMIN_SESSION_COOKIE };
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export type AdminIdentity = { id: string; email: string; name: string; role: AdminRole };

export async function createAdminSession(adminUserId: string): Promise<void> {
  const token = randomToken(32);
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  const userAgent = (await headers()).get("user-agent")?.slice(0, 250) ?? null;
  await prisma.adminSession.create({ data: { id: hashToken(token), adminUserId, expiresAt, userAgent } });
  (await cookies()).set(ADMIN_SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

/** Current admin (validated against the database), memoized per request. */
export const getAdmin = cache(async (): Promise<AdminIdentity | null> => {
  const token = (await cookies()).get(ADMIN_SESSION_COOKIE)?.value;
  if (!token) return null;
  const session = await prisma.adminSession.findUnique({
    where: { id: hashToken(token) },
    include: { adminUser: { select: { id: true, email: true, name: true, role: true, isActive: true } } },
  });
  if (!session || session.expiresAt < new Date() || !session.adminUser.isActive) return null;
  const { id, email, name, role } = session.adminUser;
  return { id, email, name, role: role === "ADMIN" ? "ADMIN" : "EDITOR" };
});

/**
 * Guard for admin pages and server actions. Redirects to the login page when there is no valid session.
 * With `role: "ADMIN"`, editors are redirected to the dashboard with a "forbidden" notice.
 */
export async function requireAdmin(options: { role?: AdminRole } = {}): Promise<AdminIdentity> {
  const admin = await getAdmin();
  if (!admin) redirect("/admin/login");
  if (options.role === "ADMIN" && admin.role !== "ADMIN") redirect("/admin?forbidden=1");
  return admin;
}

/** Id (hash) of the current admin session, if any. */
export async function currentAdminSessionId(): Promise<string | null> {
  const token = (await cookies()).get(ADMIN_SESSION_COOKIE)?.value;
  return token ? hashToken(token) : null;
}

export async function destroyAdminSession(): Promise<void> {
  const store = await cookies();
  const token = store.get(ADMIN_SESSION_COOKIE)?.value;
  if (token) await prisma.adminSession.deleteMany({ where: { id: hashToken(token) } });
  store.delete(ADMIN_SESSION_COOKIE);
}

export async function purgeExpiredSessions(): Promise<void> {
  await prisma.adminSession.deleteMany({ where: { expiresAt: { lt: new Date() } } });
}
