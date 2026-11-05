import { mkdir, unlink, writeFile } from "node:fs/promises";
import { join, normalize, sep } from "node:path";
import { randomToken } from "@/lib/random";
import { sniffImageType } from "./sniff";
import { ALLOWED_IMAGE_TYPES, MAX_UPLOAD_BYTES, type Storage, type UploadInput } from "./types";

export const UPLOAD_ROOT = join(process.cwd(), "public", "uploads");

/** Saves files to public/uploads/<yyyy>/<mm>/<random>.<ext> and returns "/uploads/..." URLs. */
export class LocalDiskStorage implements Storage {
  async save(input: UploadInput) {
    // Trust the bytes, not the client-declared MIME type.
    const sniffed = sniffImageType(input.data);
    const ext = sniffed ? ALLOWED_IMAGE_TYPES[sniffed] : undefined;
    if (!sniffed || !ext || sniffed !== input.contentType) throw new Error("UNSUPPORTED_TYPE");
    if (input.data.byteLength > MAX_UPLOAD_BYTES) throw new Error("FILE_TOO_LARGE");
    const now = new Date();
    const dir = join(String(now.getFullYear()), String(now.getMonth() + 1).padStart(2, "0"));
    await mkdir(join(UPLOAD_ROOT, dir), { recursive: true });
    const name = `${randomToken(12)}.${ext}`;
    await writeFile(join(UPLOAD_ROOT, dir, name), input.data);
    return { url: `/uploads/${dir.split(sep).join("/")}/${name}`, size: input.data.byteLength, contentType: sniffed };
  }

  async delete(url: string) {
    const path = resolveUploadPath(url.replace(/^\/uploads\//, "").split("/"));
    if (path) await unlink(path).catch(() => undefined);
  }
}

/** Safe path inside UPLOAD_ROOT, or null for traversal attempts. */
export function resolveUploadPath(segments: string[]): string | null {
  if (segments.some((s) => s === "" || s === "." || s === ".." || s.includes("\\"))) return null;
  const full = normalize(join(UPLOAD_ROOT, ...segments));
  return full.startsWith(UPLOAD_ROOT + sep) ? full : null;
}
