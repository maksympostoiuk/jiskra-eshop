import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";

export default async function NotFound() {
  const t = await getTranslations("common.notFound");
  return (
    <div className="container-shop flex flex-col items-center py-24 text-center">
      <p className="font-display text-8xl text-brand">404</p>
      <h1 className="mt-4 text-3xl">{t("title")}</h1>
      <p className="mt-2 max-w-md text-ink-soft">{t("text")}</p>
      <Link href="/" className="mt-6 rounded-full bg-ink px-6 py-3 text-sm font-semibold text-white hover:bg-brand">
        {t("home")}
      </Link>
    </div>
  );
}
