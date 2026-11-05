import { describe, expect, it, vi } from "vitest";
import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { createStorage, newUploadKey, uploadKey } from "./index";
import { resolveUploadPath } from "./local";
import { S3Storage } from "./s3";

const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0, 0, 0, 0, 0]);

describe("upload keys", () => {
  it("accepts generated keys and rejects traversal", () => {
    expect(newUploadKey("png", "abc_DEF-1", new Date("2026-03-04"))).toBe("2026/03/abc_DEF-1.png");
    expect(uploadKey("/uploads/2026/03/abc_DEF-1.png")).toBe("2026/03/abc_DEF-1.png");
    for (const bad of ["/uploads/../secret.png", "/uploads/2026/%2e%2e/x.png", "/uploads/a//b.png", "/uploads/x", "/uploads/.env"]) expect(uploadKey(bad)).toBeNull();
    expect(resolveUploadPath(["..", "etc", "passwd"])).toBeNull();
  });
});

describe("S3 storage (mocked client)", () => {
  it("validates, stores privately under a prefix and reads back", async () => {
    const send = vi.fn().mockResolvedValueOnce({}).mockResolvedValueOnce({ Body: { transformToByteArray: async () => png } }).mockResolvedValueOnce({});
    const storage = new S3Storage({ bucket: "b", region: "auto" }, { send } as never);
    const stored = await storage.save({ filename: "x.png", contentType: "image/png", data: png });
    expect(stored.url).toMatch(/^\/uploads\/\d{4}\/\d{2}\/[\w-]+\.png$/);
    const put = send.mock.calls[0][0] as PutObjectCommand;
    expect(put).toBeInstanceOf(PutObjectCommand);
    expect(put.input).toMatchObject({ Bucket: "b", Key: `uploads/${uploadKey(stored.url)}`, ContentType: "image/png" });
    expect(await storage.read(uploadKey(stored.url)!)).toEqual(png);
    expect(send.mock.calls[1][0]).toBeInstanceOf(GetObjectCommand);
    await storage.delete(stored.url);
    expect(send.mock.calls[2][0]).toBeInstanceOf(DeleteObjectCommand);
  });
  it("rejects spoofed types before calling S3 and returns null for missing objects", async () => {
    const send = vi.fn().mockRejectedValue(Object.assign(new Error("missing"), { name: "NoSuchKey" }));
    const storage = new S3Storage({ bucket: "b", region: "auto" }, { send } as never);
    await expect(storage.save({ filename: "x.png", contentType: "image/png", data: new TextEncoder().encode("<html>not an image at all") })).rejects.toThrow("UNSUPPORTED_TYPE");
    expect(send).not.toHaveBeenCalled();
    expect(await storage.read("2026/01/missing.png")).toBeNull();
  });
  it("is selected by environment", () => {
    expect(createStorage({ STORAGE: "s3", S3_BUCKET: "b" })).toBeInstanceOf(S3Storage);
    expect(() => createStorage({ STORAGE: "s3" })).toThrow("S3_BUCKET");
  });
});
