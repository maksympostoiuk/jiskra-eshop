import Link from "next/link";
import { getFormatter, getTranslations } from "next-intl/server";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { ConfirmButton } from "@/components/admin/confirm-button";
import { PageHeader } from "@/components/admin/page-header";
import { StatusPill } from "@/components/admin/status-pills";
import { Table, Td, Th, Tr } from "@/components/admin/table";
import { buttonClasses } from "@/components/ui/button";
import { requireAdmin } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { deleteAdminUser } from "@/server/admin/system";

export default async function UsersPage() {
  const me = await requireAdmin({ role: "ADMIN" });
  const t = await getTranslations("admin.users");
  const tc = await getTranslations("admin.common");
  const format = await getFormatter();
  const users = await prisma.adminUser.findMany({ orderBy: [{ role: "asc" }, { name: "asc" }] });
  return (
    <>
      <PageHeader title={t("title")} description={t("subtitle")} actions={<Link href="/admin/users/new" className={buttonClasses("primary")}><Plus className="size-4" aria-hidden="true" />{t("new")}</Link>} />
      <Table>
        <thead>
          <tr>
            <Th>{t("name")}</Th>
            <Th>{t("email")}</Th>
            <Th>{t("role")}</Th>
            <Th>{t("state")}</Th>
            <Th>{t("lastLogin")}</Th>
            <Th className="text-right">{tc("actions")}</Th>
          </tr>
        </thead>
        <tbody>
          {users.map((u) => (
            <Tr key={u.id}>
              <Td>
                <Link href={`/admin/users/${u.id}`} className="font-medium hover:underline">{u.name}</Link>
                {u.id === me.id && <span className="ml-2 text-xs text-ink-faint">({t("you")})</span>}
              </Td>
              <Td className="text-ink-soft">{u.email}</Td>
              <Td>{t(`roles.${u.role === "ADMIN" ? "ADMIN" : "EDITOR"}`)}</Td>
              <Td><StatusPill status={u.isActive ? "ACTIVE" : "INACTIVE"} label={u.isActive ? tc("active") : tc("inactive")} /></Td>
              <Td className="text-ink-soft">{u.lastLoginAt ? format.dateTime(u.lastLoginAt, { dateStyle: "short", timeStyle: "short" }) : "—"}</Td>
              <Td>
                <div className="flex justify-end gap-1">
                  <Link href={`/admin/users/${u.id}`} className={buttonClasses("ghost", "sm")} aria-label={`${tc("edit")}: ${u.name}`}><Pencil className="size-4" aria-hidden="true" /></Link>
                  {u.id !== me.id && (
                    <ConfirmButton action={deleteAdminUser.bind(null, u.id)} title={t("deleteTitle")} description={t("deleteText", { name: u.name })} ariaLabel={`${tc("delete")}: ${u.name}`} className="text-danger">
                      <Trash2 className="size-4" aria-hidden="true" />
                    </ConfirmButton>
                  )}
                </div>
              </Td>
            </Tr>
          ))}
        </tbody>
      </Table>
    </>
  );
}
