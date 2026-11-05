import type { ReactNode } from "react";
import { AdminShell } from "@/components/admin/admin-shell";
import { requireAdmin } from "@/lib/auth/session";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function PanelLayout({ children }: { children: ReactNode }) {
  const admin = await requireAdmin();
  const pendingReviews = await prisma.review.count({ where: { status: "PENDING" } });
  return (
    <AdminShell admin={{ name: admin.name, email: admin.email, role: admin.role }} pendingReviews={pendingReviews}>
      {children}
    </AdminShell>
  );
}
