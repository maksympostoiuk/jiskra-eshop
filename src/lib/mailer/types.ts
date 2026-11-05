export type MailMessage = { to: string; subject: string; text: string; html?: string };

/** E-mail transport abstraction. Dev: console. Add SMTP / API transports behind this interface. */
export interface Mailer {
  send(message: MailMessage): Promise<void>;
}
