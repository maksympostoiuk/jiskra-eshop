import type { PrismaClient } from "@prisma/client";
import { uploadKey, type Storage } from "./types";

/**
 * Deletes uploaded files (from `candidates`) that no product image, banner or brand logo references any
 * more. Generated placeholders and anything outside /uploads are ignored. Returns the deleted URLs.
 */
export async function removeUnreferencedUploads(db: PrismaClient, storage: Storage, candidates: Array<string | null | undefined>): Promise<string[]> {
  const urls = [...new Set(candidates.filter((u): u is string => !!u && uploadKey(u) !== null))];
  const deleted: string[] = [];
  for (const url of urls) {
    const [images, banners, brands] = await Promise.all([
      db.productImage.count({ where: { url } }),
      db.banner.count({ where: { imageUrl: url } }),
      db.brand.count({ where: { logoUrl: url } }),
    ]);
    if (images + banners + brands === 0) {
      await storage.delete(url);
      deleted.push(url);
    }
  }
  return deleted;
}
