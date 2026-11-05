import { describe, expect, it } from "vitest";
import { validateWith } from "./i18n";
import { checkoutSchema, reviewSchema } from "./store";

const t = (key: string) => `[${key}]`;
const valid = {
  email: "Jana@Example.com",
  phone: "+420 777 123 456",
  firstName: "Jana",
  lastName: "Nová",
  company: "",
  street: "Dlouhá 1",
  city: "Praha",
  zip: "110 00",
  country: "CZ",
  note: "",
  shippingMethodId: "s1",
  paymentMethod: "cod",
  consent: true,
  lines: [{ variantId: "v1", qty: 2 }],
};

describe("checkout validation", () => {
  it("accepts and normalizes valid input", () => {
    const r = validateWith(checkoutSchema, valid, "cs", t);
    expect(r.success && r.data.email).toBe("jana@example.com");
  });
  it("reports custom messages as translation keys", () => {
    const r = validateWith(checkoutSchema, { ...valid, phone: "abc", zip: "!", consent: false, firstName: " " }, "cs", t);
    expect(r.success).toBe(false);
    if (!r.success) expect(r.errors).toMatchObject({ phone: "[phone]", zip: "[zip]", consent: "[consent]", firstName: "[required]" });
  });
  it("uses Zod's localized messages for built-in checks", () => {
    const cs = validateWith(checkoutSchema, { ...valid, lines: [] }, "cs", t);
    const en = validateWith(checkoutSchema, { ...valid, lines: [] }, "en", t);
    expect(!cs.success && !en.success && cs.errors.lines !== en.errors.lines).toBe(true);
  });
});

describe("review validation", () => {
  it("rejects bots filling the honeypot and too-short texts", () => {
    const r = validateWith(reviewSchema, { productId: "p", authorName: "A", authorEmail: "", rating: 6, text: "short", website: "spam" }, "en", t);
    expect(r.success).toBe(false);
    if (!r.success) expect(Object.keys(r.errors).sort()).toEqual(["rating", "text", "website"]);
  });
});
