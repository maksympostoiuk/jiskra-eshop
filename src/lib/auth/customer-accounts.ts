import type { PrismaClient } from "@prisma/client";
import { hashPassword, verifyPassword } from "./password";
import { hashToken } from "./tokens";
import { randomToken } from "@/lib/random";

export type TokenPurpose = "VERIFY_EMAIL" | "RESET_PASSWORD";
const TOKEN_TTL_MS: Record<TokenPurpose, number> = { VERIFY_EMAIL: 48 * 60 * 60 * 1000, RESET_PASSWORD: 60 * 60 * 1000 };
// Valid bcrypt hash used to keep the timing similar when the account does not exist.
const DUMMY_HASH = "$2b$12$hsxpeyVIPUUGCZCQ3Lt7zObCqoVIBo0H.J0wzl4xVqd.E7osJEUme";

/** Create a single-use token; earlier unused tokens of the same purpose are invalidated. Returns the raw token. */
export async function issueToken(db: PrismaClient, customerId: string, purpose: TokenPurpose, now = new Date()): Promise<string> {
  const token = randomToken(32);
  await db.$transaction([
    db.customerToken.updateMany({ where: { customerId, purpose, usedAt: null }, data: { usedAt: now } }),
    db.customerToken.create({ data: { id: hashToken(token), customerId, purpose, expiresAt: new Date(now.getTime() + TOKEN_TTL_MS[purpose]) } }),
  ]);
  return token;
}

/** Mark a token as used (atomically) and return its customer, or null if unknown, expired, used or of another purpose. */
export async function consumeToken(db: PrismaClient, token: string, purpose: TokenPurpose, now = new Date()): Promise<string | null> {
  if (!token || token.length > 200) return null;
  const id = hashToken(token);
  const used = await db.customerToken.updateMany({ where: { id, purpose, usedAt: null, expiresAt: { gt: now } }, data: { usedAt: now } });
  if (used.count !== 1) return null;
  return (await db.customerToken.findUnique({ where: { id }, select: { customerId: true } }))?.customerId ?? null;
}

export type RegisterInput = { email: string; password: string; firstName: string; lastName: string };
export type RegisterResult = { status: "VERIFY"; customerId: string; token: string } | { status: "EXISTS"; customerId: string };

/**
 * Register (or re-register an unverified / guest) customer. Existing verified accounts are left untouched —
 * the caller should e-mail the owner instead of revealing that the address is registered.
 */
export async function registerCustomer(db: PrismaClient, input: RegisterInput): Promise<RegisterResult> {
  const email = input.email.toLowerCase();
  const existing = await db.customer.findUnique({ where: { email } });
  if (existing?.emailVerifiedAt && existing.passwordHash) return { status: "EXISTS", customerId: existing.id };
  const passwordHash = await hashPassword(input.password);
  const customer = await db.customer.upsert({
    where: { email },
    create: { email, firstName: input.firstName, lastName: input.lastName, passwordHash },
    update: { firstName: input.firstName, lastName: input.lastName, passwordHash, emailVerifiedAt: null },
  });
  await db.customerSession.deleteMany({ where: { customerId: customer.id } });
  return { status: "VERIFY", customerId: customer.id, token: await issueToken(db, customer.id, "VERIFY_EMAIL") };
}

export async function verifyEmail(db: PrismaClient, token: string, now = new Date()): Promise<string | null> {
  const customerId = await consumeToken(db, token, "VERIFY_EMAIL", now);
  if (customerId) await db.customer.update({ where: { id: customerId }, data: { emailVerifiedAt: now } });
  return customerId;
}

export type AuthResult = { ok: true; customerId: string } | { ok: false; reason: "INVALID" | "UNVERIFIED" };

export async function authenticateCustomer(db: PrismaClient, email: string, password: string): Promise<AuthResult> {
  const customer = await db.customer.findUnique({ where: { email: email.toLowerCase() } });
  const valid = await verifyPassword(password, customer?.passwordHash ?? DUMMY_HASH);
  if (!customer?.passwordHash || !valid) return { ok: false, reason: "INVALID" };
  if (!customer.emailVerifiedAt) return { ok: false, reason: "UNVERIFIED" };
  return { ok: true, customerId: customer.id };
}

/** Returns a reset token for verified accounts only (null otherwise — callers respond identically). */
export async function requestPasswordReset(db: PrismaClient, email: string): Promise<{ customerId: string; token: string } | null> {
  const customer = await db.customer.findUnique({ where: { email: email.toLowerCase() } });
  if (!customer?.passwordHash || !customer.emailVerifiedAt) return null;
  return { customerId: customer.id, token: await issueToken(db, customer.id, "RESET_PASSWORD") };
}

/** Set a new password with a reset token; signs out all sessions. */
export async function resetPassword(db: PrismaClient, token: string, password: string): Promise<string | null> {
  const customerId = await consumeToken(db, token, "RESET_PASSWORD");
  if (!customerId) return null;
  await db.customer.update({ where: { id: customerId }, data: { passwordHash: await hashPassword(password) } });
  await db.customerSession.deleteMany({ where: { customerId } });
  return customerId;
}
