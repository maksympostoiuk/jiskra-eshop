import { describe, expect, it } from "vitest";
import { formatNumberWithUnit, formatSpecValue } from "./spec-format";

const yn = { yes: "Ano", no: "Ne" };
describe("spec formatting", () => {
  it("formats numbers with locale and unit", () => {
    expect(formatNumberWithUnit(6.4, "″", "cs")).toBe("6,4″");
    expect(formatNumberWithUnit(5000, "mAh", "en")).toBe("5,000 mAh");
    expect(formatNumberWithUnit(12, "", "en")).toBe("12");
  });
  it("formats by type", () => {
    const v = { numberValue: null, boolValue: true, textCs: "Přes uši", textEn: "Over-ear" };
    expect(formatSpecValue(v, { type: "BOOLEAN", unit: "" }, "cs", yn)).toBe("Ano");
    expect(formatSpecValue(v, { type: "TEXT", unit: "" }, "en", yn)).toBe("Over-ear");
    expect(formatSpecValue(v, { type: "NUMBER", unit: "GB" }, "en", yn)).toBeNull();
  });
});
