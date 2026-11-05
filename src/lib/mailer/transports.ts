import { appendFile, mkdir } from "node:fs/promises";
import { dirname } from "node:path";
import type { MailMessage, Mailer } from "./types";

/** SMTP via nodemailer. SMTP_URL example: smtps://user:pass@smtp.example.com:465 */
export class SmtpMailer implements Mailer {
  private transport: Promise<{ sendMail: (m: Record<string, unknown>) => Promise<unknown> }> | null = null;
  constructor(
    private readonly url: string,
    private readonly from: string,
  ) {}

  async send(message: MailMessage): Promise<void> {
    this.transport ??= import("nodemailer").then((m) => m.createTransport(this.url));
    await (await this.transport).sendMail({ from: this.from, to: message.to, subject: message.subject, text: message.text, html: message.html });
  }
}

/** Appends each e-mail as one JSON line to a file — handy for end-to-end tests and staging. */
export class FileMailer implements Mailer {
  constructor(
    private readonly path: string,
    private readonly from: string,
  ) {}

  async send(message: MailMessage): Promise<void> {
    await mkdir(dirname(this.path), { recursive: true });
    await appendFile(this.path, `${JSON.stringify({ from: this.from, ...message, sentAt: new Date().toISOString() })}\n`);
  }
}
