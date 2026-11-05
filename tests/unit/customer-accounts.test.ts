import { afterAll, describe, expect, it } from "vitest";
import { PrismaClient } from "@prisma/client";
import { authenticateCustomer, consumeToken, issueToken, registerCustomer, requestPasswordReset, resetPassword, verifyEmail } from "@/lib/auth/customer-accounts";

const db = new PrismaClient({ datasources: { db: { url: "file:./test.db" } } });
afterAll(() => db.$disconnect());

const reg = { email: "Petra@Example.com", password: "very-secret-1", firstName: "Petra", lastName: "Nová" };

describe("customer accounts (integration)", () => {
  it("requires e-mail verification before sign-in", async () => {
    const r = await registerCustomer(db, reg);
    expect(r.status).toBe("VERIFY");
    expect(await authenticateCustomer(db, "petra@example.com", "very-secret-1")).toEqual({ ok: false, reason: "UNVERIFIED" });
    if (r.status !== "VERIFY") throw new Error();
    expect(await verifyEmail(db, r.token)).toBe(r.customerId);
    expect(await authenticateCustomer(db, "PETRA@example.com", "very-secret-1")).toEqual({ ok: true, customerId: r.customerId });
    expect(await authenticateCustomer(db, "petra@example.com", "wrong-password")).toEqual({ ok: false, reason: "INVALID" });
    expect(await authenticateCustomer(db, "nobody@example.com", "very-secret-1")).toEqual({ ok: false, reason: "INVALID" });
  });

  it("tokens are single-use and verification links cannot be replayed", async () => {
    const customer = await db.customer.findUniqueOrThrow({ where: { email: "petra@example.com" } });
    const token = await issueToken(db, customer.id, "RESET_PASSWORD");
    expect(await consumeToken(db, token, "VERIFY_EMAIL")).toBeNull(); // wrong purpose
    expect(await consumeToken(db, token, "RESET_PASSWORD")).toBe(customer.id);
    expect(await consumeToken(db, token, "RESET_PASSWORD")).toBeNull(); // already used
  });

  it("expired and superseded tokens are rejected", async () => {
    const customer = await db.customer.findUniqueOrThrow({ where: { email: "petra@example.com" } });
    const old = await issueToken(db, customer.id, "RESET_PASSWORD", new Date("2020-01-01"));
    expect(await consumeToken(db, old, "RESET_PASSWORD")).toBeNull();
    const first = await issueToken(db, customer.id, "RESET_PASSWORD");
    await issueToken(db, customer.id, "RESET_PASSWORD");
    expect(await consumeToken(db, first, "RESET_PASSWORD")).toBeNull();
  });

  it("does not let anyone take over a verified account by registering again", async () => {
    const again = await registerCustomer(db, { ...reg, password: "attacker-pass-1", firstName: "Eve" });
    expect(again.status).toBe("EXISTS");
    expect((await authenticateCustomer(db, reg.email, "very-secret-1")).ok).toBe(true);
    expect((await db.customer.findUniqueOrThrow({ where: { email: "petra@example.com" } })).firstName).toBe("Petra");
  });

  it("turns a guest customer into an account only after verification", async () => {
    await db.customer.create({ data: { email: "guest@example.com", firstName: "G", lastName: "Uest" } });
    const r = await registerCustomer(db, { ...reg, email: "guest@example.com" });
    expect(r.status).toBe("VERIFY");
    expect((await authenticateCustomer(db, "guest@example.com", reg.password)).ok).toBe(false);
  });

  it("resets the password with a token and signs out sessions", async () => {
    const reset = await requestPasswordReset(db, "petra@example.com");
    expect(reset).not.toBeNull();
    await db.customerSession.create({ data: { id: "s-hash", customerId: reset!.customerId, expiresAt: new Date(Date.now() + 1e6) } });
    expect(await resetPassword(db, reset!.token, "brand-new-pass-2")).toBe(reset!.customerId);
    expect((await authenticateCustomer(db, "petra@example.com", "brand-new-pass-2")).ok).toBe(true);
    expect(await db.customerSession.count({ where: { customerId: reset!.customerId } })).toBe(0);
    expect(await requestPasswordReset(db, "guest@example.com")).toBeNull(); // unverified
    expect(await requestPasswordReset(db, "nobody@example.com")).toBeNull();
  });
});
