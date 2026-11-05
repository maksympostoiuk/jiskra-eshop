import { describe, expect, it } from "vitest";
import { formatPercent, formatRating } from "./format";

const nbsp = (s: string) => s.replace(/[  ]/g, " ");
describe("locale formatting", () => {
  it("formats ratings with the locale decimal separator", () => {
    expect(formatRating(4.5, "cs")).toBe("4,5");
    expect(formatRating(4, "en")).toBe("4.0");
  });
  it("formats percentages", () => {
    expect(nbsp(formatPercent(15, "cs"))).toBe("15 %");
    expect(formatPercent(15, "en")).toBe("15%");
  });
});
