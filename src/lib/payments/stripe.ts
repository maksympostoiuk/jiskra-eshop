import { createHmac, timingSafeEqual } from "node:crypto";
import type { PaymentProvider } from "./types";

const API = "https://api.stripe.com/v1";

function secretKey(): string | undefined {
  return process.env.STRIPE_SECRET_KEY || undefined;
}

/**
 * Stripe Checkout (hosted page) via the REST API — no SDK dependency.
 * Only offered when STRIPE_SECRET_KEY is set; intended for test-mode keys in this project.
 */
export const stripeProvider: PaymentProvider = {
  id: "stripe",
  isAvailable: () => Boolean(secretKey()),
  supportsShipping: () => true,
  async initiate(order, { returnUrl, cancelUrl }) {
    const key = secretKey();
    if (!key) throw new Error("Stripe is not configured");
    const body = new URLSearchParams({
      mode: "payment",
      success_url: returnUrl,
      cancel_url: cancelUrl,
      client_reference_id: order.id,
      customer_email: order.email,
      locale: order.locale === "cs" ? "cs" : "en",
      "metadata[orderId]": order.id,
      "line_items[0][quantity]": "1",
      "line_items[0][price_data][currency]": order.currency.toLowerCase(),
      "line_items[0][price_data][unit_amount]": String(order.total),
      "line_items[0][price_data][product_data][name]": `Order ${order.number}`,
    });
    const res = await fetch(`${API}/checkout/sessions`, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });
    if (!res.ok) throw new Error(`Stripe error ${res.status}`);
    const session = (await res.json()) as { id: string; url: string };
    return { status: "PENDING", reference: session.id, redirectUrl: session.url };
  },
};

/** Fetch a Checkout Session to confirm payment on the return page. */
export async function retrieveStripeSession(sessionId: string): Promise<{ paid: boolean; orderId: string | null } | null> {
  const key = secretKey();
  if (!key || !/^cs_[A-Za-z0-9_]+$/.test(sessionId)) return null;
  const res = await fetch(`${API}/checkout/sessions/${sessionId}`, { headers: { Authorization: `Bearer ${key}` } });
  if (!res.ok) return null;
  const s = (await res.json()) as { payment_status: string; metadata?: { orderId?: string } };
  return { paid: s.payment_status === "paid", orderId: s.metadata?.orderId ?? null };
}

/**
 * Verify a Stripe webhook signature header (`t=…,v1=…`) with STRIPE_WEBHOOK_SECRET.
 * Rejects events older than `toleranceSec`.
 */
export function verifyStripeSignature(payload: string, header: string | null, secret: string, toleranceSec = 300, now = Date.now()): boolean {
  if (!header) return false;
  const parts = Object.fromEntries(header.split(",").map((p) => p.split("=") as [string, string]));
  const timestamp = Number(parts.t);
  const signature = parts.v1;
  if (!timestamp || !signature) return false;
  if (Math.abs(now / 1000 - timestamp) > toleranceSec) return false;
  const expected = createHmac("sha256", secret).update(`${timestamp}.${payload}`).digest("hex");
  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  return a.length === b.length && timingSafeEqual(a, b);
}
