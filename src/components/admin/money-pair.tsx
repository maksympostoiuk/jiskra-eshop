"use client";

import { useTranslations } from "next-intl";
import { Wand2 } from "lucide-react";
import { Input } from "@/components/ui/form";
import { convertCzkToUsd, parseMajorToMinor, minorToMajorString, type UsdRoundingMode } from "@/lib/money";

export type RateConfig = { usdRate: number; usdRounding: UsdRoundingMode };

/** Fill a USD major-unit string from a CZK major-unit string using the shop exchange rate. */
export function usdFromCzk(czk: string, rate: RateConfig): string | null {
  const minor = parseMajorToMinor(czk);
  if (minor === null) return null;
  return minorToMajorString(convertCzkToUsd(minor, rate.usdRate, rate.usdRounding));
}

/** CZK + USD inputs (major units as strings) with a "fill USD from CZK" button. */
export function MoneyPair({
  idPrefix,
  czk,
  usd,
  onChange,
  rate,
  errors,
  label,
  required,
}: {
  idPrefix: string;
  czk: string;
  usd: string;
  onChange: (next: { czk: string; usd: string }) => void;
  rate: RateConfig;
  errors?: { czk?: string; usd?: string };
  label?: string;
  required?: boolean;
}) {
  const t = useTranslations("admin.common");
  const fill = () => {
    const value = usdFromCzk(czk, rate);
    if (value !== null) onChange({ czk, usd: value });
  };
  return (
    <fieldset className="min-w-0">
      {label && (
        <legend className="mb-1 text-xs font-medium text-ink-soft">
          {label}
          {required && <span className="text-danger"> *</span>}
        </legend>
      )}
      <div className="flex items-start gap-1.5">
        <div className="min-w-0 flex-1">
          <div className="relative">
            <Input
              id={`${idPrefix}-czk`}
              inputMode="decimal"
              value={czk}
              aria-label={`${label ?? ""} CZK`}
              aria-invalid={errors?.czk ? true : undefined}
              onChange={(e) => onChange({ czk: e.target.value, usd })}
              className="pr-10"
            />
            <span className="pointer-events-none absolute top-1/2 right-2.5 -translate-y-1/2 text-xs text-ink-faint">Kč</span>
          </div>
          {errors?.czk && <p className="mt-1 text-xs text-danger">{errors.czk}</p>}
        </div>
        <button
          type="button"
          onClick={fill}
          title={t("fillUsd")}
          aria-label={t("fillUsd")}
          className="mt-1 grid size-8 shrink-0 place-items-center rounded-full text-brand hover:bg-brand-soft"
        >
          <Wand2 className="size-4" aria-hidden="true" />
        </button>
        <div className="min-w-0 flex-1">
          <div className="relative">
            <Input
              id={`${idPrefix}-usd`}
              inputMode="decimal"
              value={usd}
              aria-label={`${label ?? ""} USD`}
              aria-invalid={errors?.usd ? true : undefined}
              onChange={(e) => onChange({ czk, usd: e.target.value })}
              className="pr-8"
            />
            <span className="pointer-events-none absolute top-1/2 right-2.5 -translate-y-1/2 text-xs text-ink-faint">$</span>
          </div>
          {errors?.usd && <p className="mt-1 text-xs text-danger">{errors.usd}</p>}
        </div>
      </div>
    </fieldset>
  );
}
