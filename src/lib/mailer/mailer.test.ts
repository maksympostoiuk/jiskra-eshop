import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { ConsoleMailer } from "./console";
import { createMailer } from "./index";
import { FileMailer, SmtpMailer } from "./transports";

describe("mailer selection", () => {
  it("picks the transport from the environment", () => {
    expect(createMailer({})).toBeInstanceOf(ConsoleMailer);
    expect(createMailer({ MAILER: "smtp", SMTP_URL: "smtp://localhost:2525" })).toBeInstanceOf(SmtpMailer);
    expect(createMailer({ MAILER: "file", MAIL_OUTBOX: "x.jsonl" })).toBeInstanceOf(FileMailer);
    expect(() => createMailer({ MAILER: "smtp" })).toThrow("SMTP_URL");
    expect(() => createMailer({ MAILER: "carrier-pigeon" })).toThrow();
  });
  it("file mailer appends JSON lines", async () => {
    const path = join(mkdtempSync(join(tmpdir(), "mail-")), "outbox.jsonl");
    const mailer = new FileMailer(path, "Shop <a@b.cz>");
    await mailer.send({ to: "x@y.cz", subject: "Hi", text: "One" });
    await mailer.send({ to: "z@y.cz", subject: "Hi 2", text: "Two" });
    const lines = readFileSync(path, "utf8").trim().split("\n").map((l) => JSON.parse(l));
    expect(lines.map((l) => [l.to, l.subject, l.from])).toEqual([
      ["x@y.cz", "Hi", "Shop <a@b.cz>"],
      ["z@y.cz", "Hi 2", "Shop <a@b.cz>"],
    ]);
  });
});
