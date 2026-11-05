import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { randomToken } from "@/lib/random";
import { checkUpload } from "./local";
import { newUploadKey, uploadKey, type Storage, type UploadInput } from "./types";

type Sender = Pick<S3Client, "send">;

export type S3Config = { bucket: string; region: string; endpoint?: string; accessKeyId?: string; secretAccessKey?: string; prefix?: string };

/**
 * S3-compatible storage (AWS S3, Cloudflare R2, MinIO…). Objects are private; the /uploads route streams
 * them, so stored URLs stay site-relative.
 */
export class S3Storage implements Storage {
  private readonly client: Sender;
  constructor(
    private readonly config: S3Config,
    client?: Sender,
  ) {
    this.client =
      client ??
      new S3Client({
        region: config.region,
        endpoint: config.endpoint || undefined,
        forcePathStyle: Boolean(config.endpoint),
        credentials: config.accessKeyId && config.secretAccessKey ? { accessKeyId: config.accessKeyId, secretAccessKey: config.secretAccessKey } : undefined,
      });
  }

  private objectKey(key: string) {
    return `${this.config.prefix ?? "uploads/"}${key}`;
  }

  async save(input: UploadInput) {
    const { ext, contentType } = checkUpload(input);
    const key = newUploadKey(ext, randomToken(12));
    await this.client.send(new PutObjectCommand({ Bucket: this.config.bucket, Key: this.objectKey(key), Body: input.data, ContentType: contentType, CacheControl: "public, max-age=31536000, immutable" }));
    return { url: `/uploads/${key}`, size: input.data.byteLength, contentType };
  }

  async read(key: string) {
    if (!uploadKey(`/uploads/${key}`)) return null;
    try {
      const res = await this.client.send(new GetObjectCommand({ Bucket: this.config.bucket, Key: this.objectKey(key) }));
      return res.Body ? new Uint8Array(await res.Body.transformToByteArray()) : null;
    } catch (error) {
      if (error instanceof Error && (error.name === "NoSuchKey" || error.name === "NotFound")) return null;
      throw error;
    }
  }

  async delete(url: string) {
    const key = uploadKey(url);
    if (key) await this.client.send(new DeleteObjectCommand({ Bucket: this.config.bucket, Key: this.objectKey(key) }));
  }
}
