import { describe, expect, it } from "vitest";
import { defaultVariant, optionState, selectOption } from "./variants";

const v = (id: string, color: string, storage: string, stock = 5) => ({ id, stock, options: { color, storage } });
const variants = [v("b128", "black", "128", 0), v("b256", "black", "256"), v("g128", "green", "128"), v("s512", "sand", "512")];

describe("variant selection", () => {
  it("keeps other options when the combination exists", () => {
    expect(selectOption(variants, variants[1], "storage", "128").id).toBe("b128");
    expect(selectOption(variants, variants[0], "color", "green").id).toBe("g128");
  });
  it("falls back to the closest existing combination", () => {
    expect(selectOption(variants, variants[1], "color", "sand").id).toBe("s512");
  });
  it("reports option states", () => {
    expect(optionState(variants, variants[1], "storage", "256")).toBe("selected");
    expect(optionState(variants, variants[1], "storage", "128")).toBe("soldOut");
    expect(optionState(variants, variants[1], "storage", "512")).toBe("otherCombination");
    expect(optionState(variants, variants[2], "color", "black")).toBe("soldOut");
  });
  it("picks a default in stock", () => {
    expect(defaultVariant(variants)?.id).toBe("b256");
  });
});
