export type StoredFile = { url: string; size: number; contentType: string };

export type UploadInput = { filename: string; contentType: string; data: Uint8Array };

/**
 * File storage abstraction. Files are always addressed by site-relative URLs ("/uploads/<key>") and served
 * by the /uploads route, so CMS image paths stay portable whichever backend stores the bytes.
 */
export interface Storage {
  save(input: UploadInput): Promise<StoredFile>;
  /** bytes for a key ("2026/11/abc.webp"), or null when missing */
  read(key: string): Promise<Uint8Array | null>;
  delete(url: string): Promise<void>;
}

export const ALLOWED_IMAGE_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/avif": "avif",
  "image/gif": "gif",
};
export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

/** "/uploads/2026/11/a.png" → "2026/11/a.png"; null for anything that is not a safe upload key. */
export function uploadKey(url: string): string | null {
  const key = url.replace(/^\/uploads\//, "");
  return /^[A-Za-z0-9_-]+(\/[A-Za-z0-9_-]+)*\.[a-z0-9]{2,5}$/.test(key) ? key : null;
}

/** New object key: "<yyyy>/<mm>/<random>.<ext>". */
export function newUploadKey(ext: string, random: string, now = new Date()): string {
  return `${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, "0")}/${random}.${ext}`;
}
