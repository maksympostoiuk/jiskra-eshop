import type { PaymentProvider } from "./types";

/** Bank transfer: order stays PENDING; the order number is the variable symbol. Works without keys. */
export const bankTransferProvider: PaymentProvider = {
  id: "bank_transfer",
  isAvailable: () => true,
  supportsShipping: () => true,
  async initiate(order, { bank }) {
    const variableSymbol = order.number.replace(/\D/g, "").slice(-10);
    return {
      status: "PENDING",
      reference: variableSymbol,
      bankTransfer: { account: bank.account, iban: bank.iban, variableSymbol, amount: order.total, currency: order.currency },
    };
  },
};

/** Cash on delivery: paid to the courier / at pickup. Works without keys. */
export const cashOnDeliveryProvider: PaymentProvider = {
  id: "cod",
  isAvailable: () => true,
  supportsShipping: (shipping) => shipping.allowsCod,
  async initiate() {
    return { status: "PENDING" };
  },
};
