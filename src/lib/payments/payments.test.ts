import { createHmac } from "node:crypto";
import { afterEach, describe, expect, it, vi } from "vitest";
import { availablePaymentMethods, getPaymentProvider } from "./index";
import { retrieveStripeSession, sessionSettlesOrder, stripeProvider, verifyStripeSignature } from "./stripe";

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

describe("stripe provider (mocked API)", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.STRIPE_SECRET_KEY;
  });

  it("creates a hosted checkout session for the order total", async () => {
    process.env.STRIPE_SECRET_KEY = "sk_test_x";
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ id: "cs_test_1", url: "https://checkout.stripe.com/c/cs_test_1" })));
    vi.stubGlobal("fetch", fetchMock);
    const init = await stripeProvider.initiate(order, ctx);
    expect(init).toEqual({ status: "PENDING", reference: "cs_test_1", redirectUrl: "https://checkout.stripe.com/c/cs_test_1" });
    const [url, req] = fetchMock.mock.calls[0];
    expect(url).toBe("https://api.stripe.com/v1/checkout/sessions");
    const body = new URLSearchParams(String(req.body));
    expect(body.get("line_items[0][price_data][unit_amount]")).toBe("129900");
    expect(body.get("line_items[0][price_data][currency]")).toBe("czk");
    expect(body.get("metadata[orderId]")).toBe("o1");
    expect(req.headers.Authorization).toBe("Bearer sk_test_x");
  });

  it("throws on API errors so checkout can fall back to the confirmation page", async () => {
    process.env.STRIPE_SECRET_KEY = "sk_test_x";
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("{}", { status: 401 })));
    await expect(stripeProvider.initiate(order, ctx)).rejects.toThrow("Stripe error 401");
  });

  it("only settles the order when amount, currency and order id match", async () => {
    process.env.STRIPE_SECRET_KEY = "sk_test_x";
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ payment_status: "paid", amount_total: 129900, currency: "czk", metadata: { orderId: "o1" } }))));
    const session = await retrieveStripeSession("cs_test_1");
    expect(session).toEqual({ paid: true, orderId: "o1", amountTotal: 129900, currency: "CZK" });
    expect(sessionSettlesOrder(session!, { id: "o1", total: 129900, currency: "CZK" })).toBe(true);
    expect(sessionSettlesOrder(session!, { id: "o1", total: 129901, currency: "CZK" })).toBe(false);
    expect(sessionSettlesOrder(session!, { id: "o1", total: 129900, currency: "USD" })).toBe(false);
    expect(sessionSettlesOrder(session!, { id: "o2", total: 129900, currency: "CZK" })).toBe(false);
    expect(await retrieveStripeSession("../../admin")).toBeNull();
  });
});
