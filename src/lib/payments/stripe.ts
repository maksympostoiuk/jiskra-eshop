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

export type StripeSessionInfo = { paid: boolean; orderId: string | null; amountTotal: number | null; currency: string | null };

type RawSession = { payment_status?: string; amount_total?: number | null; currency?: string | null; metadata?: { orderId?: string } };

export function toSessionInfo(s: RawSession): StripeSessionInfo {
  return {
    paid: s.payment_status === "paid",
    orderId: s.metadata?.orderId ?? null,
    amountTotal: typeof s.amount_total === "number" ? s.amount_total : null,
    currency: s.currency ? s.currency.toUpperCase() : null,
  };
}

/** A session settles an order only if it is paid, references that order and charged exactly its total. */
export function sessionSettlesOrder(session: StripeSessionInfo, order: { id: string; total: number; currency: string }): boolean {
  return session.paid && session.orderId === order.id && session.amountTotal === order.total && session.currency === order.currency;
}

/** Fetch a Checkout Session to confirm payment on the return page. */
export async function retrieveStripeSession(sessionId: string): Promise<StripeSessionInfo | null> {
  const key = secretKey();
  if (!key || !/^cs_[A-Za-z0-9_]+$/.test(sessionId)) return null;
  const res = await fetch(`${API}/checkout/sessions/${sessionId}`, { headers: { Authorization: `Bearer ${key}` } });
  if (!res.ok) return null;
  return toSessionInfo((await res.json()) as RawSession);
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
