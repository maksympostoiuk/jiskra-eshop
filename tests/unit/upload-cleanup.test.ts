import { afterAll, describe, expect, it, vi } from "vitest";
import { PrismaClient } from "@prisma/client";
import { removeUnreferencedUploads } from "@/lib/storage/cleanup";

const db = new PrismaClient({ datasources: { db: { url: "file:./test.db" } } });
afterAll(() => db.$disconnect());

describe("removeUnreferencedUploads (integration)", () => {
  it("deletes only uploads nobody references", async () => {
    await db.brand.create({ data: { name: "Cleanup", slug: "cleanup-brand", logoUrl: "/uploads/2026/11/kept_logo.png" } });
    const storage = { save: vi.fn(), read: vi.fn(), delete: vi.fn().mockResolvedValue(undefined) };
    const deleted = await removeUnreferencedUploads(db, storage, [
      "/uploads/2026/11/kept_logo.png",
      "/uploads/2026/11/orphan.png",
      "/uploads/2026/11/orphan.png",
      "/ph/phone/1f2125/1.svg",
      "/uploads/../../etc/passwd",
      null,
    ]);
    expect(deleted).toEqual(["/uploads/2026/11/orphan.png"]);
    expect(storage.delete).toHaveBeenCalledTimes(1);
  });
});
