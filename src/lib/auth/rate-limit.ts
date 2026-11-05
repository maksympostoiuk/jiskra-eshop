import type { PrismaClient } from "@prisma/client";
import { prisma } from "@/lib/db";

export type RateLimitResult = { ok: boolean; retryAfterMs: number };

/**
 * Fixed-window rate limiter stored in the database (`RateLimitBucket`), so the limit holds across
 * server instances and restarts. Each call counts one attempt.
 */
export async function rateLimit(key: string, limit: number, windowMs: number, db: PrismaClient = prisma, now = new Date()): Promise<RateLimitResult> {
  const result = await db.$transaction(async (tx) => {
    const bucket = await tx.rateLimitBucket.findUnique({ where: { key } });
    if (!bucket || bucket.resetAt <= now) {
      const resetAt = new Date(now.getTime() + windowMs);
      await tx.rateLimitBucket.upsert({ where: { key }, create: { key, count: 1, resetAt }, update: { count: 1, resetAt } });
      return { ok: true, retryAfterMs: 0 };
    }
    const updated = await tx.rateLimitBucket.update({ where: { key }, data: { count: { increment: 1 } } });
    return updated.count > limit ? { ok: false, retryAfterMs: bucket.resetAt.getTime() - now.getTime() } : { ok: true, retryAfterMs: 0 };
  });
  // Opportunistic cleanup of long-expired buckets (cheap, indexed by resetAt).
  if (Math.random() < 0.02) await db.rateLimitBucket.deleteMany({ where: { resetAt: { lt: new Date(now.getTime() - 24 * 60 * 60 * 1000) } } });
  return result;
}

export async function resetRateLimit(key: string, db: PrismaClient = prisma): Promise<void> {
  await db.rateLimitBucket.deleteMany({ where: { key } });
}
