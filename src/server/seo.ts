import "server-only";
import type { Metadata } from "next";
import { LOCALES } from "@/i18n/routing";
import { siteUrl } from "@/lib/site";

/** canonical + hreflang alternates. `paths` maps locale → locale-less path ("/product/x"). */
export function alternates(locale: string, paths: Partial<Record<string, string>> | string): Metadata["alternates"] {
  const pathFor = (l: string) => (typeof paths === "string" ? paths : (paths[l] ?? paths.cs ?? "/"));
  const url = (l: string) => `${siteUrl()}/${l}${pathFor(l) === "/" ? "" : pathFor(l)}`;
  return {
    canonical: url(locale),
    languages: { ...Object.fromEntries(LOCALES.map((l) => [l, url(l)])), "x-default": url("cs") },
  };
}
