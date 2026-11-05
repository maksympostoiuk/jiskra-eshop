import { createHash } from "node:crypto";

/** Only hashes of session / e-mail tokens are stored, so a database leak does not expose live tokens. */
export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}
