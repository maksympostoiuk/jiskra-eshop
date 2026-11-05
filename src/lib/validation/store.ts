import * as z from "zod";
import { email, optionalText, required } from "./common";

export const reviewSchema = z.object({
  productId: z.string().min(1).max(64),
  authorName: required(60),
  authorEmail: z.union([z.literal(""), email]),
  rating: z.number({ error: "v.rating" }).int({ error: "v.rating" }).min(1, { error: "v.rating" }).max(5, { error: "v.rating" }),
  text: z.string().trim().min(10, { error: "v.reviewLength" }).max(2000),
  /** honeypot: must stay empty */
  website: optionalText(200).refine((v) => v.length === 0, { error: "v.required" }),
});
export type ReviewInput = z.infer<typeof reviewSchema>;

export const COUNTRIES = ["CZ", "SK", "DE", "AT", "PL"] as const;

export const checkoutContactSchema = z.object({
  email,
  phone: z.string().trim().max(30).regex(/^\+?[\d\s()-]{6,}$/, { error: "v.phone" }),
  firstName: required(60),
  lastName: required(60),
  company: optionalText(100),
  street: required(120),
  city: required(80),
  zip: z.string().trim().regex(/^[A-Za-z0-9][A-Za-z0-9 -]{2,9}$/, { error: "v.zip" }),
  country: z.enum(COUNTRIES),
  note: optionalText(500),
});

export const checkoutSchema = checkoutContactSchema.extend({
  shippingMethodId: z.string().min(1, { error: "v.required" }).max(64),
  paymentMethod: z.string().min(1, { error: "v.required" }).max(32),
  consent: z.literal(true, { error: "v.consent" }),
  /** total shown to the customer (minor units); must match server-side pricing */
  expectedTotal: z.number().int().min(0),
  lines: z
    .array(z.object({ variantId: z.string().min(1).max(64), qty: z.number().int().min(1).max(99) }))
    .min(1)
    .max(50),
});
export type CheckoutInput = z.infer<typeof checkoutSchema>;

const password = z.string().min(10, { error: "v.passwordLength" }).max(200);

export const registerSchema = z.object({
  firstName: required(60),
  lastName: required(60),
  email,
  password,
});
export const customerLoginSchema = z.object({ email, password: z.string().min(1, { error: "v.required" }).max(200) });
export const forgotPasswordSchema = z.object({ email });
export const resetPasswordSchema = z.object({ token: z.string().min(1).max(200), password });
export const profileSchema = z.object({
  firstName: required(60),
  lastName: required(60),
  phone: z.union([z.literal(""), z.string().trim().max(30).regex(/^\+?[\d\s()-]{6,}$/, { error: "v.phone" })]),
});
