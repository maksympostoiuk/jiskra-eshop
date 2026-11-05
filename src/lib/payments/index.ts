import { bankTransferProvider, cashOnDeliveryProvider } from "./offline";
import { stripeProvider } from "./stripe";
import type { PaymentMethodId, PaymentProvider } from "./types";

const PROVIDERS: PaymentProvider[] = [bankTransferProvider, cashOnDeliveryProvider, stripeProvider];

export function getPaymentProvider(id: string): PaymentProvider | undefined {
  return PROVIDERS.find((p) => p.id === id && p.isAvailable());
}

/** Ids of payment methods that can currently be offered. */
export function availablePaymentMethods(): PaymentMethodId[] {
  return PROVIDERS.filter((p) => p.isAvailable()).map((p) => p.id);
}

export * from "./types";
