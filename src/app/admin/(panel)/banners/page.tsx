import Link from "next/link";
import { getFormatter, getLocale, getTranslations } from "next-intl/server";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { ConfirmButton } from "@/components/admin/confirm-button";
import { PageHeader } from "@/components/admin/page-header";
import { StatusPill } from "@/components/admin/status-pills";
import { EmptyRow, FilterBar, Table, Td, Th, Tr } from "@/components/admin/table";
import { buttonClasses } from "@/components/ui/button";
import { Select } from "@/components/ui/form";
import { prisma } from "@/lib/db";
import { BANNER_PLACEMENTS, isOneOf } from "@/lib/domain";
import { pickTranslation } from "@/lib/i18n-content";
import { deleteBanner } from "@/server/admin/merch";

export default async function BannersPage({ searchParams }: { searchParams: Promise<{ placement?: string }> }) {
  const { placement } = await searchParams;
  const t = await getTranslations("admin.banners");
  const tc = await getTranslations("admin.common");
  const locale = await getLocale();
  const format = await getFormatter();
  const banners = await prisma.banner.findMany({
    where: isOneOf(BANNER_PLACEMENTS, placement) ? { placement } : {},
    orderBy: [{ placement: "asc" }, { sortOrder: "asc" }],
    include: { translations: true },
  });
  const now = new Date();
  return (
    <>
      <PageHeader title={t("title")} description={t("subtitle")} actions={<Link href="/admin/banners/new" className={buttonClasses("primary")}><Plus className="size-4" aria-hidden="true" />{t("new")}</Link>} />
      <FilterBar action="/admin/banners">
        <label className="flex flex-col gap-1 text-xs font-medium text-ink-soft">
          {t("placement")}
          <Select name="placement" defaultValue={placement ?? ""}>
            <option value="">{tc("all")}</option>
            {BANNER_PLACEMENTS.map((p) => (
              <option key={p} value={p}>{t(`placements.${p}`)}</option>
            ))}
          </Select>
        </label>
        <button type="submit" className={buttonClasses("outline")}>{tc("filter")}</button>
      </FilterBar>
      <Table>
        <thead>
          <tr>
            <Th className="w-20"><span className="sr-only">{t("image")}</span></Th>
            <Th>{t("titleField")}</Th>
            <Th>{t("placement")}</Th>
            <Th>{t("schedule")}</Th>
            <Th>{t("state")}</Th>
            <Th className="text-right">{tc("actions")}</Th>
          </tr>
        </thead>
        <tbody>
          {banners.map((b) => {
            const tr = pickTranslation(b.translations, locale);
            const live = b.isActive && (!b.startsAt || b.startsAt <= now) && (!b.endsAt || b.endsAt > now);
            return (
              <Tr key={b.id}>
                <Td>
                  <div className="grid h-12 w-16 place-items-center overflow-hidden rounded-md" style={{ background: b.bgColor }}>
                    {/* eslint-disable-next-line @next/next/no-img-element -- admin thumbnail */}
                    {b.imageUrl && <img src={b.imageUrl} alt="" className="h-full object-contain" />}
                  </div>
                </Td>
                <Td>
                  <Link href={`/admin/banners/${b.id}`} className="font-medium hover:underline">{tr?.title}</Link>
                  <div className="text-xs text-ink-faint">{tr?.linkUrl}</div>
                </Td>
                <Td>{isOneOf(BANNER_PLACEMENTS, b.placement) ? t(`placements.${b.placement}`) : b.placement}</Td>
                <Td className="text-xs text-ink-soft">
                  {b.startsAt || b.endsAt
                    ? `${b.startsAt ? format.dateTime(b.startsAt, { dateStyle: "short" }) : "…"} – ${b.endsAt ? format.dateTime(b.endsAt, { dateStyle: "short" }) : "…"}`
                    : t("always")}
                </Td>
                <Td><StatusPill status={live ? "ACTIVE" : "INACTIVE"} label={live ? t("live") : t("notLive")} /></Td>
                <Td>
                  <div className="flex justify-end gap-1">
                    <Link href={`/admin/banners/${b.id}`} className={buttonClasses("ghost", "sm")} aria-label={`${tc("edit")}: ${tr?.title}`}><Pencil className="size-4" aria-hidden="true" /></Link>
                    <ConfirmButton action={deleteBanner.bind(null, b.id)} title={t("deleteTitle")} description={t("deleteText", { name: tr?.title ?? "" })} ariaLabel={`${tc("delete")}: ${tr?.title}`} className="text-danger">
                      <Trash2 className="size-4" aria-hidden="true" />
                    </ConfirmButton>
                  </div>
                </Td>
              </Tr>
            );
          })}
          {banners.length === 0 && <EmptyRow colSpan={6}>{tc("empty")}</EmptyRow>}
        </tbody>
      </Table>
    </>
  );
}
