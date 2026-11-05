"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { getTranslations } from "next-intl/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/session";
import { refreshProductAggregates } from "@/lib/catalog/aggregates";
import { canTransition } from "@/lib/orders/status";
import { orderStatusChangeSchema, paymentStatusChangeSchema, reviewModerationSchema } from "@/lib/validation/admin";
import { sendOrderStatusEmail } from "@/server/notifications";
import { validateInput, type ActionResult } from "../action";

export async function changeOrderStatus(input: { orderId: string; toStatus: string; note: string }): Promise<ActionResult> {
  const admin = await requireAdmin();
  const t = await getTranslations("admin.orders");
  const parsed = await validateInput(orderStatusChangeSchema, input);
  if (!parsed.success) return { ok: false, errors: parsed.errors };
  const { orderId, toStatus, note } = parsed.data;

  const order = await prisma.order.findUnique({ where: { id: orderId }, include: { items: true } });
  if (!order) return { ok: false, message: t("notFound") };
  if (!canTransition(order.status, toStatus)) return { ok: false, message: t("invalidTransition") };

  const touchedProducts = new Set<string>();
  try {
    await prisma.$transaction(async (tx) => {
      // Optimistic guard: only transition from the status we validated against.
      const updated = await tx.order.updateMany({ where: { id: orderId, status: order.status }, data: { status: toStatus } });
      if (updated.count !== 1) throw new Error("CONCURRENT_UPDATE");
      if (toStatus === "CANCELLED") {
        for (const item of order.items) {
          if (item.variantId) {
            await tx.productVariant.updateMany({ where: { id: item.variantId }, data: { stock: { increment: item.quantity } } });
          }
          if (item.productId) {
            await tx.product.updateMany({ where: { id: item.productId, soldCount: { gte: item.quantity } }, data: { soldCount: { decrement: item.quantity } } });
            touchedProducts.add(item.productId);
          }
        }
      }
      await tx.orderStatusChange.create({ data: { orderId, fromStatus: order.status, toStatus, note: note || null, changedById: admin.id } });
      for (const productId of touchedProducts) await refreshProductAggregates(tx, productId);
    });
  } catch (error) {
    if (error instanceof Error && error.message === "CONCURRENT_UPDATE") return { ok: false, message: t("concurrentUpdate") };
    throw error;
  }

  after(() => sendOrderStatusEmail(orderId).catch((error) => console.error("Failed to send status e-mail", error)));
  revalidatePath(`/admin/orders/${orderId}`);
  revalidatePath("/admin/orders");
  return { ok: true, message: t("statusChanged") };
}

export async function changePaymentStatus(input: { orderId: string; paymentStatus: string }): Promise<ActionResult> {
  await requireAdmin();
  const parsed = await validateInput(paymentStatusChangeSchema, input);
  if (!parsed.success) return { ok: false, errors: parsed.errors };
  await prisma.order.update({ where: { id: parsed.data.orderId }, data: { paymentStatus: parsed.data.paymentStatus } });
  revalidatePath(`/admin/orders/${parsed.data.orderId}`);
  return { ok: true, message: (await getTranslations("admin.common"))("saved") };
}

export async function moderateReview(reviewId: string, status: "APPROVED" | "REJECTED" | "PENDING"): Promise<ActionResult> {
  const admin = await requireAdmin();
  const parsed = await validateInput(reviewModerationSchema, { reviewId, status });
  if (!parsed.success) return { ok: false };
  const review = await prisma.review.update({
    where: { id: reviewId },
    data: { status, moderatedAt: new Date(), moderatedById: admin.id },
  });
  await refreshProductAggregates(prisma, review.productId);
  revalidatePath("/admin/reviews");
  return { ok: true };
}

export async function deleteReview(reviewId: string): Promise<ActionResult> {
  await requireAdmin();
  const review = await prisma.review.delete({ where: { id: reviewId } }).catch(() => null);
  if (review) await refreshProductAggregates(prisma, review.productId);
  revalidatePath("/admin/reviews");
  return { ok: true };
}
