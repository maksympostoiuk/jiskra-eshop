import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/admin/page-header";
import { AdminUserEditor } from "@/components/admin/system-editors";
import { Alert } from "@/components/ui/alert";
import { requireAdmin } from "@/lib/auth/session";
import { prisma } from "@/lib/db";

export default async function EditUserPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ saved?: string }> }) {
  await requireAdmin({ role: "ADMIN" });
  const { id } = await params;
  const { saved } = await searchParams;
  const t = await getTranslations("admin.users");
  const tc = await getTranslations("admin.common");
  const user = await prisma.adminUser.findUnique({ where: { id } });
  if (!user) notFound();
  return (
    <>
      <PageHeader title={user.name} back={{ href: "/admin/users", label: t("title") }} />
      {saved && <Alert tone="success" className="mb-4">{tc("saved")}</Alert>}
      <AdminUserEditor
        key={user.updatedAt.toISOString()}
        userId={id}
        initial={{ email: user.email, name: user.name, role: user.role === "ADMIN" ? "ADMIN" : "EDITOR", isActive: user.isActive, password: "" }}
      />
    </>
  );
}
