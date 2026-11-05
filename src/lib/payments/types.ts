import type { Currency } from "@/lib/money";

export const PAYMENT_METHOD_IDS = ["bank_transfer", "cod", "stripe"] as const;
export type PaymentMethodId = (typeof PAYMENT_METHOD_IDS)[number];

export type PaymentOrder = {
  id: string;
  number: string;
  accessToken: string;
  total: number;
  currency: Currency;
  email: string;
  locale: string;
};

export type BankDetails = { account: string; iban: string };

export type PaymentInit = {
  /** payment status right after order creation */
  status: "PENDING" | "PAID";
  /** provider reference (e.g. Stripe session id, variable symbol) */
  reference?: string;
  /** where to send the customer to pay (hosted checkout) */
  redirectUrl?: string;
  /** bank-transfer instructions to show on the confirmation page / e-mail */
  bankTransfer?: { account: string; iban: string; variableSymbol: string; amount: number; currency: Currency };
};

/** A way to pay. Implementations must not trust client data — they receive the server-side order. */
export interface PaymentProvider {
  readonly id: PaymentMethodId;
  /** whether the provider can be offered (e.g. keys configured) */
  isAvailable(): boolean;
  /** whether the provider works with this shipping method (cash on delivery needs a carrier that collects) */
  supportsShipping(shipping: { allowsCod: boolean }): boolean;
  initiate(order: PaymentOrder, ctx: { bank: BankDetails; returnUrl: string; cancelUrl: string }): Promise<PaymentInit>;
}
