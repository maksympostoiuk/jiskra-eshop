import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import { randomToken } from "@/lib/random";
import { hashToken } from "./tokens";

export const CUSTOMER_SESSION_COOKIE = "customer_session";
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

export type CustomerIdentity = { id: string; email: string; firstName: string; lastName: string; phone: string | null };

export async function createCustomerSession(customerId: string): Promise<void> {
  const token = randomToken(32);
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  await prisma.customerSession.create({ data: { id: hashToken(token), customerId, expiresAt } });
  (await cookies()).set(CUSTOMER_SESSION_COOKIE, token, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", expires: expiresAt });
}

/** Signed-in customer (verified account, valid session), memoized per request. */
export const getCustomer = cache(async (): Promise<CustomerIdentity | null> => {
  const token = (await cookies()).get(CUSTOMER_SESSION_COOKIE)?.value;
  if (!token) return null;
  const session = await prisma.customerSession.findUnique({ where: { id: hashToken(token) }, include: { customer: true } });
  if (!session || session.expiresAt < new Date() || !session.customer.emailVerifiedAt || !session.customer.passwordHash) return null;
  const { id, email, firstName, lastName, phone } = session.customer;
  return { id, email, firstName, lastName, phone };
});

export async function destroyCustomerSession(): Promise<void> {
  const store = await cookies();
  const token = store.get(CUSTOMER_SESSION_COOKIE)?.value;
  if (token) await prisma.customerSession.deleteMany({ where: { id: hashToken(token) } });
  store.delete(CUSTOMER_SESSION_COOKIE);
}
