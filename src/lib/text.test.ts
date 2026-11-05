import { describe, expect, it } from "vitest";
import { buildSearchText, normalizeText, slugify, truncate } from "./text";

describe("text helpers", () => {
  it("normalizes diacritics and case", () => {
    expect(normalizeText("  Chytré   HODINKY ")).toBe("chytre hodinky");
  });
  it("slugifies", () => {
    expect(slugify("Nordvik Aurora 8 Pro (256 GB)")).toBe("nordvik-aurora-8-pro-256-gb");
    expect(slugify("Příslušenství & kabely")).toBe("prislusenstvi-kabely");
  });
  it("builds search text", () => {
    expect(buildSearchText(["Sluchátka", null, "SKU-1"])).toBe("sluchatka sku-1");
  });
  it("truncates", () => {
    expect(truncate("abcdef", 4)).toBe("abc…");
    expect(truncate("abc", 4)).toBe("abc");
  });
});
