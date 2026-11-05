import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/admin/page-header";
import { AdminUserEditor } from "@/components/admin/system-editors";
import { requireAdmin } from "@/lib/auth/session";

export default async function NewUserPage() {
  await requireAdmin({ role: "ADMIN" });
  const t = await getTranslations("admin.users");
  return (
    <>
      <PageHeader title={t("new")} back={{ href: "/admin/users", label: t("title") }} />
      <AdminUserEditor userId={null} initial={{ email: "", name: "", role: "EDITOR", isActive: true, password: "" }} />
    </>
  );
}
