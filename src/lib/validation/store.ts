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
