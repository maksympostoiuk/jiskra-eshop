import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { sessionSettlesOrder, toSessionInfo, verifyStripeSignature } from "@/lib/payments/stripe";

/** Stripe webhook: marks orders as paid on `checkout.session.completed`. Requires STRIPE_WEBHOOK_SECRET. */
export async function POST(request: NextRequest) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret || !process.env.STRIPE_SECRET_KEY) return NextResponse.json({ error: "Stripe is not configured" }, { status: 404 });
  const payload = await request.text();
  if (!verifyStripeSignature(payload, request.headers.get("stripe-signature"), secret)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }
  let event: { type: string; data: { object: { id: string; payment_status?: string; amount_total?: number; currency?: string; metadata?: { orderId?: string } } } };
  try {
    event = JSON.parse(payload);
  } catch {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }
  if (event.type === "checkout.session.completed" || event.type === "checkout.session.async_payment_succeeded") {
    const session = toSessionInfo(event.data.object);
    const order = session.orderId ? await prisma.order.findUnique({ where: { id: session.orderId } }) : null;
    if (order && order.paymentMethod === "stripe" && sessionSettlesOrder(session, order)) {
      await prisma.order.update({ where: { id: order.id }, data: { paymentStatus: "PAID", paymentReference: event.data.object.id } });
    } else if (order) {
      console.warn(`Stripe session ${event.data.object.id} does not settle order ${order.number}`);
    }
  }
  return NextResponse.json({ received: true });
}
