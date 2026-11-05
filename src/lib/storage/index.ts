import { LocalDiskStorage } from "./local";
import { S3Storage } from "./s3";
import type { Storage } from "./types";

let instance: Storage | null = null;

/** STORAGE=local (default, public/uploads) | s3 (S3_BUCKET, S3_REGION, optional S3_ENDPOINT and keys). */
export function createStorage(env: Record<string, string | undefined> = process.env): Storage {
  switch (env.STORAGE ?? "local") {
    case "s3":
      if (!env.S3_BUCKET) throw new Error("STORAGE=s3 requires S3_BUCKET");
      return new S3Storage({
        bucket: env.S3_BUCKET,
        region: env.S3_REGION || "auto",
        endpoint: env.S3_ENDPOINT,
        accessKeyId: env.S3_ACCESS_KEY_ID,
        secretAccessKey: env.S3_SECRET_ACCESS_KEY,
        prefix: env.S3_PREFIX,
      });
    case "local":
      return new LocalDiskStorage();
    default:
      throw new Error(`Unknown STORAGE "${env.STORAGE}"`);
  }
}

export function getStorage(): Storage {
  instance ??= createStorage();
  return instance;
}

export * from "./types";
