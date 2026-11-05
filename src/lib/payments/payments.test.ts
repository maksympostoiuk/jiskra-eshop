import { createHmac } from "node:crypto";
import { afterEach, describe, expect, it } from "vitest";
import { availablePaymentMethods, getPaymentProvider } from "./index";
import { verifyStripeSignature } from "./stripe";

const order = { id: "o1", number: "202600042", accessToken: "x", total: 129900, currency: "CZK" as const, email: "a@b.cz", locale: "cs" };
const ctx = { bank: { account: "123/0100", iban: "CZ00" }, returnUrl: "http://x/ok", cancelUrl: "http://x/cancel" };

describe("payment providers", () => {
  afterEach(() => {
    delete process.env.STRIPE_SECRET_KEY;
  });
  it("offers bank transfer and COD without keys, Stripe only with a key", () => {
    expect(availablePaymentMethods()).toEqual(["bank_transfer", "cod"]);
    expect(getPaymentProvider("stripe")).toBeUndefined();
    process.env.STRIPE_SECRET_KEY = "sk_test_x";
    expect(availablePaymentMethods()).toEqual(["bank_transfer", "cod", "stripe"]);
  });
  it("bank transfer returns instructions with the order number as variable symbol", async () => {
    const init = await getPaymentProvider("bank_transfer")!.initiate(order, ctx);
    expect(init).toMatchObject({ status: "PENDING", reference: "202600042", bankTransfer: { account: "123/0100", variableSymbol: "202600042", amount: 129900 } });
  });
  it("cash on delivery respects the shipping method", () => {
    const cod = getPaymentProvider("cod")!;
    expect(cod.supportsShipping({ allowsCod: true })).toBe(true);
    expect(cod.supportsShipping({ allowsCod: false })).toBe(false);
  });
});

describe("stripe webhook signature", () => {
  const secret = "whsec_test";
  const payload = '{"type":"checkout.session.completed"}';
  const now = 1_800_000_000_000;
  const sign = (ts: number) => `t=${ts},v1=${createHmac("sha256", secret).update(`${ts}.${payload}`).digest("hex")}`;
  it("accepts a valid recent signature", () => {
    expect(verifyStripeSignature(payload, sign(now / 1000), secret, 300, now)).toBe(true);
  });
  it("rejects tampering, wrong secret, old events and missing headers", () => {
    expect(verifyStripeSignature(payload + " ", sign(now / 1000), secret, 300, now)).toBe(false);
    expect(verifyStripeSignature(payload, sign(now / 1000), "other", 300, now)).toBe(false);
    expect(verifyStripeSignature(payload, sign(now / 1000 - 3600), secret, 300, now)).toBe(false);
    expect(verifyStripeSignature(payload, null, secret)).toBe(false);
  });
});
