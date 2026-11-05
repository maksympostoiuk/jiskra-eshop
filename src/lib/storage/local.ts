import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import { dirname, join, normalize, sep } from "node:path";
import { randomToken } from "@/lib/random";
import { sniffImageType } from "./sniff";
import { ALLOWED_IMAGE_TYPES, MAX_UPLOAD_BYTES, newUploadKey, uploadKey, type Storage, type UploadInput } from "./types";

export const UPLOAD_ROOT = join(process.cwd(), "public", "uploads");

/** Validates an upload (size, real type by magic bytes) and returns its extension. Shared by all backends. */
export function checkUpload(input: UploadInput): { ext: string; contentType: string } {
  if (input.data.byteLength > MAX_UPLOAD_BYTES) throw new Error("FILE_TOO_LARGE");
  // Trust the bytes, not the client-declared MIME type.
  const sniffed = sniffImageType(input.data);
  const ext = sniffed ? ALLOWED_IMAGE_TYPES[sniffed] : undefined;
  if (!sniffed || !ext || sniffed !== input.contentType) throw new Error("UNSUPPORTED_TYPE");
  return { ext, contentType: sniffed };
}

/** Dev storage: files in public/uploads/<yyyy>/<mm>/<random>.<ext>. */
export class LocalDiskStorage implements Storage {
  async save(input: UploadInput) {
    const { ext, contentType } = checkUpload(input);
    const key = newUploadKey(ext, randomToken(12));
    const path = resolveUploadPath(key.split("/"))!;
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, input.data);
    return { url: `/uploads/${key}`, size: input.data.byteLength, contentType };
  }

  async read(key: string) {
    const path = resolveUploadPath(key.split("/"));
    if (!path) return null;
    return readFile(path).then((b) => new Uint8Array(b)).catch(() => null);
  }

  async delete(url: string) {
    const key = uploadKey(url);
    const path = key ? resolveUploadPath(key.split("/")) : null;
    if (path) await unlink(path).catch(() => undefined);
  }
}

/** Safe path inside UPLOAD_ROOT, or null for traversal attempts. */
export function resolveUploadPath(segments: string[]): string | null {
  if (segments.some((s) => s === "" || s === "." || s === ".." || s.includes("\\"))) return null;
  const full = normalize(join(UPLOAD_ROOT, ...segments));
  return full.startsWith(UPLOAD_ROOT + sep) ? full : null;
}
