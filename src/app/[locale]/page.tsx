import { getTranslations, setRequestLocale } from "next-intl/server";
import { Logo } from "@/components/brand/logo";

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("common");
  return (
    <main className="container-shop grid min-h-dvh place-items-center">
      <div className="text-center">
        <Logo className="text-5xl" />
        <h1 className="mt-6 text-4xl">{t("brand.tagline")}</h1>
        <p className="mt-3 text-ink-soft">{t("home.comingSoon")}</p>
      </div>
    </main>
  );
}
