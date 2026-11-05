import { ConsoleMailer } from "./console";
import { FileMailer, SmtpMailer } from "./transports";
import type { Mailer } from "./types";

let instance: Mailer | null = null;

/** MAILER=console (default) | smtp (needs SMTP_URL) | file (needs MAIL_OUTBOX). */
export function createMailer(env: Record<string, string | undefined> = process.env): Mailer {
  const from = env.MAIL_FROM || "Jiskra <obchod@jiskra.local>";
  switch (env.MAILER ?? "console") {
    case "smtp":
      if (!env.SMTP_URL) throw new Error("MAILER=smtp requires SMTP_URL");
      return new SmtpMailer(env.SMTP_URL, from);
    case "file":
      return new FileMailer(env.MAIL_OUTBOX || "tmp/mail-outbox.jsonl", from);
    case "console":
      return new ConsoleMailer(from);
    default:
      throw new Error(`Unknown MAILER "${env.MAILER}"`);
  }
}

export function getMailer(): Mailer {
  instance ??= createMailer();
  return instance;
}

/** Test hook: replace the mailer (e.g. with an in-memory collector). */
export function setMailer(mailer: Mailer | null) {
  instance = mailer;
}

export type { Mailer, MailMessage } from "./types";
