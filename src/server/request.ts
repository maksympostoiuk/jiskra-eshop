import "server-only";
import { headers } from "next/headers";

/**
 * Best-effort client IP for rate limiting. Behind a reverse proxy configure it to set X-Forwarded-For /
 * X-Real-IP; because these headers can be spoofed without a proxy, limits keyed only by IP are always paired
 * with limits keyed by something the attacker cannot rotate (e.g. the e-mail being attacked).
 */
export async function clientIp(): Promise<string> {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip")?.trim() || "unknown";
}
