import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { verifyStripeSignature } from "@/lib/payments/stripe";

/** Stripe webhook: marks orders as paid on `checkout.session.completed`. Requires STRIPE_WEBHOOK_SECRET. */
export async function POST(request: NextRequest) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret || !process.env.STRIPE_SECRET_KEY) return NextResponse.json({ error: "Stripe is not configured" }, { status: 404 });
  const payload = await request.text();
  if (!verifyStripeSignature(payload, request.headers.get("stripe-signature"), secret)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }
  const event = JSON.parse(payload) as { type: string; data: { object: { id: string; payment_status?: string; metadata?: { orderId?: string } } } };
  if (event.type === "checkout.session.completed" && event.data.object.payment_status === "paid") {
    const orderId = event.data.object.metadata?.orderId;
    if (orderId) {
      await prisma.order.updateMany({ where: { id: orderId, paymentMethod: "stripe" }, data: { paymentStatus: "PAID", paymentReference: event.data.object.id } });
    }
  }
  return NextResponse.json({ received: true });
}
