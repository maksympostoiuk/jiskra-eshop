export type StoredFile = { url: string; size: number; contentType: string };

export type UploadInput = { filename: string; contentType: string; data: Uint8Array };

/** File storage abstraction. Dev: local disk (public/uploads). Swap for S3/R2/etc. in production. */
export interface Storage {
  save(input: UploadInput): Promise<StoredFile>;
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
