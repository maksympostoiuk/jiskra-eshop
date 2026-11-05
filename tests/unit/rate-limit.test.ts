import { afterAll, describe, expect, it } from "vitest";
import { PrismaClient } from "@prisma/client";
import { rateLimit, resetRateLimit } from "@/lib/auth/rate-limit";

const db = new PrismaClient({ datasources: { db: { url: "file:./test.db" } } });
afterAll(() => db.$disconnect());

describe("database rate limiter", () => {
  const t0 = new Date("2026-11-05T10:00:00Z");
  const at = (ms: number) => new Date(t0.getTime() + ms);

  it("allows `limit` attempts per window and reports the wait", async () => {
    for (let i = 0; i < 3; i++) expect((await rateLimit("rl:a", 3, 60_000, db, at(i * 1000))).ok).toBe(true);
    expect(await rateLimit("rl:a", 3, 60_000, db, at(10_000))).toEqual({ ok: false, retryAfterMs: 50_000 });
  });
  it("starts a new window after it expires", async () => {
    expect((await rateLimit("rl:a", 3, 60_000, db, at(61_000))).ok).toBe(true);
  });
  it("keeps keys independent and can be reset (shared across clients of the same DB)", async () => {
    const other = new PrismaClient({ datasources: { db: { url: "file:./test.db" } } });
    for (let i = 0; i < 2; i++) await rateLimit("rl:b", 2, 60_000, db, t0);
    expect((await rateLimit("rl:b", 2, 60_000, other, t0)).ok).toBe(false);
    expect((await rateLimit("rl:c", 2, 60_000, other, t0)).ok).toBe(true);
    await resetRateLimit("rl:b", db);
    expect((await rateLimit("rl:b", 2, 60_000, other, t0)).ok).toBe(true);
    await other.$disconnect();
  });
});
