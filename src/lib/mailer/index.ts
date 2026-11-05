import { ConsoleMailer } from "./console";
import type { Mailer } from "./types";

let instance: Mailer | null = null;

export function getMailer(): Mailer {
  if (instance) return instance;
  const from = process.env.MAIL_FROM || "Jiskra <obchod@jiskra.local>";
  switch (process.env.MAILER ?? "console") {
    // Add real transports here (SMTP, Postmark, …) — they only need to implement `Mailer`.
    default:
      instance = new ConsoleMailer(from);
  }
  return instance;
}

/** Test hook: replace the mailer (e.g. with an in-memory collector). */
export function setMailer(mailer: Mailer | null) {
  instance = mailer;
}

export type { Mailer, MailMessage } from "./types";
