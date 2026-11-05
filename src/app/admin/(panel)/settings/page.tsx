import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/admin/page-header";
import { toShippingRow } from "@/components/admin/shipping-model";
import { SettingsEditor, ShippingMethodsEditor } from "@/components/admin/system-editors";
import { requireAdmin } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { translationsByLocale } from "@/lib/i18n-content";
import { getSettings } from "@/server/settings";

export default async function SettingsPage() {
  await requireAdmin({ role: "ADMIN" });
  const t = await getTranslations("admin.settings");
  const s = await getSettings();
  const methods = await prisma.shippingMethod.findMany({ orderBy: { sortOrder: "asc" }, include: { translations: true } });
  return (
    <>
      <PageHeader title={t("title")} description={t("subtitle")} />
      <SettingsEditor
        initial={{
          usdRate: s.usdRate,
          usdRounding: s.usdRounding,
          shopName: s.shopName,
          contactEmail: s.contactEmail,
          contactPhone: s.contactPhone,
          address: s.address,
          companyId: s.companyId,
          bankAccount: s.bankAccount,
          iban: s.iban,
          lowStockThreshold: s.lowStockThreshold,
        }}
      />
      <ShippingMethodsEditor
        rate={{ usdRate: s.usdRate, usdRounding: s.usdRounding }}
        initial={methods.map((m) =>
          toShippingRow({
            id: m.id,
            code: m.code,
            priceCzk: m.priceCzk,
            priceUsd: m.priceUsd,
            freeFromCzk: m.freeFromCzk,
            freeFromUsd: m.freeFromUsd,
            allowsCod: m.allowsCod,
            isActive: m.isActive,
            sortOrder: m.sortOrder,
            translations: translationsByLocale(m.translations, (tr) => ({ name: tr?.name ?? "", description: tr?.description ?? "" })),
          }),
        )}
      />
    </>
  );
}
