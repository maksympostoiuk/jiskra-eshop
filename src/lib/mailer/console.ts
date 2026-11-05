import type { MailMessage, Mailer } from "./types";

/** Development mailer: prints e-mails to the server console. */
export class ConsoleMailer implements Mailer {
  constructor(private readonly from: string) {}

  async send(message: MailMessage): Promise<void> {
    const line = "─".repeat(72);
    console.info(`\n${line}\n✉  E-mail (console mailer)\nFrom:    ${this.from}\nTo:      ${message.to}\nSubject: ${message.subject}\n${line}\n${message.text}\n${line}\n`);
  }
}
